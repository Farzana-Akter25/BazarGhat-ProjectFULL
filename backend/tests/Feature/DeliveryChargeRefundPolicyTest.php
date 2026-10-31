<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The Refund & Cancellation Policy's two amount rules.
class DeliveryChargeRefundPolicyTest extends TestCase
{
    use RefreshDatabase;

    private const DELIVERY_CHARGE = 80;

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

    // A paid SSLCommerz order built the way checkout builds one.
    private function paidOrder(User $customer, int $total, array $overrides = [], int $walletUsed = 0, bool $freeDelivery = false): Order
    {
        $subtotal = $freeDelivery ? $total : $total - self::DELIVERY_CHARGE;

        return Order::create(array_merge([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'transaction_id' => 'TXN-' . uniqid(),
            'gateway_transaction_id' => 'BANK-' . uniqid(),
            'paid_amount' => $total - $walletUsed,
            'paid_at' => now(),
            'subtotal' => $subtotal,
            'discount' => $freeDelivery ? self::DELIVERY_CHARGE : 0,
            'wallet_amount' => $walletUsed,
            'total_amount' => $total,
        ], $overrides));
    }

    private function returnRequest(Order $order, User $customer, int $amount): ReturnRequest
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
            'requested_resolution' => 'Refund',
            'product_name' => 'Test Product',
            'quantity' => 1,
            'price' => $amount,
            'amount' => $amount,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'shipping_fee' => 0,
            'status' => 'Approved',
        ]);
    }

    private function refunds(): RefundService
    {
        return $this->app->make(RefundService::class);
    }

    public function test_cancelling_before_assignment_refunds_the_full_paid_amount(): void
    {
        $customer = $this->customer(300);
        $order = $this->paidOrder($customer, 1000, ['status' => 'Confirmed']);

        $this->app->make(OrderStatusService::class)
            ->customerCancel($order, $customer, null, Refund::METHOD_WALLET);

        $refunds = Refund::where('order_id', $order->id)->get();

        $this->assertSame(1000, (int) $refunds->sum('amount'), 'No delivery charge is deducted before assignment.');
        $this->assertSame(1300, (int) $customer->fresh()->wallet_balance);
    }

    public function test_a_refund_after_delivery_deducts_the_delivery_charge(): void
    {
        $customer = $this->customer(300);
        $order = $this->paidOrder($customer, 1000);
        $request = $this->returnRequest($order, $customer, 1000);

        $context = $this->refunds()->returnRefundContext($request);

        $this->assertSame(self::DELIVERY_CHARGE, $context['delivery_charge']);
        $this->assertSame(920, $context['refundable_amount']);

        $this->refunds()->openReturnRefund($request, Refund::METHOD_WALLET, $customer, 'customer');
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();

        $this->assertSame(920, (int) $refund->fresh()->amount);
        $this->assertSame(Refund::STATUS_COMPLETED, $refund->fresh()->status);
        $this->assertSame(1220, (int) $customer->fresh()->wallet_balance, '300 already there, plus 920 refunded.');
    }

    public function test_an_order_with_free_delivery_has_nothing_deducted(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 920, [], 0, true);
        $request = $this->returnRequest($order, $customer, 920);

        $context = $this->refunds()->returnRefundContext($request);

        $this->assertSame(0, $context['delivery_charge']);
        $this->assertSame(920, $context['refundable_amount']);
    }

    public function test_the_delivery_charge_is_deducted_only_once_across_several_returns(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 1000);

        $first = $this->returnRequest($order, $customer, 600);
        $this->refunds()->openReturnRefund($first, Refund::METHOD_WALLET, $customer, 'customer');

        $second = $this->returnRequest($order, $customer, 400);

        // 1000 paid, 600 already refunded, 80 kept for delivery: 320 left.
        $this->assertSame(320, $this->refunds()->returnRefundContext($second)['refundable_amount']);
    }

    public function test_a_split_payment_never_sends_the_wallet_part_to_sslcommerz(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 1000, [], 300);
        $request = $this->returnRequest($order, $customer, 1000);

        $created = $this->refunds()->openReturnRefund($request, Refund::METHOD_ORIGINAL_PAYMENT, $customer, 'customer');

        $this->assertSame(920, (int) $created->sum('amount'));
        $this->assertSame(700, (int) $created->where('refund_method', Refund::METHOD_ORIGINAL_PAYMENT)->sum('amount'), 'Only what SSLCommerz captured can go back through it.');
        $this->assertSame(220, (int) $created->where('refund_method', Refund::METHOD_WALLET)->sum('amount'));
    }

    public function test_a_delivered_cash_on_delivery_refund_follows_the_same_policy(): void
    {
        $customer = $this->customer();
        // Delivered: the rider collected the cash, so the order is Paid.
        $order = $this->paidOrder($customer, 1000, [
            'payment_method' => 'Cash on Delivery',
            'payment_gateway' => null,
            'transaction_id' => null,
            'gateway_transaction_id' => null,
            'paid_amount' => 0,
            'paid_at' => null,
        ]);
        $request = $this->returnRequest($order, $customer, 1000);

        $context = $this->refunds()->returnRefundContext($request);

        $this->assertSame(self::DELIVERY_CHARGE, $context['delivery_charge']);
        $this->assertSame(920, $context['refundable_amount']);
        $this->assertSame([Refund::METHOD_WALLET], $context['methods'], 'Cash has no gateway to go back through.');
    }

    public function test_cancelling_an_unpaid_cash_on_delivery_order_offers_no_refund(): void
    {
        $customer = $this->customer();
        $order = $this->paidOrder($customer, 1000, [
            'status' => 'Pending',
            'payment_status' => 'Unpaid',
            'payment_method' => 'Cash on Delivery',
            'payment_gateway' => null,
            'transaction_id' => null,
            'gateway_transaction_id' => null,
            'paid_amount' => 0,
            'paid_at' => null,
        ]);

        $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertOk()
            ->assertJsonPath('isCod', true)
            ->assertJsonPath('refundable', false)
            ->assertJsonPath('methods', []);

        $this->app->make(OrderStatusService::class)->customerCancel($order, $customer);

        $this->assertSame('Unpaid', $order->fresh()->payment_status);
        $this->assertSame(0, Refund::where('order_id', $order->id)->count());
        $this->assertSame(0, ReturnRequest::where('order_id', $order->id)->count());
    }

    public function test_the_customer_refund_options_report_the_delivery_charge(): void
    {
        $customer = $this->customer();
        $delivered = $this->paidOrder($customer, 1000);
        $cancelled = $this->paidOrder($customer, 1000, ['status' => 'Cancelled', 'cancelled_by' => 'customer']);

        $this->actingAs($customer)
            ->getJson("/api/customer/returns/refund-options/{$delivered->id}")
            ->assertOk()
            ->assertJsonPath('deliveryCharge', self::DELIVERY_CHARGE)
            ->assertJsonPath('refundableAmount', 920);

        $this->actingAs($customer)
            ->getJson("/api/customer/returns/refund-options/{$cancelled->id}")
            ->assertOk()
            ->assertJsonPath('deliveryCharge', 0)
            ->assertJsonPath('refundableAmount', 1000);
    }
}
