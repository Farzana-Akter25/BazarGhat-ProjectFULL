<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// A return request carries what the customer wants inside it — the item replaced, or their money back — and approving it acts on that.
class ReturnResolutionAndReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_approving_a_refund_return_credits_the_balance_and_leaves_stock_alone(): void
    {
        [$customer, $admin, $product, $request] = $this->pendingReturn('Refund');

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('request.refundStatus', 'Refunded');

        // The customer asked for the refund to go to their balance, so approving the request credits it straight away — there is no second approval.
        $refund = Refund::where('return_request_id', $request->id)->firstOrFail();
        $this->assertSame(Refund::STATUS_COMPLETED, $refund->status);
        $this->assertSame((int) $refund->amount, (int) $customer->fresh()->wallet_balance);

        // Nothing has physically come back, so nothing goes on the shelf.
        $this->assertSame(5, (int) $product->fresh()->stock);
        $this->assertSame(0, (int) $product->fresh()->damaged_stock);
        $this->assertNull($request->fresh()->received_at);
    }

    public function test_approving_a_replacement_return_creates_the_replacement_order(): void
    {
        [, $admin, , $request] = $this->pendingReturn('Replacement');

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('request.resolution', 'Replacement');

        $fresh = $request->fresh();
        $this->assertNotNull($fresh->replacement_order_id);
        $this->assertTrue(Order::whereKey($fresh->replacement_order_id)->value('is_replacement'));

        // A replacement is not a refund — no money is queued against it.
        $this->assertSame(0, Refund::where('return_request_id', $request->id)->count());
    }

    public function test_receiving_the_goods_records_the_receipt_without_moving_stock(): void
    {
        [, $admin, $product, $request] = $this->pendingReturn('Refund', quantity: 3);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [
                'restock_quantity' => 2,
                'damaged_quantity' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('request.restockedQuantity', 2)
            ->assertJsonPath('request.damagedQuantity', 1);

        // The receipt is recorded, but returned goods go back on the shelf by hand — admin owns return inventory, so nothing is credited here.
        $this->assertNotNull($request->fresh()->received_at);
        $this->assertSame(5, (int) $product->fresh()->stock);
        $this->assertSame(0, (int) $product->fresh()->damaged_stock);

        $this->assertSame(0, StockTransaction::where('product_id', $product->id)
            ->whereIn('transaction_type', [
                StockTransaction::TYPE_RETURN_RECEIVED_RESTOCK,
                StockTransaction::TYPE_RETURN_RECEIVED_DAMAGED,
            ])->count());
    }

    public function test_the_goods_can_be_confirmed_received_without_counting_them(): void
    {
        [, $admin, $product, $request] = $this->pendingReturn('Refund');

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk();

        // Confirming receipt is the whole action: the counts are optional.
        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [])
            ->assertOk();

        $this->assertNotNull($request->fresh()->received_at);
        $this->assertSame(5, (int) $product->fresh()->stock);
    }

    public function test_goods_cannot_be_received_twice_or_before_approval(): void
    {
        [, $admin, $product, $request] = $this->pendingReturn('Refund');

        // Still Pending — there is nothing to check in yet.
        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [
                'restock_quantity' => 1,
                'damaged_quantity' => 0,
            ])
            ->assertStatus(422);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [
                'restock_quantity' => 1,
                'damaged_quantity' => 0,
            ])
            ->assertOk();

        // A return already confirmed cannot be confirmed a second time.
        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [
                'restock_quantity' => 1,
                'damaged_quantity' => 0,
            ])
            ->assertStatus(422);

        $this->assertSame(5, (int) $product->fresh()->stock);
    }

    public function test_more_units_cannot_be_checked_in_than_were_returned(): void
    {
        [, $admin, $product, $request] = $this->pendingReturn('Refund', quantity: 2);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/receive", [
                'restock_quantity' => 2,
                'damaged_quantity' => 1,
            ])
            ->assertStatus(422);

        $this->assertSame(5, (int) $product->fresh()->stock);
    }

    // A delivered, paid order with one returnable line, and a Pending return request against it stating what the customer wants.
    private function pendingReturn(string $wants, int $quantity = 1): array
    {
        $customer = User::create([
            'name' => 'Test Customer',
            'email' => 'cust' . uniqid() . '@example.com',
            'phone' => '01711' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);

        $admin = User::create([
            'name' => 'Test Admin',
            'email' => 'admin' . uniqid() . '@example.com',
            'phone' => '01611' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

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

        $total = 100 * $quantity;

        $order = Order::create([
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
            'paid_amount' => $total,
            'paid_at' => now(),
            'subtotal' => $total,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => $total,
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_price' => 100,
            'line_total' => $total,
        ]);

        $request = ReturnRequest::create([
            'request_number' => 'RET-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'customer_id' => $customer->id,
            'type' => 'Return',
            'requested_resolution' => $wants,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'price' => 100,
            'amount' => $total,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'preferred_refund_method' => Refund::METHOD_WALLET,
            'shipping_fee' => 0,
            'status' => 'Pending',
        ]);

        return [$customer, $admin, $product, $request];
    }
}
