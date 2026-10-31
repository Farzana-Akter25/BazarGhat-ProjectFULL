<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Refund;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use App\Services\SslCommerzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use RuntimeException;
use Tests\TestCase;

// A refund goes back the way the money came in.
class RefundSourceSplitTest extends TestCase
{
    use RefreshDatabase;

    private function customer(int $balance = 0): User
    {
        $user = User::create([
            'name' => 'Split Customer',
            'email' => 'split' . uniqid() . '@example.com',
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

    // An order paid partly (or wholly) through SSLCommerz, partly from the balance.
    private function order(User $customer, int $total, int $walletUsed): Order
    {
        $gatewayPaid = $total - $walletUsed;
        $viaGateway = $gatewayPaid > 0;

        return Order::create([
            'order_number' => Order::generateNumber(),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Pending',
            'payment_status' => 'Paid',
            'payment_method' => $viaGateway ? 'SSLCommerz' : 'BazarGhat Balance',
            'payment_gateway' => $viaGateway ? 'SSLCOMMERZ' : 'BAZARGHAT_WALLET',
            'transaction_id' => 'TXN-' . uniqid(),
            'gateway_transaction_id' => $viaGateway ? 'BANK-' . uniqid() : null,
            'paid_amount' => $gatewayPaid,
            'paid_at' => now(),
            'subtotal' => $total,
            'discount' => 0,
            'wallet_amount' => $walletUsed,
            'total_amount' => $total,
        ]);
    }

    // A gateway that answers without any HTTP, recording what it was asked to refund.
    private function fakeGateway(?int $expectAmount = null, ?int $times = null): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $call = $mock->shouldReceive('initiateRefund');

        if ($expectAmount !== null) {
            $call->with(Mockery::any(), $expectAmount, Mockery::any());
        }

        if ($times !== null) {
            $call->times($times);
        }

        $call->andReturn(['status' => 'success', 'refund_ref_id' => 'REF-' . uniqid()]);
        // "processing" keeps the refund open — only "refunded" may complete it.
        $mock->shouldReceive('refundStatus')->andReturn(['status' => 'processing']);

        $this->app->instance(SslCommerzService::class, $mock);
    }

    // No gateway call is expected at all.
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

    private function admin(): User
    {
        return User::create([
            'name' => 'Split Admin',
            'email' => 'sadmin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function walletCredits(User $customer): int
    {
        return (int) WalletTransaction::where('customer_id', $customer->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)
            ->sum('amount');
    }

    // TEST 1 — 100% balance: the gateway route must not even be offered.

    public function test_1_a_fully_balance_paid_order_can_only_be_refunded_to_the_balance(): void
    {
        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 800);

        $context = $this->refunds()->refundContext($order);

        $this->assertSame(800, $context['wallet_portion']);
        $this->assertSame(0, $context['gateway_portion']);
        $this->assertSame([Refund::METHOD_WALLET], $context['methods'], 'Nothing was paid externally, so there is no original payment method to offer.');

        // and the endpoint the modal reads says the same thing
        $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertOk()
            ->assertJsonPath('methods', ['WALLET'])
            ->assertJsonPath('walletPortion', 800)
            ->assertJsonPath('gatewayPortion', 0);
    }

    public function test_1_cancelling_a_fully_balance_paid_order_returns_it_all_to_the_balance(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 800);

        $this->statuses()->customerCancel($order, $customer);

        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance, '200 + 800.');
        $this->assertSame(800, $this->walletCredits($customer));
        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count());
    }

    public function test_1_asking_for_the_gateway_on_a_balance_paid_order_is_refused(): void
    {
        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 800);

        $this->expectException(RuntimeException::class);
        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
    }

    // TEST 2 — 100% external, customer picks the balance.

    public function test_2_a_fully_gateway_paid_order_refunded_to_the_balance(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 0);

