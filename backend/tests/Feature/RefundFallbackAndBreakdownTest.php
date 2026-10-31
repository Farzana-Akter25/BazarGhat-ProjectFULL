<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use App\Services\SslCommerzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use RuntimeException;
use Tests\TestCase;

// The two things the payment-source rules need that the split and COD suites do not already cover: 1.
class RefundFallbackAndBreakdownTest extends TestCase
{
    use RefreshDatabase;

    private function customer(int $balance = 0): User
    {
        $user = User::create([
            'name' => 'Fallback Customer',
            'email' => 'fb' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);

        // wallet_balance is deliberately not fillable, so seed it by force.
        if ($balance > 0) {
            $user->forceFill(['wallet_balance' => $balance])->save();
        }

        return $user;
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Fallback Admin',
            'email' => 'fbadmin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function rider(): User
    {
        return User::create([
            'name' => 'Fallback Rider',
            'email' => 'fbrider' . uniqid() . '@example.com',
            'phone' => '01511' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'delivery',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function product(int $stock = 50): Product
    {
        return Product::create([
            'name' => 'Test Rice',
            'description' => 'Test',
            'category' => 'Grocery',
            'unit' => 'kg',
            'price' => 100,
            'stock' => $stock,
            'status' => 'Active',
        ]);
    }

    // An order paid through SSLCommerz, part of it from the balance.
    private function onlineOrder(User $customer, int $total, int $walletUsed, ?string $bankTransactionId = 'BANK-REF'): Order
    {
        return Order::create([
            'order_number' => Order::generateNumber(),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Pending',
            'payment_status' => 'Paid',
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'transaction_id' => 'TXN-' . uniqid(),
            'gateway_transaction_id' => $bankTransactionId ? $bankTransactionId . uniqid() : null,
            'paid_amount' => $total - $walletUsed,
            'paid_at' => now(),
            'subtotal' => $total,
            'discount' => 0,
            'wallet_amount' => $walletUsed,
            'total_amount' => $total,
        ]);
    }

    // A Cash on Delivery order with its stock already taken, as checkout takes it.
    private function codOrder(User $customer, Product $product, int $total, int $walletUsed = 0, string $status = 'Pending'): Order
    {
        $quantity = 8;
        $product->decrement('stock', $quantity);

        $order = Order::create([
            'order_number' => Order::generateNumber(),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => $status,
            'payment_status' => 'Unpaid',
            'payment_method' => 'Cash on Delivery',
            'payment_gateway' => null,
            'transaction_id' => null,
            'gateway_transaction_id' => null,
            'paid_amount' => 0,
            'subtotal' => $total,
            'discount' => 0,
            'wallet_amount' => $walletUsed,
            'total_amount' => $total,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_price' => (int) ($total / $quantity),
            'line_total' => $total,
        ]);

        return $order;
    }

    private function addItem(Order $order, Product $product, int $quantity = 4): OrderItem
    {
        $product->decrement('stock', $quantity);

        return OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_price' => 100,
            'line_total' => $quantity * 100,
        ]);
    }

    // SSLCommerz must not be asked for anything.
    private function forbidGateway(): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldNotReceive('initiateRefund');
        $mock->shouldReceive('refundStatus')->andReturn(null);
        $this->app->instance(SslCommerzService::class, $mock);
    }

    private function refunds(): RefundService
    {
        return $this->app->make(RefundService::class);
    }

    private function statuses(): OrderStatusService
    {
        return $this->app->make(OrderStatusService::class);
    }

    // Scenario 2 — online payment with no gateway reference on file.

    public function test_a_missing_gateway_reference_leaves_only_the_balance_route(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);

        $context = $this->refunds()->refundContext($order);

        $this->assertSame(800, $context['refundable_amount'], 'The payment is real and still owed.');
        $this->assertFalse($context['gateway_refund_available'], 'There is no bank_tran_id to refund against.');
        $this->assertSame([Refund::METHOD_WALLET], $context['methods']);
    }

    public function test_a_refund_with_no_gateway_reference_is_credited_as_a_marked_fallback(): void
    {
        // Not merely "not called with these arguments" — never called at all.
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);

        $this->statuses()->customerCancel($order, $customer);

        $refund = Refund::where('order_id', $order->id)->sole();

        $this->assertSame(800, (int) $refund->amount, 'The verified amount, read off the order.');
        $this->assertSame(Refund::METHOD_WALLET, $refund->refund_method);
        $this->assertTrue($refund->is_manual_fallback, 'This is a fallback, not a customer preference.');
        $this->assertSame(Refund::FALLBACK_MISSING_GATEWAY_REFERENCE, $refund->fallback_reason);
        $this->assertSame(Refund::STATUS_COMPLETED, $refund->status);
        $this->assertSame(800, (int) $customer->fresh()->wallet_balance);
    }

