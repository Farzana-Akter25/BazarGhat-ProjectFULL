<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Cancelling an order puts its units back on the shelf.
class CancelRestoresStockTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::create([
            'name' => 'Stock Customer',
            'email' => 'stock' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Stock Admin',
            'email' => 'sadmin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
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

    // An order for $quantity units, with the stock already taken as checkout does.
    private function placedOrder(User $customer, Product $product, int $quantity): Order
    {
        $product->decrement('stock', $quantity);

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
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

    public function test_customer_cancelling_puts_the_units_back_on_the_shelf(): void
    {
        $customer = $this->customer();
        $product = $this->product(50);
        $order = $this->placedOrder($customer, $product, 8);

        $this->assertSame(42, (int) $product->fresh()->stock, 'Checkout took 8.');

        $this->service()->customerCancel($order, $customer);

        $this->assertSame(50, (int) $product->fresh()->stock, 'Cancelling gave them back.');
    }

    public function test_admin_cancelling_puts_the_units_back_on_the_shelf(): void
    {
        $customer = $this->customer();
        $product = $this->product(30);
        $order = $this->placedOrder($customer, $product, 5);

        $this->service()->adminCancel($order, $this->admin());

        $this->assertSame(30, (int) $product->fresh()->stock);
    }

    public function test_cancelling_restores_every_line_of_a_multi_item_order(): void
    {
        $customer = $this->customer();
        $rice = $this->product(40);
        $oil = $this->product(25);

        $order = $this->placedOrder($customer, $rice, 6);
        $oil->decrement('stock', 4);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $oil->id,
            'product_name' => $oil->name,
            'quantity' => 4,
            'unit_price' => 100,
            'line_total' => 400,
        ]);

        $this->service()->customerCancel($order->fresh(), $customer);

        $this->assertSame(40, (int) $rice->fresh()->stock);
        $this->assertSame(25, (int) $oil->fresh()->stock);
    }

    public function test_the_customer_cancel_endpoint_restores_stock(): void
    {
        $customer = $this->customer();
        $product = $this->product(20);
        $order = $this->placedOrder($customer, $product, 3);

        $this->actingAs($customer)
            ->patchJson("/api/customer/orders/{$order->id}/cancel")
            ->assertOk();

        $this->assertSame(20, (int) $product->fresh()->stock);
    }
}
