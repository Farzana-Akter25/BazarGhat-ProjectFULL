<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Refund;
use App\Models\User;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The arithmetic the business report has to get right, pinned so a later change to a section can't quietly break a total: 1.
class BusinessReportTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::create([
            'name' => 'Report Customer',
            'email' => 'rpt' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }

    private function product(): Product
    {
        return Product::create([
            'name' => 'Report Rice',
            'description' => 'Test',
            'category' => 'Grocery',
            'unit' => '1kg',
            'price' => 100,
            'stock' => 50,
            'status' => 'active',
        ]);
    }

    private function order(User $customer, array $attributes = []): Order
    {
        $order = Order::create(array_merge([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => 'Dhaka',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'subtotal' => 800,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => 800,
        ], $attributes));

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product()->id,
            'product_name' => 'Report Rice',
            'unit_price' => (int) $order->subtotal,
            'quantity' => 1,
            'line_total' => (int) $order->subtotal,
        ]);

        return $order->fresh();
    }

    private function report(): array
    {
        $to = CarbonImmutable::now()->endOfDay();

        return app(ReportService::class)->build($to->subDays(6)->startOfDay(), $to, '7 Days Sales Report', null);
    }

    public function test_a_wallet_and_online_split_payment_is_never_counted_twice(): void
    {
        $customer = $this->customer();

        // The scenario the rules call out: 800 total, 300 from balance, 500 online.
        $this->order($customer, ['wallet_amount' => 300]);

        $payments = $this->report()['payments'];

        $this->assertSame(500, $payments['totalOnline'], 'Only the gateway share is online payment.');
        $this->assertSame(300, $payments['totalWallet'], 'The balance share is reported as wallet.');
        $this->assertSame(800, $payments['totalOrderValue'], 'The two shares add back up to the order.');

        $charged = array_sum(array_column($payments['rows'], 'amount'));
        $this->assertSame(800, $charged, 'The method rows total the order once, not 1600.');
    }

    public function test_an_online_order_that_was_never_paid_is_not_counted_as_business(): void
    {
        $customer = $this->customer();
        $this->order($customer, ['payment_status' => 'Unpaid', 'status' => 'Pending']);

        $report = $this->report();

        $this->assertSame(0, $report['orders']['total'], 'An abandoned online order is not a placed order.');
        $this->assertSame(0, $report['sales']['grossProductSales']);
        $this->assertSame(0, $report['payments']['totalOrderValue']);
    }

    public function test_a_cash_order_only_counts_as_collected_once_it_says_it_was_paid(): void
    {
        $customer = $this->customer();
        $this->order($customer, [
            'payment_method' => 'Cash on Delivery',
            'payment_gateway' => null,
            'payment_status' => 'Unpaid',
            'status' => 'Cancelled',
        ]);

        $report = $this->report();

        $this->assertSame(1, $report['orders']['total'], 'The cancelled cash order is still listed.');
        $this->assertSame(0, $report['payments']['totalCod'], 'No cash was handed over, so none was collected.');
    }

    public function test_a_completed_refund_reduces_net_sales_and_is_not_a_second_sale(): void
    {
        $customer = $this->customer();
        // subtotal 800, delivery 100 -> total 900
        $order = $this->order($customer, ['total_amount' => 900]);

        Refund::create([
            'refund_number' => 'RF-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'amount' => 200,
            'refund_method' => 'ORIGINAL_PAYMENT',
            'source' => 'POST_DELIVERY',
            'idempotency_key' => 'rpt-' . uniqid(),
            'status' => Refund::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        $sales = $this->report()['sales'];

        $this->assertSame(800, $sales['grossProductSales']);
        $this->assertSame(100, $sales['deliveryFee']);
        $this->assertSame(200, $sales['totalRefund']);
        // 800 - 0 + 100 - 200
        $this->assertSame(700, $sales['netSales'], 'The refund comes off net sales rather than adding to it.');
    }

    public function test_a_refund_still_in_flight_is_not_counted_as_money_returned(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);

        Refund::create([
            'refund_number' => 'RF-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'amount' => 200,
            'refund_method' => 'WALLET',
            'source' => 'POST_DELIVERY',
            'idempotency_key' => 'rpt-' . uniqid(),
            'status' => Refund::STATUS_PROCESSING,
        ]);

        $this->assertSame(0, $this->report()['sales']['totalRefund']);
    }

    public function test_an_empty_period_reports_zeros_rather_than_failing(): void
    {
        $report = $this->report();

        $this->assertSame(0, $report['orders']['total']);
        $this->assertSame(0, $report['sales']['netSales']);
        $this->assertSame(0.0, $report['kpis']['completionRate'], 'Rates divide safely by an empty period.');
        $this->assertSame(0.0, $report['kpis']['returnRate']);
        $this->assertSame(0, $report['kpis']['averageOrderValue']);
        $this->assertSame([], $report['products']);
        // every day in the range is still listed, just with nothing in it
        $this->assertCount(7, $report['dailySales']);
    }

    public function test_the_report_totals_match_the_orders_they_are_built_from(): void
    {
        $customer = $this->customer();
        $this->order($customer, ['subtotal' => 500, 'discount' => 50, 'total_amount' => 530]);
        $this->order($customer, ['subtotal' => 300, 'discount' => 0, 'total_amount' => 380, 'status' => 'Cancelled', 'payment_status' => 'Unpaid', 'payment_gateway' => null, 'payment_method' => 'Cash on Delivery']);

        $report = $this->report();

        // The cancelled order sold nothing, so none of its money reaches a sales figure.
        $this->assertSame(500, $report['sales']['grossProductSales'], 'Only the order that was not cancelled.');
        $this->assertSame(50, $report['sales']['totalDiscount']);
        // 530 - 500 + 50, the delivery on that same order
        $this->assertSame(80, $report['sales']['deliveryFee']);
        $this->assertSame(530, $report['sales']['netSales'], '500 - 50 + 80');
        // Order value and the order count still cover both: one of them was simply cancelled.
        $this->assertSame(910, $report['orders']['totalAmount'], '530 + 380');
        $this->assertSame(2, $report['orders']['total']);
        $this->assertSame(1, $report['customers']['ordered'], 'Both orders belong to one customer.');
    }
}