    public function test_the_fallback_is_audited_rather_than_left_to_be_inferred(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);

        $this->statuses()->customerCancel($order, $customer);

        $refund = Refund::where('order_id', $order->id)->sole();
        $events = $refund->logs()->pluck('event')->all();

        $this->assertContains('fallback.flagged', $events, 'The reason is on the record, not just the flag.');
    }

    public function test_a_balance_refund_the_customer_asked_for_is_not_marked_as_a_fallback(): void
    {
        $this->forbidGateway();

        // This order has a perfectly good gateway reference; the customer simply prefers the balance.
        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0);

        $this->statuses()->customerCancel($order, $customer, null, Refund::METHOD_WALLET);

        $refund = Refund::where('order_id', $order->id)->sole();

        $this->assertSame(Refund::METHOD_WALLET, $refund->refund_method);
        $this->assertFalse($refund->is_manual_fallback);
        $this->assertNull($refund->fallback_reason);
    }

    public function test_repeating_the_fallback_never_credits_the_balance_twice(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);

        $this->statuses()->customerCancel($order, $customer);

        $refund = Refund::where('order_id', $order->id)->sole();

        // Everything that could re-run the payout: the scheduled sync, an admin re-checking, a retried submission.
        $this->refunds()->syncStatus($refund->fresh());
        $this->refunds()->sendToGateway($refund->fresh());
        $this->refunds()->syncStatus($refund->fresh());

        $this->assertSame(800, (int) $customer->fresh()->wallet_balance, 'Never 1600.');
        $this->assertSame(
            1,
            WalletTransaction::where('customer_id', $customer->id)
                ->where('type', WalletTransaction::TYPE_CREDIT)
                ->count(),
            'One ledger credit, whatever is retried.',
        );
    }

    public function test_a_gateway_refund_whose_reference_vanishes_falls_back_instead_of_failing(): void
    {
        // The gateway cannot be reached, so the refund is left open with no reference of its own — exactly the state the scheduled sync retries.
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldReceive('initiateRefund')->andReturn(null);
        $mock->shouldReceive('refundStatus')->andReturn(null);
        $this->app->instance(SslCommerzService::class, $mock);

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0);

        $this->statuses()->customerCancel($order, $customer, null, Refund::METHOD_ORIGINAL_PAYMENT);

        $refund = Refund::where('order_id', $order->id)->sole();

        $this->assertSame(Refund::METHOD_ORIGINAL_PAYMENT, $refund->refund_method);
        $this->assertContains($refund->status, Refund::OPEN_STATUSES, 'Still queued for retry.');

        // The reference the refund was raised against is then lost — the shape of a queued refund caught by a backfill that wiped the value.
        $refund->forceFill(['gateway_transaction_id' => null, 'sslcommerz_refund_id' => null])->save();

        $settled = $this->refunds()->sendToGateway($refund->fresh());

        $this->assertSame(Refund::STATUS_COMPLETED, $settled->status, 'Not FAILED — the customer is owed this.');
        $this->assertTrue($settled->is_manual_fallback);
        $this->assertSame(Refund::FALLBACK_MISSING_GATEWAY_REFERENCE, $settled->fallback_reason);
        $this->assertSame(800, (int) $customer->fresh()->wallet_balance);
    }

    // The payment breakdown the admin screens read.

    public function test_the_breakdown_splits_a_wallet_and_online_order_by_source(): void
    {
        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 300);

        $breakdown = $this->refunds()->paymentBreakdown($order);

        $this->assertSame(800, $breakdown['order_total']);
        $this->assertSame(300, $breakdown['wallet_paid_amount']);
        $this->assertSame(500, $breakdown['online_paid_amount']);
        $this->assertSame(0, $breakdown['cod_paid_amount']);
        $this->assertSame(0, $breakdown['cod_unpaid_amount']);
        $this->assertSame(800, $breakdown['actual_paid_amount']);
        $this->assertTrue($breakdown['gateway_reference_available']);
    }

    public function test_the_breakdown_reports_undelivered_cash_as_unpaid(): void
    {
        $customer = $this->customer(0);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $breakdown = $this->refunds()->paymentBreakdown($order);

        $this->assertSame(300, $breakdown['wallet_paid_amount']);
        $this->assertSame(0, $breakdown['online_paid_amount']);
        $this->assertSame(0, $breakdown['cod_paid_amount'], 'Nothing has been handed over yet.');
        $this->assertSame(500, $breakdown['cod_unpaid_amount']);
        $this->assertSame(300, $breakdown['actual_paid_amount'], 'Only the balance was really paid.');
        $this->assertFalse($breakdown['gateway_reference_available']);
    }

    // Scenario 7: the cash counts only once the rider has actually been handed it.
    public function test_the_breakdown_counts_cash_once_it_has_been_collected(): void
    {
        $customer = $this->customer(0);
        $order = $this->codOrder($customer, $this->product(), 800, 300, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Delivered', $this->rider());

        $breakdown = $this->refunds()->paymentBreakdown($order->fresh());

        $this->assertSame(300, $breakdown['wallet_paid_amount']);
        $this->assertSame(500, $breakdown['cod_paid_amount']);
        $this->assertSame(0, $breakdown['cod_unpaid_amount']);
        $this->assertSame(800, $breakdown['actual_paid_amount']);
    }

    public function test_the_breakdown_still_knows_what_balance_was_spent_after_it_is_returned(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(300);
        $product = $this->product();
        $order = $this->codOrder($customer, $product, 800, 300);

        // Checkout's debit, written the way checkout writes it.
        $this->app->make(\App\Services\WalletService::class)->debit(
            $customer,
            300,
            WalletTransaction::REF_ORDER,
            $order->id,
            'Refund balance used',
        );

        $this->statuses()->customerCancel($order, $customer);

        // orders.wallet_amount is zeroed when the balance is handed back, so the column alone would report this cancelled order as never having used any.
        $breakdown = $this->refunds()->paymentBreakdown($order->fresh());

        $this->assertSame(0, (int) $order->fresh()->wallet_amount);
        $this->assertSame(300, $breakdown['wallet_paid_amount'], 'Read from the ledger, which keeps the truth.');
        $this->assertSame(300, $breakdown['wallet_returned_amount']);
    }

    public function test_the_admin_detail_endpoint_exposes_the_breakdown_read_only(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);
        $this->statuses()->customerCancel($order, $customer);

        $refund = Refund::where('order_id', $order->id)->sole();

        $response = $this->actingAs($this->admin())
            ->getJson("/api/admin/refunds/{$refund->id}")
            ->assertOk();

        $response->assertJsonPath('refund.paymentBreakdown.orderTotal', 800);
        $response->assertJsonPath('refund.paymentBreakdown.onlinePaid', 800);
        $response->assertJsonPath('refund.paymentBreakdown.codUnpaid', 0);
        $response->assertJsonPath('refund.paymentBreakdown.gatewayTransactionId', null);
        $response->assertJsonPath('refund.paymentBreakdown.gatewayReferenceAvailable', false);
        $response->assertJsonPath('refund.isManualFallback', true);
        $response->assertJsonPath('refund.fallbackReason', Refund::FALLBACK_MISSING_GATEWAY_REFERENCE);
    }

    // What the customer is shown before they confirm a cancellation.

    public function test_the_cancel_dialog_separates_returnable_balance_from_unpaid_cash(): void
    {
        $customer = $this->customer(0);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertOk()
            // No refund is raised for a cash order, and the flag still says so…
            ->assertJsonPath('refundable', false)
            ->assertJsonPath('methods', [])
            // …but the balance really does come back, and the customer sees it.
            ->assertJsonPath('walletReturnAmount', 300)
            ->assertJsonPath('codUnpaidAmount', 500)
            ->assertJsonPath('orderTotal', 800);
    }

    public function test_a_customer_cannot_read_another_customers_refund_options(): void
    {
        $customer = $this->customer(0);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($this->customer(0))
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertForbidden();
    }

    // What the customer is told.

    // The balance leg of a cash order comes back silently otherwise.
    public function test_the_returned_balance_is_announced_naming_only_what_came_back(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->statuses()->customerCancel($order, $customer);

        $message = $customer->fresh()->notifications()
            ->get()
            ->pluck('data.message')
            ->first(fn ($text) => str_contains((string) $text, 'returned to your account balance'));

        $this->assertNotNull($message, 'The customer is told their balance came back.');
        $this->assertStringContainsString('৳300', $message);
        $this->assertStringNotContainsString('৳800', $message, 'The unpaid cash was never refunded.');
    }

    public function test_a_doorstep_rejection_says_so_when_the_balance_is_returned(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $this->rider(), 'Customer Refused', 'Customer Refused');
        $this->statuses()->adminResolveDoorstepRejection($order->fresh(), 'Cancelled', $this->admin(), 'Customer refused at the door.');

        $message = $customer->fresh()->notifications()
            ->get()
            ->pluck('data.message')
            ->first(fn ($text) => str_contains((string) $text, 'rejected at the doorstep'));

        $this->assertNotNull($message);
        $this->assertStringContainsString('৳300', $message);
    }

    public function test_the_balance_return_is_announced_once_however_often_cancelling_is_retried(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertOk();
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);

        $announcements = $customer->fresh()->notifications()
            ->get()
            ->filter(fn ($n) => str_contains((string) ($n->data['message'] ?? ''), 'returned to your account balance'))
            ->count();

        $this->assertSame(1, $announcements);
    }

    // Coupons.

    // The existing rule releases a first-order coupon by itself.
    public function test_cancelling_releases_a_first_order_coupon_without_unwinding_a_counter(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->product(50);
        $coupons = $this->app->make(\App\Services\CouponService::class);

        // Read while the customer still has no orders, the way checkout reads it.
        $coupon = $coupons->eligibleCoupons($customer, 800)
            ->firstWhere('coupon_code', \App\Services\CouponService::FIRST_ORDER_CODE);

        $this->assertNotNull($coupon, 'A customer with no orders is offered the first-order coupon.');

        $order = $this->onlineOrder($customer, 800, 0, null);
        $this->addItem($order, $product, 4);

        $coupons->redeem($coupon, $customer, $order);

        $this->assertTrue($coupons->hasPlacedOrderBefore($customer), 'The order stands, so the coupon is spent.');

        $this->statuses()->customerCancel($order->fresh(), $customer);

        $this->assertFalse(
            $coupons->hasPlacedOrderBefore($customer),
            'Cancelling frees the first-order coupon through the existing eligibility rule.',
        );

        // The usage row stays as the audit record it is.
        $this->assertSame(1, \App\Models\CouponUsage::where('order_id', $order->id)->count());
    }

    // Duplicate protection.

    public function test_cancelling_restores_stock_once_and_records_why(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->product(50);
        $order = $this->onlineOrder($customer, 800, 0, null);
        $this->addItem($order, $product, 4);

        $this->assertSame(46, (int) $product->fresh()->stock, 'Checkout took 4.');

        $this->statuses()->customerCancel($order->fresh(), $customer);

        $this->assertSame(50, (int) $product->fresh()->stock);

        $entry = StockTransaction::where('order_id', $order->id)
            ->where('transaction_type', StockTransaction::TYPE_ORDER_CANCELLED_RETURN)
            ->sole();

        $this->assertSame(4, (int) $entry->quantity);
        $this->assertSame(46, (int) $entry->previous_stock);
        $this->assertSame(50, (int) $entry->new_stock);
        $this->assertSame('order_cancelled', $entry->reason);
    }

    public function test_a_repeated_cancellation_restores_stock_and_refunds_only_once(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->product(50);
        $order = $this->onlineOrder($customer, 800, 0, null);
        $this->addItem($order, $product, 4);

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertOk();
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);

        $this->assertSame(50, (int) $product->fresh()->stock, 'Restored once, not three times.');
        $this->assertSame(
            1,
            StockTransaction::where('order_id', $order->id)
                ->where('transaction_type', StockTransaction::TYPE_ORDER_CANCELLED_RETURN)
                ->count(),
        );
        $this->assertSame(1, Refund::where('order_id', $order->id)->count());
        $this->assertSame(800, (int) $customer->fresh()->wallet_balance, 'Never 2400.');
    }

    public function test_a_doorstep_rejection_replayed_after_the_fact_changes_nothing(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');
        $rider = $this->rider();

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $rider, 'Customer Refused', 'Customer Refused');

        // A rider whose first request timed out and retried: the order has moved on, and the re-check under the lock is what refuses the repeat.
        $this->expectException(RuntimeException::class);
        $this->statuses()->riderAdvance($order->fresh(), 'Customer Rejected at Doorstep', $rider, 'Customer Refused', 'Customer Refused');
    }

    public function test_a_second_admin_approval_is_refused_rather_than_paid(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 0, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Delivered', $this->rider());

        $returnRequest = ReturnRequest::create([
            'request_number' => 'RET-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'order_item_id' => $order->items()->first()->id,
            'customer_id' => $customer->id,
            'type' => 'Return',
            'product_name' => 'Test Rice',
            'quantity' => 8,
            'price' => 800,
            'amount' => 800,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'shipping_fee' => 0,
            'status' => 'Approved',
        ]);

        $first = $this->admin();
        $second = $this->admin();

        // Raising a balance refund is its approval: the first admin's action credits it straight away.
        $refund = $this->refunds()
            ->openReturnRefund($returnRequest->fresh(), null, $first, 'admin')
            ->sole();

        // The second admin had the same row on screen and clicked Approve too.
        try {
            $this->refunds()->approveRefund($refund->fresh(), $second);
            $this->fail('A refund that is already approved must not be approvable again.');
        } catch (RuntimeException $e) {
            // expected
        }

        $this->assertSame(800, (int) $customer->fresh()->wallet_balance, 'Paid once, never 1600.');
        $this->assertSame(
            1,
            WalletTransaction::where('customer_id', $customer->id)
                ->where('type', WalletTransaction::TYPE_CREDIT)
                ->count(),
        );
        $this->assertSame($first->id, (int) $refund->fresh()->approved_by);
    }

    public function test_an_approved_refund_cannot_then_be_rejected(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);
        $this->statuses()->customerCancel($order, $customer);

        $refund = Refund::where('order_id', $order->id)->sole();

        $this->expectException(RuntimeException::class);
        $this->refunds()->rejectRefund($refund->fresh(), $this->admin(), 'Changed my mind.');
    }

    // The client is never the authority.

    public function test_a_client_cannot_talk_the_fallback_into_paying_more(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $order = $this->onlineOrder($customer, 800, 0, null);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", [
                'refund_amount' => 5000,
                'wallet_paid_amount' => 5000,
                'online_paid_amount' => 5000,
                'payment_status' => 'Paid',
                'is_manual_fallback' => false,
            ])
            ->assertOk();

        $this->assertSame(800, (int) $customer->fresh()->wallet_balance, 'The order was for 800.');
        $this->assertSame(800, (int) Refund::where('order_id', $order->id)->sole()->amount);
    }

    public function test_an_admin_cannot_approve_a_refund_into_a_route_the_order_cannot_take(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 0, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Delivered', $this->rider());

        $returnRequest = ReturnRequest::create([
            'request_number' => 'RET-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'order_item_id' => $order->items()->first()->id,
            'customer_id' => $customer->id,
            'type' => 'Return',
            'product_name' => 'Test Rice',
            'quantity' => 8,
            'price' => 800,
            'amount' => 800,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'shipping_fee' => 0,
            'status' => 'Approved',
        ]);

        $refund = $this->refunds()
            ->openReturnRefund($returnRequest->fresh(), null, $this->admin(), 'admin')
            ->sole();

        // Cash the rider collected never travelled through SSLCommerz, so it cannot travel back through it however the admin asks.
        $this->expectException(RuntimeException::class);
        $this->refunds()->approveRefund($refund->fresh(), $this->admin(), Refund::METHOD_ORIGINAL_PAYMENT);
    }
}
