<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\SslCommerzService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

// Which SSLCommerz channel took the money, and whether every screen says so.
class PaymentChannelTest extends TestCase
{
    use RefreshDatabase;

    private const DELIVERY_FEE = 80;

    private function customer(): User
    {
        return User::create([
            'name' => 'Test Customer',
            'email' => 'cust' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }

    private function product(int $price = 100): Product
    {
        return Product::create([
            'name' => 'Test Product ' . uniqid(),
            'description' => 'For payment channel tests',
            'price' => $price,
            'stock' => 50,
            'category' => 'Grocery',
            'unit' => '1kg',
            'status' => 'active',
        ]);
    }

    // Places an online order and settles it with the validation response SSLCommerz would send for $cardType.
    private function payOnlineWith(User $customer, string $cardType, array $extra = []): Order
    {
        $product = $this->product();

        $gateway = Mockery::mock(SslCommerzService::class);
        $gateway->shouldReceive('initiatePayment')->andReturn('https://sslcommerz.test/session/abc');
        $this->app->instance(SslCommerzService::class, $gateway);

        $orderNumber = $this->actingAs($customer)->postJson('/api/customer/checkout', [
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'payment_method' => 'online',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->json('order_number');

        $validation = Mockery::mock(SslCommerzService::class);
        $validation->shouldReceive('validatePayment')->andReturn(array_merge([
            'status' => 'VALID',
            'amount' => 100 + self::DELIVERY_FEE,
            'tran_id' => $orderNumber,
            'bank_tran_id' => 'BANK-' . uniqid(),
            'val_id' => 'VAL-' . uniqid(),
            'card_type' => $cardType,
        ], $extra));
        $this->app->instance(SslCommerzService::class, $validation);

        $this->post('/api/payment/sslcommerz/success', [
            'tran_id' => $orderNumber,
            'val_id' => 'VAL-1',
        ]);

        return Order::where('order_number', $orderNumber)->firstOrFail();
    }

    // The raw gateway value, and what it is stored as

    // card_type arrives as "BRAND-Issuer" in whatever casing SSLCommerz feels like.
    public function test_every_gateway_channel_is_recorded_under_a_readable_name(): void
    {
        $cases = [
            'BKASH-BKash' => 'bKash',
            'bkash' => 'bKash',
            'NAGAD-Nagad' => 'Nagad',
            // Rocket is DBBL's wallet and never reports its own name first.
            'DBBLMOBILEBANKING-Rocket' => 'Rocket',
            'DBBL MOBILE BANKING' => 'Rocket',
            'UPAY-Upay' => 'Upay',
            'VISA-Dutch Bangla Bank' => 'Visa Card',
            'MASTER-City Bank' => 'Mastercard',
            'AMEX-City Bank' => 'American Express',
            'CITYTOUCH-City Touch' => 'City Touch',
            'CELLFIN-CellFin' => 'CellFin',
            'OKWALLET-OK Wallet' => 'OK Wallet',
            'INTERNETBANK' => 'Internet Banking',
        ];

        foreach ($cases as $raw => $expected) {
            $this->assertSame(
                $expected,
                Order::paymentChannelLabel($raw),
                "SSLCommerz's \"{$raw}\" should be recorded as \"{$expected}\".",
            );
        }
    }

    // An issuer no rule covers keeps its own name.
    public function test_an_unmapped_channel_keeps_the_name_the_gateway_gave_it(): void
    {
        // Shouted in full caps by the gateway — printable on an invoice.
        $this->assertSame('Some New Wallet', Order::paymentChannelLabel('SOME-NEW-WALLET'));

        // "BRAND-Issuer" saying the same word twice collapses to the spelling that was meant to be read.
        $this->assertSame('XyzPay', Order::paymentChannelLabel('XYZPAY-XyzPay'));
    }

    // No channel is not a channel: an unpaid order must not invent one.
    public function test_an_order_with_no_channel_reads_as_the_gateway_alone(): void
    {
        $order = new Order(['payment_method' => 'SSLCommerz']);

        $this->assertNull($order->paymentChannelName());
        $this->assertSame('SSLCommerz', $order->paymentMethodLabel());
    }

    // The payment callback

    public function test_the_channel_is_captured_from_the_validated_payment(): void
    {
        $order = $this->payOnlineWith($this->customer(), 'BKASH-BKash');

        $this->assertSame('Paid', $order->payment_status);
        $this->assertSame('bKash', $order->payment_channel);
        $this->assertSame('SSLCOMMERZ', $order->payment_gateway);
        $this->assertSame('SSLCommerz (bKash)', $order->paymentMethodLabel());
    }

    // SSLCommerz sends the keys it does not populate through as empty strings, not as missing keys.
    public function test_an_empty_card_type_falls_through_to_the_next_field(): void
    {
        $order = $this->payOnlineWith($this->customer(), '', [
            'card_issuer' => '',
            'card_brand' => 'MOBILEBANKING',
        ]);

        $this->assertSame('Mobile Banking', $order->payment_channel);
    }

    // The status trail has to name the channel, not just the gateway.
    public function test_the_status_history_names_the_channel(): void
    {
        $order = $this->payOnlineWith($this->customer(), 'NAGAD-Nagad');

        $this->assertSame(1, $order->statusHistories()
            ->where('note', 'like', '%SSLCommerz (Nagad)%')
            ->count());
    }

    // Everywhere the payment is named

    public function test_the_invoice_names_the_channel(): void
    {
        $customer = $this->customer();
        $order = $this->payOnlineWith($customer, 'VISA-Dutch Bangla Bank');

        $this->actingAs($customer)
            ->getJson("/api/customer/invoices/{$order->id}")
            ->assertOk()
            ->assertJsonPath('invoice.paymentMethod', 'SSLCommerz (Visa Card)');
    }

    public function test_the_customer_order_list_carries_the_channel_and_the_full_label(): void
    {
        $customer = $this->customer();
        $order = $this->payOnlineWith($customer, 'DBBLMOBILEBANKING-Rocket');

        $row = collect($this->actingAs($customer)->getJson('/api/customer/orders')->json('orders'))
            ->firstWhere('id', $order->order_number);

        $this->assertSame('Rocket', $row['paymentChannel']);
        $this->assertSame('SSLCommerz (Rocket)', $row['paymentLabel']);
        // The raw method stays alongside them: refund eligibility keys on it.
        $this->assertSame('SSLCommerz', $row['paymentMethod']);
    }

    public function test_the_admin_order_list_names_the_channel(): void
    {
        $order = $this->payOnlineWith($this->customer(), 'UPAY-Upay');

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin' . uniqid() . '@example.com',
            'phone' => '01811' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $row = collect($this->actingAs($admin)->getJson('/api/admin/orders')->json('orders'))
            ->firstWhere('id', $order->order_number);

        $this->assertSame('SSLCommerz (Upay)', $row['paymentMethod']);
        $this->assertSame('Upay', $row['paymentChannel']);
    }

    // A refund "to the original payment method" is a promise about a specific account, so the refund options the cancel dialog is built from have to say which channel that is.
    public function test_refund_options_name_the_channel_the_money_came_through(): void
    {
        $customer = $this->customer();
        $order = $this->payOnlineWith($customer, 'BKASH-BKash');

        $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertOk()
            ->assertJsonPath('paymentMethod', 'SSLCommerz (bKash)')
            ->assertJsonPath('paymentChannel', 'bKash');
    }

    // Cash on Delivery has no gateway and must not grow a channel suffix.
    public function test_cash_on_delivery_is_left_alone(): void
    {
        $order = new Order([
            'payment_method' => 'Cash on Delivery',
            'payment_channel' => null,
        ]);

        $this->assertSame('Cash on Delivery', $order->paymentMethodLabel());
    }

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }
}
