<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// An order is asked about once: the customer submits either a return or a refund against it, never both and never twice.
class OneRequestPerOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_second_request_on_the_same_order_is_refused(): void
    {
        Storage::fake('public');
        [$customer, $order, $item] = $this->deliveredOrder();

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', $this->returnPayload($order, $item))
            ->assertCreated();

        // Same kind again.
        $this->actingAs($customer)
            ->postJson('/api/customer/returns', $this->returnPayload($order, $item))
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'already been submitted'));

        // And the other kind, which used to be unguarded in both directions.
        $this->actingAs($customer)
            ->postJson('/api/customer/returns', [
                'order_id' => $order->id,
                'type' => 'Refund',
                'reason' => 'Changed my mind',
            ])
            ->assertStatus(422);

        $this->assertSame(1, ReturnRequest::where('order_id', $order->id)->count());
    }

    public function test_a_refused_request_stores_no_photos(): void
    {
        Storage::fake('public');
        [$customer, $order, $item] = $this->deliveredOrder();

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', $this->returnPayload($order, $item))
            ->assertCreated();

        $storedAfterFirst = count(Storage::disk('public')->allFiles('returns'));

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', $this->returnPayload($order, $item))
            ->assertStatus(422);

        // The guard runs before the upload, so the refused attempt leaves nothing behind.
        $this->assertCount($storedAfterFirst, Storage::disk('public')->allFiles('returns'));
    }

    public function test_the_order_reads_as_submitted_while_the_request_is_open(): void
    {
        Storage::fake('public');
        [$customer, $order, $item] = $this->deliveredOrder();

        // Nothing asked yet: no request on the order, so the panel still offers the form.
        $this->actingAs($customer)
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.returnRequest', null);

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', $this->returnPayload($order, $item))
            ->assertCreated();

        $this->actingAs($customer)
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.returnRequest.statusLabel', 'Return Submitted')
            ->assertJsonPath('orders.0.returnRequest.isOpen', true)
            // The order itself has not moved — only what the customer is waiting on.
            ->assertJsonPath('orders.0.status', 'Delivered');

        // Once the decision lands, the label steps aside and the order's own status carries the outcome.
        ReturnRequest::where('order_id', $order->id)->update(['status' => 'Rejected']);

        $this->actingAs($customer)
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.returnRequest.statusLabel', null)
            ->assertJsonPath('orders.0.returnRequest.isOpen', false);
    }

    public function test_a_refund_request_reads_as_refund_submitted(): void
    {
        [$customer, $order] = $this->cancelledOnlineOrder();

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', [
                'order_id' => $order->id,
                'type' => 'Refund',
                'reason' => 'Order cancelled',
            ])
            ->assertCreated();

        $this->actingAs($customer)
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.returnRequest.statusLabel', 'Refund Submitted');
    }

    public function test_a_return_asking_for_the_money_back_reads_as_refund_submitted(): void
    {
        Storage::fake('public');
        [$customer, $order, $item] = $this->deliveredOrder();

        $this->actingAs($customer)
            ->postJson('/api/customer/returns', array_merge($this->returnPayload($order, $item), ['resolution' => 'Refund']))
            ->assertCreated();

        $this->actingAs($customer)
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.returnRequest.type', 'Return')
            ->assertJsonPath('orders.0.returnRequest.statusLabel', 'Refund Submitted');
    }

    private function returnPayload(Order $order, OrderItem $item): array
    {
        return [
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'type' => 'Return',
            'resolution' => 'Replacement',
            'reason' => 'Damaged or leaking product',
            // create() rather than image(): the same mime the validator checks, without needing the GD extension to draw one.
            'photos' => [UploadedFile::fake()->create('evidence.jpg', 10, 'image/jpeg')],
        ];
    }

    private function deliveredOrder(): array
    {
        $customer = $this->customer();

        $product = Product::create([
            'name' => 'Potato Cracker',
            'category' => 'Snacks',
            'unit' => 'pack',
            'price' => 100,
            'original_price' => 100,
            'discount' => 0,
            'stock' => 5,
            'damaged_stock' => 0,
            'status' => 'Active',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'payment_method' => 'Cash on Delivery',
            'subtotal' => 100,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => 100,
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'unit_price' => 100,
            'line_total' => 100,
        ]);

        return [$customer, $order, $item];
    }

    // An order the customer cancelled after paying online — the refund case.
    private function cancelledOnlineOrder(): array
    {
        $customer = $this->customer();

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => 'Cancelled',
            'cancelled_by' => 'customer',
            'payment_status' => 'Paid',
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'transaction_id' => 'TXN-' . uniqid(),
            'subtotal' => 100,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => 100,
        ]);

        return [$customer, $order];
    }

    private function customer(): User
    {
        return User::create([
            'name' => 'Test Customer',
            'email' => 'cust' . uniqid() . '@example.com',
            'phone' => '017' . random_int(10000000, 99999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'Active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }
}
