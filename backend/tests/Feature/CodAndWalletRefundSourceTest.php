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
use Tests\TestCase;

// Cash is not a refund source until the rider has actually been handed it.
class CodAndWalletRefundSourceTest extends TestCase
{
    use RefreshDatabase;

    private function customer(int $balance = 0): User
    {
        $user = User::create([
            'name' => 'Cod Customer',
            'email' => 'cod' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);

        if ($balance > 0) {
            $user->forceFill(['wallet_balance' => $balance])->save();
        }

        return $user;
    }

    private function rider(): User
    {
        return User::create([
            'name' => 'Test Rider',
            'email' => 'rider' . uniqid() . '@example.com',
            'phone' => '01511' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'delivery',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Test Admin',
            'email' => 'cadmin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
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

    // A Cash on Delivery order, optionally part-funded from the balance, with the stock already taken as checkout does.
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

    // SSLCommerz must never be asked for anything in this whole file.
    private function forbidGateway(): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldNotReceive('initiateRefund');
        $mock->shouldReceive('refundStatus')->andReturn(null);
        $this->app->instance(SslCommerzService::class, $mock);
    }

    private function statuses(): OrderStatusService
    {
        return $this->app->make(OrderStatusService::class);
    }

    private function refunds(): RefundService
    {
        return $this->app->make(RefundService::class);
    }

    private function stockReturns(Order $order): int
    {
        return StockTransaction::where('order_id', $order->id)
            ->whereIn('transaction_type', [
                StockTransaction::TYPE_DOORSTEP_REJECTION_RETURN,
                StockTransaction::TYPE_DOORSTEP_REJECTION_DAMAGED,
            ])
            ->count();
    }

    // TEST 1 — balance + COD, cancelled before delivery.

    public function test_1_cancelling_returns_the_balance_share_and_refunds_no_cash(): void
    {
        $this->forbidGateway();

        // 500 in the balance, 300 of it spent on this order, so 200 is left
        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->statuses()->customerCancel($order, $customer);

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, '200 + the 300 balance share.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count(), 'Unpaid cash raises no refund.');
        $this->assertSame('Unpaid', $order->fresh()->payment_status, 'The 500 at the door was never collected.');
        $this->assertSame(0, (int) $order->fresh()->wallet_amount, 'The balance share is no longer held by the order.');
    }

    public function test_1_the_balance_return_is_a_ledger_credit_against_the_order(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->statuses()->customerCancel($order, $customer);

        $entry = WalletTransaction::where('customer_id', $customer->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)
            ->sole();

        $this->assertSame(300, (int) $entry->amount, 'The balance share only — never the 800 total.');
        $this->assertSame(WalletTransaction::REF_ORDER, $entry->reference_type);
        $this->assertSame($order->id, (int) $entry->reference_id);
    }

    public function test_1_checkout_lets_balance_pay_part_of_a_cash_on_delivery_order(): void
    {
        // Balance can ride on a cash order: the cases above are what keep it safe — cancelled before delivery, the balance share comes straight back.
        $customer = $this->customer(500);
        $product = $this->product(50);

        // the account phone is already verified, which is what checkout requires
        $this->actingAs($customer)->postJson('/api/customer/checkout', [
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'payment_method' => 'cod',
            'use_wallet' => true,
            'wallet_amount' => 300,
            // 8 x 50 = 400, plus delivery: more than the 300 of balance used
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 8,
            ]],
        ])->assertOk();

        $order = Order::latest('id')->first();

        $this->assertSame('Cash on Delivery', $order->payment_method);
        $this->assertSame(300, (int) $order->wallet_amount, 'The balance share of the order.');
        $this->assertSame(200, (int) $customer->fresh()->wallet_balance, 'Only what was used was debited.');
        $this->assertSame((int) $order->total_amount - 300, $order->gatewayPayable(), 'The rest is collected at the door.');
    }

    // TEST 2 — balance + COD, refused at the door.

    public function test_2_a_doorstep_rejection_leaves_stock_to_admin_and_refunds_no_cash(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');

        $this->assertSame(42, (int) $product->fresh()->stock, 'Checkout took 8.');

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $this->rider(), 'Customer Refused', 'Customer Refused');

        $this->assertSame('Customer Rejected at Doorstep', $order->fresh()->status);
        // The goods are on the van, not on the shelf: admin books them back in by hand once they have been looked at.
        $this->assertSame(42, (int) $product->fresh()->stock, 'Inventory is not credited automatically.');
        $this->assertSame(0, $this->stockReturns($order));
        $this->assertSame(0, Refund::where('order_id', $order->id)->count(), 'No cash was collected, so no refund exists.');
    }

