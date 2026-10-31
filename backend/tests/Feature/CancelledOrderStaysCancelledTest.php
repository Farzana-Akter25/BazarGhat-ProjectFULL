<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

// An order that is already cancelled must stay cancelled.
class CancelledOrderStaysCancelledTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::create([
            'name' => 'Cancel Customer',
            'email' => 'cancel' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }

    private function product(int $stock): Product
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

    // A placed Cash on Delivery order, with the stock already taken as checkout does.
    private function placedOrder(User $customer, Product $product, int $quantity = 2): Order
    {
        $product->decrement('stock', $quantity);

        $order = Order::create([
            'order_number' => Order::generateNumber(),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Pending',
            'payment_status' => 'Unpaid',
            'payment_method' => 'Cash on Delivery',
            'subtotal' => 100 * $quantity,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => 100 * $quantity,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_price' => 100,
            'line_total' => 100 * $quantity,
        ]);

        return $order;
    }

    private function service(): OrderStatusService
    {
        return $this->app->make(OrderStatusService::class);
    }

    public function test_a_cancelled_order_keeps_the_cancelled_status(): void
    {
        $customer = $this->customer();
        $order = $this->placedOrder($customer, $this->product(20));

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('order.status', 'Cancelled');

        $this->assertSame('Cancelled', $order->fresh()->status);
    }

    public function test_the_cancel_endpoint_refuses_an_already_cancelled_order(): void
    {
        $customer = $this->customer();
        $order = $this->placedOrder($customer, $this->product(20));

        $this->service()->customerCancel($order, $customer);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel")
            ->assertStatus(422);

        $this->assertSame('Cancelled', $order->fresh()->status, 'The refused call must not change the status.');
    }

    public function test_cancelling_twice_never_gives_the_stock_back_twice(): void
    {
        $customer = $this->customer();
        $product = $this->product(20);
        $order = $this->placedOrder($customer, $product, 5);

        $this->assertSame(15, (int) $product->fresh()->stock, 'Checkout took 5.');

        $this->service()->customerCancel($order, $customer);
        $this->assertSame(20, (int) $product->fresh()->stock, 'Cancelling gave them back.');

        $this->actingAs($customer)->patchJson("/api/customer/orders/{$order->id}/cancel")->assertStatus(422);

        $this->assertSame(20, (int) $product->fresh()->stock, 'A refused second cancel adds nothing.');
    }

    public function test_the_service_rejects_a_second_cancellation(): void
    {
        $customer = $this->customer();
        $order = $this->placedOrder($customer, $this->product(20));

        $this->service()->customerCancel($order, $customer);

        $this->expectException(RuntimeException::class);
        $this->service()->customerCancel($order->fresh(), $customer);
    }

    public function test_the_refund_options_endpoint_reports_a_cancelled_order_as_not_cancellable(): void
    {
        $customer = $this->customer();
        $order = $this->placedOrder($customer, $this->product(20));

        $this->service()->customerCancel($order, $customer);

        $this->actingAs($customer)
            ->getJson("/api/customer/orders/{$order->id}/refund-options")
            ->assertOk()
            ->assertJsonPath('cancellable', false);
    }

    public function test_the_order_list_shows_the_cancelled_order_as_cancelled(): void
    {
        $customer = $this->customer();
        $order = $this->placedOrder($customer, $this->product(20));

        $this->service()->customerCancel($order, $customer);

        $response = $this->actingAs($customer)->getJson('/api/customer/orders')->assertOk();

        $listed = collect($response->json('orders'))->firstWhere('orderId', $order->id);

        $this->assertNotNull($listed, 'The cancelled order still belongs in the history.');
        $this->assertSame('Cancelled', $listed['status']);
        $this->assertSame('customer', $listed['cancelledBy']);
    }
}