        $context = $this->refunds()->refundContext($order);
        $this->assertSame([Refund::METHOD_WALLET, Refund::METHOD_ORIGINAL_PAYMENT], $context['methods'], 'Both routes are open on a gateway-paid order.');

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance, '200 + 800.');
        $this->assertSame(800, $this->walletCredits($customer));
        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count());
    }

    // TEST 3 — 100% external, customer picks the original payment method.

    public function test_3_a_fully_gateway_paid_order_refunded_to_the_original_payment_method(): void
    {
        $this->fakeGateway(800);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 0);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $this->assertSame(200, (int) $customer->fresh()->wallet_balance, 'The balance is untouched.');
        $this->assertSame(0, $this->walletCredits($customer));

        $refunds = Refund::where('order_id', $order->id)->get();
        $this->assertCount(1, $refunds);
        $this->assertSame(Refund::METHOD_ORIGINAL_PAYMENT, $refunds[0]->refund_method);
        $this->assertSame(800, (int) $refunds[0]->amount);
        $this->assertSame(Refund::STATUS_PROCESSING, $refunds[0]->status, 'Submitted is not settled — only SSLCommerz may complete it.');
    }

    // TEST 4 — split payment, the external part goes to the balance too.

    public function test_4_a_split_order_refunded_entirely_to_the_balance(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $context = $this->refunds()->refundContext($order);
        $this->assertSame(300, $context['wallet_portion']);
        $this->assertSame(500, $context['gateway_portion']);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance, '200 + 300 + 500.');
        $this->assertSame(800, $this->walletCredits($customer));
        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count());
    }

    // TEST 5 — split payment, the external part goes back to the gateway.

    public function test_5_a_split_order_sends_only_the_gateway_share_to_sslcommerz(): void
    {
        // The expectation itself is the assertion: 500, never 800 and never 300.
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, '200 + the 300 balance share only.');
        $this->assertSame(300, $this->walletCredits($customer));

        $walletLeg = Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_WALLET)->sole();
        $gatewayLeg = Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->sole();

        $this->assertSame(300, (int) $walletLeg->amount);
        $this->assertSame(Refund::STATUS_COMPLETED, $walletLeg->status, 'The ledger credit is the settlement.');
        $this->assertSame(500, (int) $gatewayLeg->amount);
        $this->assertSame(Refund::STATUS_PROCESSING, $gatewayLeg->status);

        $this->assertSame(800, (int) Refund::where('order_id', $order->id)->sum('amount'), 'The two legs add up to the order, never more.');
    }

    // TEST 6 — a tampered request cannot buy a bigger refund.

    public function test_6_amounts_sent_by_the_client_are_ignored(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", [
                'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
                // none of these exist server-side; the order is the only source
                'wallet_refund_amount' => 800,
                'external_refund_amount' => 800,
                'amount' => 5000,
                'refundable_amount' => 5000,
            ])
            ->assertOk();

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Still 200 + 300.');
        $this->assertSame(800, (int) Refund::where('order_id', $order->id)->sum('amount'), 'Refunded exactly what was paid.');
        $this->assertSame(500, (int) Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->sum('amount'));
    }

    public function test_6_an_unavailable_refund_method_is_rejected_by_the_api(): void
    {
        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 800); // balance only

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", [
                'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
            ])
            ->assertStatus(422);

        $this->assertSame(200, (int) $customer->fresh()->wallet_balance, 'A refused cancel refunds nothing.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
    }

    public function test_6_an_invented_refund_method_is_rejected(): void
    {
        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel", ['refund_method' => 'CASH_IN_HAND'])
            ->assertStatus(422);

        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
    }

    // TEST 7 — the same refund twice pays out once.

    public function test_7_repeating_the_refund_never_credits_the_balance_twice(): void
    {
        // times(1): a second submission to SSLCommerz would fail this expectation.
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $this->refunds()->processCancellationRefund($order->fresh(), Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');
        $this->refunds()->processCancellationRefund($order->fresh(), Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'Credited once.');
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->where('type', WalletTransaction::TYPE_CREDIT)->count());
        $this->assertSame(2, Refund::where('order_id', $order->id)->count(), 'One leg per source bucket, no more.');
        $this->assertSame(800, (int) Refund::where('order_id', $order->id)->sum('amount'));
    }

    public function test_7_a_double_clicked_cancel_refunds_once(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel", [
            'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
        ])->assertOk();

        // the second click lands on an order that is already cancelled
        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel", [
            'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
        ])->assertStatus(422);

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->where('type', WalletTransaction::TYPE_CREDIT)->count());
        $this->assertSame(800, (int) Refund::where('order_id', $order->id)->sum('amount'));
    }

    public function test_7_replaying_the_gateway_submission_sends_one_request(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $gatewayLeg = Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->sole();

        // a replayed callback / retry must not re-submit an already-submitted refund
        $this->refunds()->sendToGateway($gatewayLeg->fresh());
        $this->refunds()->sendToGateway($gatewayLeg->fresh());

        $this->assertSame(500, (int) $gatewayLeg->fresh()->amount);
        $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
    }

    // TEST 8 — the state survives a reload.

    public function test_8_the_refund_state_survives_a_page_refresh(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel", [
            'refund_method' => Refund::METHOD_ORIGINAL_PAYMENT,
        ])->assertOk();

        // a refresh is just the same GETs again — nothing may move because of them
        for ($i = 0; $i < 3; $i++) {
            $listed = collect($this->actingAs($customer)->getJson('/api/customer/orders')->assertOk()->json('orders'))
                ->firstWhere('orderId', $order->id);

            $this->assertSame('Cancelled', $listed['status']);
            $this->assertSame(800, collect($listed['refunds'])->sum('amount'));

            $wallet = collect($listed['refunds'])->firstWhere('method', Refund::METHOD_WALLET);
            $gateway = collect($listed['refunds'])->firstWhere('method', Refund::METHOD_ORIGINAL_PAYMENT);

            $this->assertSame(300, $wallet['amount']);
            $this->assertSame(Refund::STATUS_COMPLETED, $wallet['status']);
            $this->assertSame(500, $gateway['amount']);
            $this->assertSame(Refund::STATUS_PROCESSING, $gateway['status']);

            $this->assertSame(500, (int) $customer->fresh()->wallet_balance);
            $this->assertSame(1, WalletTransaction::where('customer_id', $customer->id)->where('type', WalletTransaction::TYPE_CREDIT)->count());
        }
    }

    // The wallet ledger row a refund writes.

    public function test_the_wallet_credit_is_recorded_against_the_order_as_a_refund(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $entry = WalletTransaction::where('customer_id', $customer->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)
            ->sole();

        $this->assertSame(WalletTransaction::TYPE_CREDIT, $entry->type);
        $this->assertSame(WalletTransaction::REF_REFUND, $entry->reference_type);
        $this->assertSame(300, (int) $entry->amount);
        $this->assertSame(500, (int) $entry->balance_after);
        $this->assertStringContainsString($order->order_number, (string) $entry->description);
    }

    // An admin cancels: no method is picked, so the money goes back the way it came.

    public function test_an_admin_cancel_sends_the_gateway_share_back_to_the_gateway(): void
    {
        $this->fakeGateway(500, 1);

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->statuses()->adminCancel($order, $this->admin(), 'Out of stock at the warehouse.');

        $this->assertSame(500, (int) $customer->fresh()->wallet_balance, 'The 300 balance share only.');

        $walletLeg = Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_WALLET)->sole();
        $gatewayLeg = Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->sole();

        $this->assertSame(300, (int) $walletLeg->amount);
        $this->assertSame(500, (int) $gatewayLeg->amount, 'Never the 800 total.');
        $this->assertSame('admin', $order->fresh()->cancelled_by);
    }

    public function test_an_admin_cancel_falls_back_to_the_balance_when_the_gateway_cannot_be_used(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        // paid online, but with no refund handle on file
        $order = $this->order($customer, 800, 300);
        $order->forceFill(['gateway_transaction_id' => null])->save();

        $this->statuses()->adminCancel($order->fresh(), $this->admin());

        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance, '200 + 300 + 500 — all of it to the balance.');
        $this->assertSame(0, Refund::where('order_id', $order->id)->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->count());
    }

    public function test_choosing_the_balance_records_one_credit_for_the_whole_order(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(200);
        $order = $this->order($customer, 800, 300);

        $this->refunds()->processCancellationRefund($order, Refund::METHOD_WALLET, $customer, 'customer');

        $credits = WalletTransaction::where('customer_id', $customer->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)
            ->get();

        $this->assertSame(800, (int) $credits->sum('amount'), '300 balance share + 500 gateway share.');
        $this->assertSame(1000, (int) $customer->fresh()->wallet_balance);
    }
}
