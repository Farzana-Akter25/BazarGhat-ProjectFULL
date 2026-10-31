<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\SslCommerzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

// How the refund balance and the payment methods share an order at checkout.
class CheckoutWalletTest extends TestCase
{
    use RefreshDatabase;

    private const DELIVERY_FEE = 80;

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
            // The checkout endpoint refuses an unverified contact number, and an account phone carrying this timestamp counts as proven.
            'phone_verified_at' => now(),
        ]);

        // wallet_balance is deliberately not fillable, so seed it the same way the application does: by force, alongside nothing else.
        if ($balance > 0) {
            $user->forceFill(['wallet_balance' => $balance])->save();
        }

        return $user;
    }

    // A product priced so that one unit plus delivery makes exactly $orderTotal.
    private function productForOrderTotal(int $orderTotal): Product
    {
        return Product::create([
            'name' => 'Test Product ' . uniqid(),
            'description' => 'For checkout tests',
            'category' => 'Grocery',
            'unit' => 'kg',
            'price' => $orderTotal - self::DELIVERY_FEE,
            'stock' => 50,
            'status' => 'Active',
        ]);
    }

    // Swaps in a gateway that hands back a URL without any HTTP, and remembers the order it was asked to collect for.
    private function fakeGateway(?string $gatewayUrl = 'https://sslcommerz.test/session/abc'): object
    {
        $spy = new class {
            public ?Order $order = null;
            public int $calls = 0;
        };

        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldReceive('initiatePayment')
            ->andReturnUsing(function (Order $order) use ($spy, $gatewayUrl) {
                $spy->calls++;
                $spy->order = $order;

                return $gatewayUrl;
            });

        $this->app->instance(SslCommerzService::class, $mock);

        return $spy;
    }

    // A gateway that will never be reached — any call to it fails the test.
    private function forbidGateway(): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldReceive('initiatePayment')
            ->never();

        $this->app->instance(SslCommerzService::class, $mock);
    }

    // Swaps in a gateway whose validation call answers with $validation.
    private function fakeValidation(array $validation): void
    {
        $mock = Mockery::mock(SslCommerzService::class);
        $mock->shouldReceive('validatePayment')->andReturn($validation);
        $this->app->instance(SslCommerzService::class, $mock);
    }

    private function placeOrder(User $customer, Product $product, array $overrides = [])
    {
        return $this->actingAs($customer)->postJson('/api/customer/checkout', array_merge([
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ], $overrides));
    }

    private function walletDebitsFor(Order $order): int
    {
        return WalletTransaction::where('reference_type', WalletTransaction::REF_ORDER)
            ->where('reference_id', $order->id)
            ->where('type', WalletTransaction::TYPE_DEBIT)
            ->count();
    }

    // TEST 1 — balance covers the order, with change left over

    public function test_balance_covering_the_whole_order_settles_it_without_a_payment_method(): void
    {
        // Nothing is owed to anyone outside BazarGhat, so the gateway must not even be asked for a session.
        $this->forbidGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(170);

        // No payment_method at all — the point of the case.
        $response = $this->placeOrder($customer, $product, ['use_wallet' => true]);

        $response->assertOk()
            ->assertJsonPath('payment_method', 'wallet')
            ->assertJsonPath('wallet_amount', 170);

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(170, (int) $order->total_amount);
        $this->assertSame(170, (int) $order->wallet_amount);
        $this->assertSame(0, $order->gatewayPayable(), 'Nothing may be left for the gateway.');
        $this->assertSame('Paid', $order->payment_status);
        $this->assertSame('BazarGhat Balance', $order->payment_method);

        // 380 - 170 = 210 stays available for next time.
        $this->assertSame(210, (int) $customer->fresh()->wallet_balance);

        $this->assertSame(1, $this->walletDebitsFor($order), 'Exactly one debit, linked to this order.');

        $debit = WalletTransaction::where('reference_id', $order->id)->firstOrFail();
        $this->assertSame(170, $debit->amount);
        $this->assertSame(210, $debit->balance_after);
        $this->assertSame(WalletTransaction::REF_ORDER, $debit->reference_type);
    }

    // TEST 2 — balance covers part of the order

    public function test_partial_balance_sends_only_the_remainder_to_the_gateway(): void
    {
        $gateway = $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('payment_method', 'online')
            ->assertJsonPath('gateway_url', 'https://sslcommerz.test/session/abc');

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(800, (int) $order->total_amount);
        $this->assertSame(380, (int) $order->wallet_amount);

        // The single figure SslCommerzService puts in its session payload.
        $this->assertSame(1, $gateway->calls);
        $this->assertSame(420, $gateway->order->gatewayPayable(), 'The gateway is asked for the remainder, never the full total.');
        $this->assertNotSame(800, $gateway->order->gatewayPayable());

        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, $this->walletDebitsFor($order));
        $this->assertSame(380, (int) WalletTransaction::where('reference_id', $order->id)->value('amount'));

        // The order is not settled yet — the gateway leg has not reported back.
        $this->assertSame('Unpaid', $order->payment_status);
    }

    // TEST 3 — the customer leaves the balance alone

    public function test_declining_the_balance_leaves_it_untouched_and_charges_the_full_total(): void
    {
        $gateway = $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            // use_wallet omitted entirely: balance use is opt-in, never assumed.
        ]);

        $response->assertOk();

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(0, (int) $order->wallet_amount);
        $this->assertSame(800, $gateway->order->gatewayPayable(), 'The whole total goes to the gateway.');

        $this->assertSame(380, (int) $customer->fresh()->wallet_balance, 'An unused balance must not move.');
        $this->assertSame(0, $this->walletDebitsFor($order), 'No debit for an order that did not spend balance.');
    }

    public function test_cash_on_delivery_without_the_balance_keeps_its_existing_flow(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, ['payment_method' => 'cod']);

        $response->assertOk()->assertJsonPath('payment_method', 'cod');

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame('Cash on Delivery', $order->payment_method);
        $this->assertSame(0, (int) $order->wallet_amount);
        $this->assertSame(380, (int) $customer->fresh()->wallet_balance);
    }

    public function test_cash_on_delivery_can_use_the_balance_for_part_of_the_order(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'cod',
            'use_wallet' => true,
        ]);

        $response->assertOk()->assertJsonPath('payment_method', 'cod');

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame('Cash on Delivery', $order->payment_method);
        $this->assertSame('Unpaid', $order->payment_status);
        $this->assertSame(380, (int) $order->wallet_amount);
        $this->assertSame(420, $order->gatewayPayable(), 'Only the rest is collected at the door.');
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, $this->walletDebitsFor($order));

        // Still waiting for delivery hours later: the abandoned-payment sweep is for online orders only and must leave it alone.
        $this->travel(3)->hours();
        $this->artisan('wallet:release-abandoned')->assertExitCode(0);
        $this->assertSame('Pending', $order->fresh()->status);
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);

        // Cancelled before delivery: no cash was paid, so there is nothing to refund — the balance part simply comes straight back.
        $this->app->make(\App\Services\OrderStatusService::class)->customerCancel($order->fresh(), $customer);

        $this->assertSame('Unpaid', $order->fresh()->payment_status);
        $this->assertSame(380, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(0, \App\Models\Refund::where('order_id', $order->id)->count());
    }

    // TEST 4 — there is no balance to use

    public function test_an_empty_balance_cannot_be_spent_and_creates_no_transaction(): void
    {
        $gateway = $this->fakeGateway();

        $customer = $this->customer(0);
        $product = $this->productForOrderTotal(800);

        // The client asks to use a balance the customer does not have.
        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ]);

        $response->assertOk();

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(0, (int) $order->wallet_amount);
        $this->assertSame(800, $gateway->order->gatewayPayable());
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance, 'A balance may never go negative.');
        $this->assertSame(0, $this->walletDebitsFor($order));
    }

    public function test_an_empty_balance_still_requires_a_payment_method(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(0);
        $product = $this->productForOrderTotal(800);

        // Nothing to cover the order with, and no method chosen.
        $this->placeOrder($customer, $product, ['use_wallet' => true])
            ->assertStatus(422);

        $this->assertSame(0, Order::count(), 'A rejected checkout must leave no order behind.');
        $this->assertSame(50, (int) $product->fresh()->stock, 'Nor may it take stock.');
    }

    // TEST 5 — the balance is exactly the order total

    public function test_a_balance_exactly_equal_to_the_total_settles_the_order_and_empties_itself(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(800);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, ['use_wallet' => true]);

        $response->assertOk()->assertJsonPath('payment_method', 'wallet');

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(800, (int) $order->wallet_amount);
        $this->assertSame(0, $order->gatewayPayable());
        $this->assertSame('Paid', $order->payment_status);
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, $this->walletDebitsFor($order));
    }

    // TEST 6 — the balance is larger than the order

    public function test_only_what_the_order_costs_is_taken_from_a_larger_balance(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(1000);
        $product = $this->productForOrderTotal(700);

        $response = $this->placeOrder($customer, $product, ['use_wallet' => true]);

        $response->assertOk()
            ->assertJsonPath('payment_method', 'wallet')
            ->assertJsonPath('wallet_amount', 700);

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(700, (int) $order->wallet_amount, 'Never more than the order costs.');
        $this->assertSame(0, $order->gatewayPayable());
        $this->assertSame(300, (int) $customer->fresh()->wallet_balance);
    }

    // TEST 7 — the gateway leg fails

    public function test_a_failed_gateway_payment_gives_the_spent_balance_back(): void
    {
        $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ]);

        $orderNumber = $response->json('order_number');
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance, 'The balance is committed while the payment is in flight.');

        // The customer fails or abandons the payment at SSLCommerz.
        $this->post('/api/payment/sslcommerz/fail', ['tran_id' => $orderNumber]);

        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->assertSame(380, (int) $customer->fresh()->wallet_balance, 'The customer must not lose balance to a payment that never happened.');
        $this->assertNotSame('Paid', $order->payment_status);
        $this->assertSame('Cancelled', $order->status);
        $this->assertSame(0, (int) $order->wallet_amount, 'The order stops holding balance it gave back.');

        // The debit and its matching return are both on the ledger, and net to nothing.
        $this->assertSame(1, $this->walletDebitsFor($order));
        $this->assertSame(1, WalletTransaction::where('reference_id', $order->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)->count());
    }

    public function test_a_repeated_failure_callback_returns_the_balance_only_once(): void
    {
        $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $orderNumber = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ])->json('order_number');

        // A gateway that reports the same dead attempt twice — or a fail followed by a cancel — must not pay the balance back twice.
        $this->post('/api/payment/sslcommerz/fail', ['tran_id' => $orderNumber]);
        $this->post('/api/payment/sslcommerz/fail', ['tran_id' => $orderNumber]);
        $this->post('/api/payment/sslcommerz/cancel', ['tran_id' => $orderNumber]);

        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->assertSame(380, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, WalletTransaction::where('reference_id', $order->id)
            ->where('type', WalletTransaction::TYPE_CREDIT)->count());
        $this->assertSame(50, (int) $product->fresh()->stock, 'Stock is restored once, not once per callback.');
    }

    // TEST 8 — the same successful callback arrives twice

    public function test_a_replayed_success_callback_settles_the_order_only_once(): void
    {
        $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $orderNumber = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ])->json('order_number');

        // SSLCommerz confirms the 420 it was asked for — never the full 800.
        $this->fakeValidation([
            'status' => 'VALID',
            'amount' => 420,
            'tran_id' => $orderNumber,
            'bank_tran_id' => 'BANK-XYZ',
            'val_id' => 'VAL-XYZ',
            'card_type' => 'BKASH-BKash',
        ]);

        $callback = ['tran_id' => $orderNumber, 'val_id' => 'VAL-XYZ'];

        $this->post('/api/payment/sslcommerz/success', $callback);
        $firstPaidAt = Order::where('order_number', $orderNumber)->value('paid_at');

        // The same callback again, plus the IPN that normally accompanies it.
        $this->post('/api/payment/sslcommerz/success', $callback);
        $this->post('/api/payment/sslcommerz/ipn', $callback);

        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->assertSame('Paid', $order->payment_status);
        $this->assertSame(420, (int) $order->paid_amount, 'Only the gateway leg was captured.');
        $this->assertEquals($firstPaidAt, $order->paid_at, 'The order is settled once, at one moment.');

        // The balance moved exactly once, at checkout, and never again.
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
        $this->assertSame(1, $this->walletDebitsFor($order));
        $this->assertSame(1, WalletTransaction::where('reference_id', $order->id)->count());

        // One settlement means one history entry for it.
        $this->assertSame(1, $order->statusHistories()
            ->where('note', 'like', 'Payment received via SSLCommerz%')
            ->count());
    }

    public function test_a_gateway_reporting_the_full_total_instead_of_the_remainder_is_rejected(): void
    {
        $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $orderNumber = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
        ])->json('order_number');

        // 800 is not what this order owes the gateway — 420 is.
        $this->fakeValidation([
            'status' => 'VALID',
            'amount' => 800,
            'tran_id' => $orderNumber,
            'val_id' => 'VAL-XYZ',
        ]);

        $this->post('/api/payment/sslcommerz/success', ['tran_id' => $orderNumber, 'val_id' => 'VAL-XYZ']);

        $this->assertNotSame('Paid', Order::where('order_number', $orderNumber)->value('payment_status'));
    }

    // Backend validation — the client's figures are never the ones used

    public function test_a_wallet_amount_larger_than_the_balance_is_clamped_to_the_balance(): void
    {
        $gateway = $this->fakeGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        $response = $this->placeOrder($customer, $product, [
            'payment_method' => 'online',
            'use_wallet' => true,
            // A client claiming far more balance than the customer holds.
            'wallet_amount' => 99999,
        ]);

        $response->assertOk();

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(380, (int) $order->wallet_amount);
        $this->assertSame(420, $gateway->order->gatewayPayable());
        $this->assertSame(0, (int) $customer->fresh()->wallet_balance);
    }

    public function test_a_wallet_amount_larger_than_the_order_is_clamped_to_the_order(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(1000);
        $product = $this->productForOrderTotal(700);

        $response = $this->placeOrder($customer, $product, [
            'use_wallet' => true,
            // More than this order costs — the excess must stay in the balance.
            'wallet_amount' => 1000,
        ]);

        $response->assertOk();

        $order = Order::where('order_number', $response->json('order_number'))->firstOrFail();

        $this->assertSame(700, (int) $order->wallet_amount);
        $this->assertSame(300, (int) $customer->fresh()->wallet_balance);
    }

    public function test_a_partially_covered_order_cannot_be_placed_without_a_payment_method(): void
    {
        $this->forbidGateway();

        $customer = $this->customer(380);
        $product = $this->productForOrderTotal(800);

        // 420 is still owed, so a payment method is not optional here.
        $this->placeOrder($customer, $product, ['use_wallet' => true])
            ->assertStatus(422);

        $this->assertSame(380, (int) $customer->fresh()->wallet_balance, 'A rejected checkout must not spend balance.');
        $this->assertSame(0, WalletTransaction::count());
        $this->assertSame(0, Order::count());
    }

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }
}
