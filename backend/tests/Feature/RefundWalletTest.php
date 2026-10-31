<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Notifications\RefundStatusUpdated;
use App\Services\RefundService;
use App\Services\SmsService;
use App\Services\SslCommerzService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

// End-to-end cover for the refund and refund-balance behaviour.
class RefundWalletTest extends TestCase
{
    use RefreshDatabase;

    private function customer(int $balance = 0): User
    {
        $user = User::create([
            'name' => 'Test Customer',
            'email' => 'cust' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);

        // wallet_balance is deliberately not fillable, so seed it the same way the application does: by force, alongside nothing else.
        if ($balance > 0) {
            $user->forceFill(['wallet_balance' => $balance])->save();
        }

        return $user;
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Test Admin',
            'email' => 'admin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    // A paid SSLCommerz order, optionally part-funded from the refund balance.
    private function paidOrder(User $customer, int $total, int $walletUsed = 0, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Pending',
            'payment_status' => 'Paid',
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'transaction_id' => 'TXN-' . uniqid(),
            'gateway_transaction_id' => 'BANK-' . uniqid(),
            'paid_amount' => $total - $walletUsed,
            'paid_at' => now(),
            'subtotal' => $total,
            'discount' => 0,
            'wallet_amount' => $walletUsed,
            'total_amount' => $total,
        ], $overrides));
    }

    // A delivered Cash on Delivery order — the rider was handed the cash.
    private function codOrder(User $customer, int $total): Order
    {
        return $this->paidOrder($customer, $total, 0, [
            'payment_method' => 'Cash on Delivery',
            'payment_gateway' => null,
            'transaction_id' => null,
            'gateway_transaction_id' => null,
            'paid_amount' => 0,
            'paid_at' => null,
            'status' => 'Delivered',
        ]);
    }

    private function returnRequest(Order $order, User $customer, int $amount, ?string $preferred = null): ReturnRequest
    {
        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Test Product',
            'quantity' => 1,
            'unit_price' => $amount,
            'line_total' => $amount,
        ]);

        return ReturnRequest::create([
            'request_number' => 'RET-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'customer_id' => $customer->id,
            'type' => 'Return',
            'product_name' => 'Test Product',
            'quantity' => 1,
            'price' => $amount,
            'amount' => $amount,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'preferred_refund_method' => $preferred,
            'shipping_fee' => 0,
            'status' => 'Approved',
        ]);
    }

    // Swaps in a gateway that answers however the test needs, without any HTTP.
    private function fakeGateway(?array $refundResponse, ?array $statusResponse = null): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldReceive('initiateRefund')->andReturn($refundResponse);
        $mock->shouldReceive('refundStatus')->andReturn($statusResponse);
        $this->app->instance(SslCommerzService::class, $mock);
    }

    private function refunds(): RefundService
    {
        return $this->app->make(RefundService::class);
    }

    // ------------------------------- Test 1 -------------------------------

    public function test_cancelling_a_paid_order_offers_both_refund_destinations(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 1000);

        $response = $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options");

        $response->assertOk()
            ->assertJsonPath('refundable', true)
            ->assertJsonPath('refundableAmount', 1000);

        $this->assertEqualsCanonicalizing(
            [Refund::METHOD_WALLET, Refund::METHOD_ORIGINAL_PAYMENT],
            $response->json('methods'),
        );
    }

    // ------------------------------- Test 2 -------------------------------

    public function test_original_payment_refund_is_never_instantly_completed(): void
    {
        // The gateway accepts the request but does not confirm settlement.
        $this->fakeGateway(
            ['status' => 'success', 'refund_ref_id' => 'REF-123'],
            ['status' => 'processing'],
        );

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 800);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $refund = Refund::where('order_id', $order->id)->firstOrFail();

        $this->assertSame(Refund::METHOD_ORIGINAL_PAYMENT, $refund->refund_method);
        $this->assertSame(Refund::STATUS_PROCESSING, $refund->status);
        $this->assertNull($refund->completed_at);
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance, 'A gateway refund must never touch the balance.');
    }

    // ------------------------------- Test 3 -------------------------------

    public function test_wallet_cancellation_refund_credits_the_balance_once_completed(): void
    {
        $customer = $this->customer(200);
        $order = $this->paidOrder($customer, 800);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        $refund = Refund::where('order_id', $order->id)->firstOrFail();

        $this->assertSame(Refund::STATUS_COMPLETED, $refund->status);
        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance, '200 already there, plus 800 refunded.');
        $this->assertDatabaseHas('wallet_transactions', [
            'customer_id' => $customer->id,
            'type' => WalletTransaction::TYPE_CREDIT,
            'reference_type' => WalletTransaction::REF_REFUND,
            'amount' => 800,
        ]);
    }

    // ---------------------------- Tests 4 and 5 ----------------------------

    public function test_post_delivery_wallet_refund_is_credited_without_a_second_approval(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 900, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 900, Refund::METHOD_WALLET);

        // Raising the refund is the approval: balance money never leaves BazarGhat, so it is credited straight away rather than left pending.
        $this->refunds()->openReturnRefund($request, null, $customer, 'customer');

        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->assertSame(Refund::STATUS_COMPLETED, $refund->status);
        $this->assertFalse($refund->awaitsApproval());
        $this->assertNotNull($refund->approved_at);
        $this->assertSame(900, (int) $customer->fresh()->wallet_balance);
        $this->assertSame('Refunded', $request->fresh()->refund_status);
        $this->assertSame('Refunded', $order->fresh()->payment_status);
    }

    public function test_admin_can_reject_a_post_delivery_refund_and_nothing_is_paid(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 500, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 500);

        // A gateway refund still waits for the admin's decision, so it can be refused.
        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->refunds()->rejectRefund($refund, $this->admin(), 'Product shows signs of use.');

        $this->assertSame(Refund::STATUS_REJECTED, $refund->fresh()->status);
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertDatabaseMissing('wallet_transactions', ['customer_id' => $customer->id]);
        $this->assertSame('Rejected', $request->fresh()->refund_status);
    }

    // ------------------------------- Test 6 -------------------------------

    public function test_gateway_refund_leaves_the_balance_untouched(): void
    {
        $this->fakeGateway(
            ['status' => 'success', 'refund_ref_id' => 'REF-9'],
            ['status' => 'refunded'],
        );

        $customer = $this->customer(150);
        $order = $this->paidOrder($customer, 600, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 600);

        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->refunds()->approveRefund($refund, $this->admin());

        $this->assertSame(Refund::STATUS_COMPLETED, $refund->fresh()->status);
        $this->assertSame(150, (int) $customer->fresh()->wallet_balance, 'Unchanged — the money went back to the card.');
        $this->assertDatabaseMissing('wallet_transactions', [
            'customer_id' => $customer->id,
            'reference_type' => WalletTransaction::REF_REFUND,
        ]);
    }

    // ------------------------------- Test 7 -------------------------------

    public function test_wallet_refund_credits_exactly_the_approved_amount(): void
    {
        $customer = $this->customer(0);
        $order = $this->paidOrder($customer, 1200, 0, ['status' => 'Delivered']);
        // Only one item is coming back, so only that item's money should.
        $request = $this->returnRequest($order, $customer, 450);

        $this->refunds()->openReturnRefund($request, Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertSame(450, (int) $customer->fresh()->wallet_balance);
        // A partial refund must not declare the whole order refunded.
        $this->assertSame('Paid', $order->fresh()->payment_status);
    }

    // ---------------------------- Tests 8 and 9 ----------------------------

    public function test_wallet_covers_the_whole_order(): void
    {
        $customer = $this->customer(1000);
        $wallet = $this->app->make(WalletService::class);

        $order = $this->paidOrder($customer, 700, 700, ['payment_status' => 'Unpaid', 'paid_amount' => 0]);
        $wallet->debit($customer, 700, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');

        $this->assertSame(300, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(0, $order->gatewayPayable(), 'Nothing is left for the gateway to collect.');
    }

    public function test_wallet_partially_covers_the_order_and_the_rest_is_payable(): void
    {
        $customer = $this->customer(500);
        $wallet = $this->app->make(WalletService::class);

        $order = $this->paidOrder($customer, 800, 500, ['payment_status' => 'Unpaid', 'paid_amount' => 0]);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');

        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(300, $order->gatewayPayable());
    }

    // ------------------------------ Test 10 -------------------------------

    public function test_checkout_without_the_wallet_leaves_the_balance_alone(): void
    {
        $customer = $this->customer(1000);
        $order = $this->paidOrder($customer, 700, 0);

        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(700, $order->gatewayPayable());
        $this->assertDatabaseMissing('wallet_transactions', ['customer_id' => $customer->id]);
    }

    // ------------------------------ Test 11 -------------------------------

    public function test_a_repeated_refund_never_credits_the_balance_twice(): void
    {
        $customer = $this->customer(0);
        $order = $this->paidOrder($customer, 500);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');
        // The same cancellation arriving again — a retry, a double click, a replay.
        $this->refunds()->processCancellationRefund($order->fresh(), Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Still 500, not 1000.');
        $this->assertSame(1, Refund::where('order_id', $order->id)->count());
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->count());
    }

    // ------------------------------ Test 12 -------------------------------

    public function test_a_repeated_order_debit_only_takes_the_money_once(): void
    {
        $customer = $this->customer(1000);
        $wallet = $this->app->make(WalletService::class);
        $order = $this->paidOrder($customer, 300, 300);

        $wallet->debit($customer, 300, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');
        $second = $wallet->debit($customer->fresh(), 300, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');

        $this->assertNull($second, 'The repeat is recognised and does nothing.');
        $this->assertSame(700, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->count());
    }

    // ------------------------------ Test 13 -------------------------------

    public function test_a_failed_gateway_refund_does_not_credit_the_balance(): void
    {
        $this->fakeGateway(['status' => 'failed', 'errorReason' => 'Transaction not refundable']);

        $customer = $this->customer(100);
        $order = $this->paidOrder($customer, 400);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $refund = Refund::where('order_id', $order->id)->firstOrFail();

        $this->assertSame(Refund::STATUS_FAILED, $refund->status);
        $this->assertNotNull($refund->failure_reason);
        $this->assertSame(100, (int) $customer->fresh()->wallet_balance);
        $this->assertDatabaseMissing('wallet_transactions', [
            'customer_id' => $customer->id,
            'reference_type' => WalletTransaction::REF_REFUND,
        ]);
        // Money the customer is still owed keeps the order marked as outstanding.
        $this->assertSame('Refund Pending', $order->fresh()->payment_status);
    }

    // ------------------------------ Test 14 -------------------------------

    public function test_wallet_money_is_returned_when_the_online_leg_never_completes(): void
    {
        $customer = $this->customer(500);
        $wallet = $this->app->make(WalletService::class);

        $order = $this->paidOrder($customer, 800, 500, ['payment_status' => 'Unpaid', 'paid_amount' => 0]);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);

        // The remaining 300 is never paid — the gateway leg is abandoned.
        $wallet->returnOrderFunds($order->fresh());

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'The customer must not lose it.');
        $this->assertSame(0, (int) $order->fresh()->wallet_amount);

        // And a repeated failure callback must not pay it back a second time.
        $wallet->returnOrderFunds($order->fresh());
        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    // ------------------------------ Test 15 -------------------------------

    public function test_a_customer_cannot_read_another_customers_refund_or_wallet(): void
    {
        $owner = $this->customer(300);
        $intruder = $this->customer(0);
        $order = $this->paidOrder($owner, 400);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $owner, 'customer');
        $refund = Refund::where('order_id', $order->id)->firstOrFail();

        $this->actingAs($intruder)->getJson("/api/customer/refunds/{$refund->id}")->assertForbidden();
        $this->actingAs($intruder)->getJson("/api/customer/orders/{$order->id}/refund-options")->assertForbidden();

        // The intruder's own balance is their own, and shows none of the owner's.
        $this->actingAs($intruder)->getJson('/api/customer/wallet')
            ->assertOk()
            ->assertJsonPath('balance', 0);
    }

    // ------------------------------ Test 16 -------------------------------

    public function test_only_an_admin_can_approve_a_refund(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 500, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 500);

        // A gateway refund waits for an Approve — which only an admin may give.
        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->actingAs($customer)->postJson("/api/admin/refunds/{$refund->id}/approve")->assertForbidden();
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);

        $this->actingAs($this->admin())
            ->postJson("/api/admin/refunds/{$refund->id}/approve", ['refund_method' => Refund::METHOD_WALLET])
            ->assertOk()
            ->assertJsonPath('refund.status', Refund::STATUS_COMPLETED);

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    // ------------------ the admin screens, end to end --------------------

    public function test_resolving_a_return_to_a_wallet_refund_credits_the_balance_straight_away(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 750, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 750, Refund::METHOD_WALLET);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/resolve", [
                'resolution' => 'Refund',
                'refund_method' => Refund::METHOD_WALLET,
            ])
            ->assertOk()
            ->assertJsonPath('request.resolution', 'Refund')
            ->assertJsonPath('request.refundStatus', 'Refunded');

        // No second Approve: the balance is credited as the refund is raised.
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->assertSame(Refund::STATUS_COMPLETED, $refund->status);
        $this->assertSame(750, (int) $customer->fresh()->wallet_balance);
        $this->assertSame('Completed', $request->fresh()->status);
    }

    public function test_rejecting_a_refund_reopens_the_request_for_a_replacement(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 400, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 400);
        $admin = $this->admin();

        // A gateway refund waits for its own decision, so it can still be rejected.
        $this->actingAs($admin)->patchJson("/api/admin/returns/{$request->id}/resolve", [
            'resolution' => 'Refund',
            'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
        ])->assertOk();

        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->actingAs($admin)
            ->postJson("/api/admin/refunds/{$refund->id}/reject", ['reason' => 'Item was used.'])
            ->assertOk()
            ->assertJsonPath('refund.status', Refund::STATUS_REJECTED);

        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        // Unresolved again, so a replacement can still be offered instead.
        $this->assertNull($request->fresh()->resolution);
        $this->assertSame('Approved', $request->fresh()->status);
        // And the order goes back to reading as paid, not stuck on outstanding.
        $this->assertSame('Paid', $order->fresh()->payment_status);
    }

    public function test_an_approved_refund_cannot_be_approved_a_second_time(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 300, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 300);
        $admin = $this->admin();

        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->actingAs($admin)->postJson("/api/admin/refunds/{$refund->id}/approve", ['refund_method' => Refund::METHOD_WALLET])->assertOk();
        // A second click, a double submit, a replayed request.
        $this->actingAs($admin)->postJson("/api/admin/refunds/{$refund->id}/approve")->assertStatus(422);

        $this->assertSame(300, (int) $customer->fresh()->wallet_balance, 'Credited once, not twice.');
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->count());
    }

    public function test_a_customer_requesting_a_return_only_states_a_preference(): void
    {
        Storage::fake('public');

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 500, 0, ['status' => 'Delivered']);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Test Product',
            'quantity' => 1,
            'unit_price' => 500,
            'line_total' => 500,
        ]);

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', [
                'order_id' => $order->id,
                'order_item_id' => $item->id,
                'type' => 'Return',
                'reason' => 'Damaged or leaking product',
                'note' => 'Arrived crushed.',
                'preferred_refund_method' => Refund::METHOD_WALLET,
                // A return needs evidence — the existing rule, unchanged.
                'photos' => [UploadedFile::fake()->create('damage.jpg', 20, 'image/jpeg')],
            ])
            ->assertStatus(201)
            ->assertJsonPath('request.status', 'Pending')
            ->assertJsonPath('request.preferredRefundMethod', Refund::METHOD_WALLET);

        // Submitting the request must not create a refund, let alone pay one.
        $this->assertSame(0, Refund::count());
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
    }

    public function test_the_scheduled_sync_never_pays_out_an_unapproved_refund(): void
    {
        // Any call to the gateway here would be a payout nobody authorised.
        $gateway = Mockery::mock(SslCommerzService::class);
        $gateway->shouldNotReceive('initiateRefund');
        $gateway->shouldReceive('refundStatus')->andReturn(null);
        $this->app->instance(SslCommerzService::class, $gateway);

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 650, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 650);

        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->assertTrue($refund->awaitsApproval());

        // The hourly job, and a direct sync, must both leave it alone.
        $this->artisan('refunds:sync')->assertExitCode(0);
        $this->refunds()->syncStatus($refund->fresh());

        $this->assertSame(Refund::STATUS_PENDING, $refund->fresh()->status);
        $this->assertNull($refund->fresh()->sslcommerz_refund_id);
    }

    public function test_a_rejected_refund_can_be_raised_again_without_double_paying(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 480, 0, ['status' => 'Delivered']);
        $request = $this->returnRequest($order, $customer, 480);
        $admin = $this->admin();

        // Rejected once — a gateway refund, which waits for the admin's decision...
        $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $first = Refund::where('return_request_id', $request->id)->firstOrFail();
        $this->refunds()->rejectRefund($first, $admin, 'Needs more evidence.');

        // ...then raised again to the balance, which is credited straight away.
        $this->refunds()->openReturnRefund($request->fresh(), Refund::METHOD_WALLET, $customer, 'customer');
        $second = Refund::where('return_request_id', $request->id)
            ->where('id', '!=', $first->id)
            ->firstOrFail();

        $this->assertSame(Refund::STATUS_COMPLETED, $second->status);

        // Paid once — the rejected attempt released its claim but was never paid.
        $this->assertSame(480, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->count());
        // And the order is now fully refunded, so a third attempt has nothing left.
        $this->assertSame(0, $this->refunds()->returnRefundContext($request->fresh())['refundable_amount']);
    }

    // ---------------------- notifications and SMS ------------------------

    public function test_a_completed_wallet_refund_texts_and_notifies_the_customer(): void
    {
        $sms = Mockery::mock(SmsService::class);
        // The wording the customer is promised for a balance refund.
        $sms->shouldReceive('send')
            ->atLeast()->once()
            ->with(Mockery::any(), Mockery::pattern('/added to your account balance/i'))
            ->andReturn(true);
        $sms->shouldReceive('send')->andReturn(true);
        $this->app->instance(SmsService::class, $sms);

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 350);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $customer->id,
            'type' => RefundStatusUpdated::class,
        ]);
    }

    public function test_a_gateway_refund_is_described_as_taking_up_to_three_days(): void
    {
        $this->fakeGateway(
            ['status' => 'success', 'refund_ref_id' => 'REF-3D'],
            ['status' => 'processing'],
        );

        $sms = Mockery::mock(SmsService::class);
        $sms->shouldReceive('send')
            ->atLeast()->once()
            // "may take up to" — never a guarantee of arrival within 3 days.
            ->with(Mockery::any(), Mockery::pattern('/may take up to 3 days/i'))
            ->andReturn(true);
        $sms->shouldReceive('send')->andReturn(true);
        $this->app->instance(SmsService::class, $sms);

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 900);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $this->assertSame(Refund::STATUS_PROCESSING, Refund::where('order_id', $order->id)->firstOrFail()->status);
    }

    public function test_a_failing_sms_provider_never_breaks_a_refund(): void
    {
        $sms = Mockery::mock(SmsService::class);
        $sms->shouldReceive('send')->andThrow(new \RuntimeException('SMS gateway down'));
        $this->app->instance(SmsService::class, $sms);

        $customer = $this->customer();
        $order = $this->paidOrder($customer, 250);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        // The money still moved; only the message failed.
        $this->assertSame(250, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(Refund::STATUS_COMPLETED, Refund::where('order_id', $order->id)->firstOrFail()->status);
    }

    // --------------------------- COD and mixing ---------------------------

    public function test_cancelling_a_cod_order_refunds_nothing(): void
    {
        $customer = $this->customer();
        $order = $this->codOrder($customer, 600);
        $order->update(['status' => 'Pending', 'payment_status' => 'Unpaid']);

        $created = $this->refunds()->processCancellationRefund($order->fresh(), null, $customer, 'customer');

        $this->assertTrue($created->isEmpty(), 'Nothing was paid, so nothing comes back.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
    }

    public function test_a_delivered_cod_return_is_refunded_to_the_balance_and_never_to_the_gateway(): void
    {
        $customer = $this->customer();
        $order = $this->codOrder($customer, 600);
        $request = $this->returnRequest($order, $customer, 600);

        $context = $this->refunds()->returnRefundContext($request);

        $this->assertSame([Refund::METHOD_WALLET], $context['methods'], 'Cash cannot be pushed back through SSLCommerz.');
        $this->assertFalse($context['gateway_refund_available']);

        $this->refunds()->openReturnRefund($request, null, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->assertSame(Refund::METHOD_WALLET, $refund->fresh()->refund_method);
        $this->assertSame(600, (int) $customer->fresh()->wallet_balance);
    }

    public function test_balance_spent_on_an_order_always_comes_back_as_balance(): void
    {
        $this->fakeGateway(
            ['status' => 'success', 'refund_ref_id' => 'REF-77'],
            ['status' => 'processing'],
        );

        // A 1000 order: 400 from the refund balance, 600 through the gateway.
        $customer = $this->customer(0);
        $order = $this->paidOrder($customer, 1000, 400);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $refunds = Refund::where('order_id', $order->id)->get();

        $this->assertCount(2, $refunds);
        $this->assertSame(400, (int) $refunds->firstWhere('refund_method', Refund::METHOD_WALLET)->amount);
        $this->assertSame(600, (int) $refunds->firstWhere('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->amount);
        $this->assertSame(400, (int) $customer->fresh()->wallet_balance, 'Only the balance part is credited.');
    }

    public function test_a_refund_cannot_exceed_what_is_left_to_refund(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 500, 0, ['status' => 'Delivered']);

        // A return request claiming more than the order was ever worth.
        $request = $this->returnRequest($order, $customer, 5000);

        $context = $this->refunds()->returnRefundContext($request);

        $this->assertSame(5000, $context['eligible_amount']);
        $this->assertSame(500, $context['refundable_amount'], 'Capped at what was actually paid.');

        $this->refunds()->openReturnRefund($request, Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    public function test_a_second_refund_on_a_fully_refunded_order_is_refused(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 700, 0, ['status' => 'Delivered']);

        $first = $this->returnRequest($order, $customer, 700);
        $this->refunds()->openReturnRefund($first, Refund::METHOD_WALLET, $customer, 'customer');

        $second = $this->returnRequest($order->fresh(), $customer, 700);

        $this->expectException(RuntimeException::class);
        $this->refunds()->openReturnRefund($second, Refund::METHOD_WALLET, $customer, 'customer');
    }

    public function test_the_wallet_can_never_be_pushed_negative(): void
    {
        $customer = $this->customer(100);
        $wallet = $this->app->make(WalletService::class);
        $order = $this->paidOrder($customer, 500, 0);

        $this->expectException(RuntimeException::class);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');
    }

    // -------------------------- Order payment split --------------------------

    public function test_an_invoice_splits_the_total_into_balance_and_gateway_parts(): void
    {
        $customer = $this->customer(0);
        // 800 order settled as 500 balance + 300 through the gateway.
        $order = $this->paidOrder($customer, 800, 500);

        $invoice = $this->actingAs($customer)
            ->getJson("/api/customer/invoices/{$order->id}")
            ->assertOk()
            ->json('invoice');

        $this->assertSame(800, (int) $invoice['amount']);
        $this->assertSame(500, (int) $invoice['walletAmount']);
        $this->assertSame(300, (int) $invoice['gatewayAmount']);
        // The two parts are the whole payment — never more, never less.
        $this->assertSame(
            (int) $invoice['amount'],
            (int) $invoice['walletAmount'] + (int) $invoice['gatewayAmount'],
        );
    }

    public function test_an_invoice_for_an_order_paid_entirely_from_balance_owes_the_gateway_nothing(): void
    {
        $customer = $this->customer(0);
        $order = $this->paidOrder($customer, 700, 700, [
            'payment_method' => 'BazarGhat Balance',
            'payment_gateway' => 'BAZARGHAT_WALLET',
        ]);

        $invoice = $this->actingAs($customer)
            ->getJson("/api/customer/invoices/{$order->id}")
            ->assertOk()
            ->json('invoice');

        $this->assertSame(700, (int) $invoice['walletAmount']);
        $this->assertSame(0, (int) $invoice['gatewayAmount']);
    }

    public function test_an_invoice_for_an_order_with_no_balance_used_reports_no_balance_part(): void
    {
        $customer = $this->customer(500);
        $order = $this->paidOrder($customer, 400, 0);

        $invoice = $this->actingAs($customer)
            ->getJson("/api/customer/invoices/{$order->id}")
            ->assertOk()
            ->json('invoice');

        // Nothing to show on the invoice, and the balance was never touched.
        $this->assertSame(0, (int) $invoice['walletAmount']);
        $this->assertSame(400, (int) $invoice['gatewayAmount']);
        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    // ----------------------- Abandoned gateway sessions ----------------------

    public function test_balance_locked_in_an_abandoned_order_is_given_back(): void
    {
        $customer = $this->customer(500);
        $wallet = $this->app->make(WalletService::class);

        // Balance spent, then the customer closed the payment page and never came back — no failure callback was ever sent.
        $order = $this->paidOrder($customer, 800, 500, [
            'payment_status' => 'Unpaid',
            'status' => 'Pending',
            'paid_amount' => 0,
            'paid_at' => null,
        ]);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');
        $order->forceFill(['created_at' => now()->subHours(5)])->save();

        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);

        $this->artisan('wallet:release-abandoned')->assertSuccessful();

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'The balance came back.');
        $this->assertSame('Cancelled', $order->fresh()->status);
        $this->assertNotSame('Paid', $order->fresh()->payment_status);
    }

    public function test_releasing_an_abandoned_order_twice_never_pays_the_balance_back_twice(): void
    {
        $customer = $this->customer(500);
        $wallet = $this->app->make(WalletService::class);

        $order = $this->paidOrder($customer, 800, 500, [
            'payment_status' => 'Unpaid',
            'status' => 'Pending',
            'paid_amount' => 0,
            'paid_at' => null,
        ]);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');
        $order->forceFill(['created_at' => now()->subHours(5)])->save();

        $this->artisan('wallet:release-abandoned')->assertSuccessful();
        $this->artisan('wallet:release-abandoned')->assertSuccessful();

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Still 500, not 1000.');
    }

    public function test_an_order_still_within_the_payment_window_is_left_alone(): void
    {
        $customer = $this->customer(500);
        $wallet = $this->app->make(WalletService::class);

        // Placed moments ago — the customer may still be on the payment page.
        $order = $this->paidOrder($customer, 800, 500, [
            'payment_status' => 'Unpaid',
            'status' => 'Pending',
            'paid_amount' => 0,
            'paid_at' => null,
        ]);
        $wallet->debit($customer, 500, WalletTransaction::REF_ORDER, $order->id, 'Wallet used for order payment');

        $this->artisan('wallet:release-abandoned')->assertSuccessful();

        $this->assertSame(0, (int) $customer->fresh()->wallet_balance, 'Untouched — the order is still live.');
        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_the_sweep_never_touches_an_order_that_paid_without_balance(): void
    {
        $customer = $this->customer(500);
        $order = $this->paidOrder($customer, 800, 0, [
            'payment_status' => 'Unpaid',
            'status' => 'Pending',
        ]);
        $order->forceFill(['created_at' => now()->subHours(5)])->save();

        $this->artisan('wallet:release-abandoned')->assertSuccessful();

        // No balance was ever spent here, so this order's lifecycle is none of the sweep's business.
        $this->assertSame('Pending', $order->fresh()->status);
        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