    public function test_2_the_balance_share_comes_back_when_the_rejected_order_is_cancelled(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $this->rider(), 'Customer Refused', 'Customer Refused');
        $this->statuses()->adminResolveDoorstepRejection($order->fresh(), 'Cancelled', $this->admin(), 'Customer refused at the door.');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, '200 + the 300 balance share.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
        // The doorstep branch is admin's to book back in from end to end — the later cancellation does not credit the shelf either.
        $this->assertSame(42, (int) $product->fresh()->stock);
        $this->assertSame(0, $this->stockReturns($order));
    }

    public function test_2_a_damaged_rejection_leaves_the_units_to_admin(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $this->rider(), 'Product Damaged', 'Product Damaged');

        // Neither pot is touched: what came back damaged and what is still saleable is admin's call, made in Inventory Management.
        $this->assertSame(42, (int) $product->fresh()->stock);
        $this->assertSame(0, (int) $product->fresh()->damaged_stock);
        $this->assertSame(0, $this->stockReturns($order));
    }

    // TEST 3 / 4 — pure COD owes nothing back.

    public function test_3_cancelling_a_pure_cash_order_refunds_nothing(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(500);
        $order = $this->codOrder($customer, $this->product(), 800, 0);

        $context = $this->refunds()->refundContext($order);
        $this->assertTrue($context['is_cod']);
        $this->assertSame(0, $context['refundable_amount']);
        $this->assertSame([], $context['methods'], 'Nothing was paid, so no route is offered.');

        $this->statuses()->customerCancel($order, $customer);

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Untouched.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
        $this->assertSame(0, WalletTransaction::where('customer_id', $customer->id)->count());
    }

    public function test_4_a_rejected_pure_cash_order_refunds_nothing_and_leaves_stock_alone(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(500);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 0, 'Out for Delivery');

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $this->rider(), 'Customer Unavailable', 'Customer Unavailable');

        $this->assertSame(42, (int) $product->fresh()->stock, 'Booked back in by admin, not here.');
        $this->assertSame(0, $this->stockReturns($order));
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    // TEST 5 — the cash is only paid once the rider collects it.

    public function test_5_cash_counts_as_paid_only_after_delivery(): void
    {
        $customer = $this->customer(0);
        $order = $this->codOrder($customer, $this->product(), 800, 0, 'Out for Delivery');

        $this->assertSame('Unpaid', $order->payment_status, 'Nothing has been handed over yet.');
        $this->assertSame(0, $this->refunds()->refundContext($order)['refundable_amount']);

        $this->statuses()->riderAdvance($order, 'Delivered', $this->rider());

        $delivered = $order->fresh();
        $this->assertSame('Delivered', $delivered->status);
        $this->assertSame('Paid', $delivered->payment_status, 'The rider was handed the cash at the door.');
    }

    // TEST 6 — collected cash refunds through the balance, never the card.

    public function test_6_collected_cash_is_refunded_to_the_balance(): void
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

        $context = $this->refunds()->returnRefundContext($returnRequest->fresh());

        $this->assertSame(800, $context['refundable_amount'], 'The cash the rider collected is refundable now.');
        $this->assertSame([Refund::METHOD_WALLET], $context['methods'], 'Cash cannot travel back through a gateway that never saw it.');

        // Raising a balance refund credits it — there is no second approval.
        $this->refunds()->openReturnRefund($returnRequest->fresh(), null, $this->admin(), 'admin');

        $this->assertSame(800, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count());
    }

    // TEST 11 — repeats change nothing.

    public function test_11_repeating_the_doorstep_rejection_changes_nothing(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $product = $this->product(50);
        $order = $this->codOrder($customer, $product, 800, 300, 'Out for Delivery');
        $rider = $this->rider();

        $this->statuses()->riderAdvance($order, 'Customer Rejected at Doorstep', $rider, 'Customer Refused', 'Customer Refused');

        // the state machine refuses the repeat
        try {
            $this->statuses()->riderAdvance($order->fresh(), 'Customer Rejected at Doorstep', $rider, 'Customer Refused', 'Customer Refused');
        } catch (\RuntimeException $e) {
            // expected — the order is no longer Out for Delivery
        }

        $this->assertSame(42, (int) $product->fresh()->stock, 'No automatic credit, however many times it is called.');
        $this->assertSame(0, $this->stockReturns($order));
    }

    public function test_11_repeating_the_cancellation_credits_the_balance_once(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertOk();
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Never 800.');
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->where('type', WalletTransaction::TYPE_CREDIT)->count());
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
    }

    // TEST 12 — the client cannot invent a payment.

    public function test_12_a_client_cannot_invent_a_paid_cash_amount(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", [
                'refund_method' => Refund::METHOD_WALLET,
                'wallet_paid_amount' => 800,
                'cod_paid_amount' => 500,
                'online_paid_amount' => 500,
                'payment_status' => 'Paid',
                'refund_amount' => 800,
            ])
            ->assertOk();

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Only the real 300 came back.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count(), 'The claimed cash payment does not exist.');
        $this->assertSame('Unpaid', $order->fresh()->payment_status, 'A client cannot mark an order paid.');
    }

    public function test_12_the_gateway_route_is_refused_on_a_cash_order(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->codOrder($customer, $this->product(), 800, 300);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", [
                'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
            ]);

        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count(), 'Cash never reaches SSLCommerz.');
    }
}
