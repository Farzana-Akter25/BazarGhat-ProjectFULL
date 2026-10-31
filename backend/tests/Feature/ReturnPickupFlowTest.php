<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryProfile;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Approving a return for replacement does not end the original order: its goods are still at the customer's address and are now owed back.
class ReturnPickupFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_approving_a_replacement_moves_the_original_order_onto_the_return_branch(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement();

        $this->assertSame('Return Approved', $order->fresh()->status);

        // The change is on the invoice, not just on the order row.
        $this->actingAs($admin)
            ->getJson("/api/admin/invoices/{$order->id}")
            ->assertOk()
            ->assertJsonPath('invoice.orderStatus', 'Return Approved');

        // The replacement order is issued an invoice of its own.
        $replacementId = $request->fresh()->replacement_order_id;
        $this->assertNotNull(Invoice::where('order_id', $replacementId)->first());

        $this->actingAs($admin)
            ->getJson("/api/admin/invoices/{$replacementId}")
            ->assertOk()
            ->assertJsonPath('invoice.orderId', Order::whereKey($replacementId)->value('order_number'));
    }

    public function test_an_order_awaiting_collection_can_be_assigned_again(): void
    {
        [$admin, $order] = $this->approvedReplacement();
        [$rider, $profile] = $this->rider();

        // The order already has a finished delivery assignment against it; that must not count as an active one and block the collection run.
        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated()
            ->assertJsonPath('assignment.type', 'Return Pickup');

        $this->assertSame('Return Pickup Assigned', $order->fresh()->status);

        $assignment = DeliveryAssignment::where('order_id', $order->id)
            ->where('type', 'Return Pickup')
            ->firstOrFail();

        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/accept")
            ->assertOk();

        // A collection run has no delivery steps to walk through.
        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/status", ['status' => 'Picked Up'])
            ->assertStatus(422);

        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/status", ['status' => 'Return Picked Up'])
            ->assertOk();

        $this->assertSame('Returned', $order->fresh()->status);
        $this->assertSame('Return Picked Up', $assignment->fresh()->rider_status);

        $this->actingAs($admin)
            ->getJson("/api/admin/invoices/{$order->id}")
            ->assertOk()
            ->assertJsonPath('invoice.orderStatus', 'Returned');

        // The branch has ended — the order is not handed to a rider a third time.
        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertStatus(422);
    }

    public function test_a_failed_collection_goes_back_for_reassignment_not_back_into_delivery(): void
    {
        [$admin, $order] = $this->approvedReplacement();
        [$rider, $profile] = $this->rider();

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated();

        $assignment = DeliveryAssignment::where('order_id', $order->id)
            ->where('type', 'Return Pickup')
            ->firstOrFail();

        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/reject", [
                'reason' => 'Nobody answered the door.',
            ])
            ->assertOk();

        // "Confirmed" here would put a delivered order back in the delivery queue.
        $this->assertSame('Return Approved', $order->fresh()->status);

        // And it can be handed straight to someone else.
        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated();

        $this->assertSame('Return Pickup Assigned', $order->fresh()->status);
    }

    // The goods are what the branch is about, and a customer who wants their money back is returning the item just the same.
    public function test_a_return_approved_for_a_refund_is_collected_the_same_way(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement(resolution: 'Refund');
        [, $profile] = $this->rider();

        $this->assertSame('Return Approved', $order->fresh()->status);

        // The refund is raised and waiting on its own approval; that is a separate decision from fetching the goods, and neither blocks the other.
        $this->assertSame('Refund', $request->fresh()->resolution);

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated()
            ->assertJsonPath('assignment.type', 'Return Pickup')
            // The board names the request it was raised on, so a collection run can be found by the number the admin approved it under.
            ->assertJsonPath('assignment.returnRequestId', $request->request_number);

        $this->assertSame('Return Pickup Assigned', $order->fresh()->status);

        // And the Return & Refund screen carries the run, so the whole record of the return lives on the screen the return was approved on.
        $this->actingAs($admin)
            ->getJson('/api/admin/returns')
            ->assertOk()
            ->assertJsonPath('requests.0.pickup.rider', $profile->user->name)
            ->assertJsonPath('requests.0.pickup.riderStatus', 'Assigned');
    }

    // An order awaiting collection is reachable by the return request number, which is the id the admin has in front of them on the Return & Refund screen.
    public function test_an_order_awaiting_collection_carries_its_return_request_number(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement(resolution: 'Refund');

        $this->actingAs($admin)
            ->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $order->order_number)
            ->assertJsonPath('orders.0.status', 'Return Approved')
            ->assertJsonPath('orders.0.returnRequestId', $request->request_number);
    }

    // Withdrawing the approval withdraws the collection with it: a refused request must not leave a delivered order queued for a rider forever.
    public function test_rejecting_an_approved_return_takes_the_order_back_off_the_branch(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement(resolution: 'Refund');

        $this->assertSame('Return Approved', $order->fresh()->status);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", [
                'status' => 'Rejected',
                'admin_note' => 'The item was used.',
            ])
            ->assertOk();

        $this->assertSame('Delivered', $order->fresh()->status);

        // And it is no longer offered to a rider as a collection.
        [, $profile] = $this->rider();

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertStatus(422);
    }

    // Once a rider is out, or the goods are already back, the collection is a fact — a later rejection of the request cannot rewind it.
    public function test_a_rejection_never_rewinds_a_collection_already_under_way(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement(resolution: 'Refund');
        [, $profile] = $this->rider();

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Rejected'])
            ->assertOk();

        $this->assertSame('Return Pickup Assigned', $order->fresh()->status);
    }

    // A replacement is an exchange, not a sale: the customer paid for these goods once, on the order being replaced, and the rider must not collect the money a second time at the door.
    public function test_a_replacement_is_not_charged_for_a_second_time(): void
    {
        [, , $request] = $this->approvedReplacement();

        $replacement = Order::whereKey($request->fresh()->replacement_order_id)->firstOrFail();

        // The original was Cash on Delivery and was settled at the door when it was delivered, so the replacement carries that settlement over.
        $this->assertTrue($replacement->is_replacement);
        $this->assertSame('Cash on Delivery', $replacement->payment_method);
        $this->assertSame('Paid', $replacement->payment_status);
    }

    // The replacement goes out on the collection run and is swapped for the returned goods at the door, so collecting the return is also what delivers it.
    public function test_collecting_the_return_hands_over_the_replacement(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement();
        [$rider, $profile] = $this->rider();

        $replacementId = $request->fresh()->replacement_order_id;
        $this->assertSame('Confirmed', Order::whereKey($replacementId)->value('status'));

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated();

        $assignment = DeliveryAssignment::where('order_id', $order->id)
            ->where('type', 'Return Pickup')
            ->firstOrFail();

        // The rider is told what to load before setting off — the swap cannot happen if nobody put the replacement on the van.
        $this->actingAs($rider)
            ->getJson('/api/delivery/assigned-orders')
            ->assertOk()
            ->assertJsonPath('orders.0.replacement.orderNumber', Order::whereKey($replacementId)->value('order_number'));

        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/accept")
            ->assertOk();

        $this->actingAs($rider)
            ->patchJson("/api/delivery/assigned-orders/{$assignment->id}/status", ['status' => 'Return Picked Up'])
            ->assertOk();

        $replacement = Order::whereKey($replacementId)->firstOrFail();

        $this->assertSame('Returned', $order->fresh()->status);
        $this->assertSame('Delivered', $replacement->status);
        $this->assertSame('Paid', $replacement->payment_status);

        // Delivered, so the customer is no longer offered a Cancel on it.
        $this->assertNotContains($replacement->status, OrderStatusService::CUSTOMER_CANCELLABLE);

        // And the run that carried it stops telling the rider to carry it.
        $this->actingAs($rider)
            ->getJson('/api/delivery/assigned-orders')
            ->assertOk()
            ->assertJsonPath('orders.0.replacement', null);
    }

    // A replacement has no delivery run of its own to assign — it travels on the collection run for the order it replaces.
    public function test_a_replacement_is_never_given_a_delivery_run_of_its_own(): void
    {
        [$admin, , $request] = $this->approvedReplacement();
        [, $profile] = $this->rider();

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $request->fresh()->replacement_order_id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertStatus(422);
    }

    // Withdrawing the approval takes the replacement with it.
    public function test_withdrawing_the_approval_calls_off_the_replacement_too(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement();

        $replacementId = $request->fresh()->replacement_order_id;
        $this->assertSame('Confirmed', Order::whereKey($replacementId)->value('status'));
        $this->assertSame(4, Product::firstOrFail()->stock);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Rejected'])
            ->assertOk();

        $replacement = Order::whereKey($replacementId)->firstOrFail();

        $this->assertSame('Delivered', $order->fresh()->status);
        $this->assertSame('Cancelled', $replacement->status);

        // No Cancel button left on it, and its unit is back on the shelf.
        $this->assertNotContains($replacement->status, OrderStatusService::CUSTOMER_CANCELLABLE);
        $this->assertSame(5, Product::firstOrFail()->stock);

        // Nothing was paid against the replacement, so nothing is paid back.
        $this->assertSame(0, $replacement->refunds()->count());
    }

    // A rider already out with the replacement is mid-errand — a rejection landing after the collection was assigned cannot reach into the van.
    public function test_a_rejection_never_calls_off_a_replacement_already_under_way(): void
    {
        [$admin, $order, $request] = $this->approvedReplacement();
        [, $profile] = $this->rider();

        $this->actingAs($admin)
            ->postJson('/api/admin/delivery-assignments', [
                'order_id' => $order->id,
                'delivery_profile_id' => $profile->id,
            ])
            ->assertCreated();

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Rejected'])
            ->assertOk();

        $this->assertSame('Return Pickup Assigned', $order->fresh()->status);
        $this->assertSame('Confirmed', Order::whereKey($request->fresh()->replacement_order_id)->value('status'));
    }

    // A replacement is "Paid" by inheritance, not by payment — no money ever arrived against it.
    public function test_cancelling_a_replacement_refunds_nothing_it_was_never_paid(): void
    {
        [, , $request] = $this->approvedReplacement();

        $replacement = Order::whereKey($request->fresh()->replacement_order_id)->firstOrFail();

        // The shape a replacement of an online-paid order carries.
        $replacement->update([
            'payment_method' => 'SSLCommerz',
            'payment_gateway' => 'SSLCOMMERZ',
            'payment_status' => 'Paid',
        ]);

        $context = app(RefundService::class)->refundContext($replacement->fresh());

        $this->assertSame(0, $context['refundable_amount']);
        $this->assertSame(0, $context['gateway_portion']);
    }

    // A delivered order whose return has just been approved.
    private function approvedReplacement(string $resolution = 'Replacement'): array
    {
        $customer = $this->user('customer');
        $admin = $this->user('admin');

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

        // The order's own invoice, as checkout would have issued it.
        app(InvoiceService::class)->generateForOrder($order);

        $request = ReturnRequest::create([
            'request_number' => 'RET-' . strtoupper(uniqid()),
            'order_id' => $order->id,
            'order_item_id' => $item->id,
            'customer_id' => $customer->id,
            'type' => 'Return',
            'requested_resolution' => $resolution,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => 100,
            'amount' => 100,
            'reason' => 'Damaged or leaking product',
            'payment_method' => $order->paymentMethodLabel(),
            'preferred_refund_method' => Refund::METHOD_WALLET,
            'shipping_fee' => 0,
            'status' => 'Pending',
        ]);

        // The delivery run that got the order to the customer in the first place.
        DeliveryAssignment::create([
            'order_id' => $order->id,
            'delivery_profile_id' => $this->rider()[1]->id,
            'area' => $order->shipping_address,
            'type' => 'Delivery',
            'status' => 'Completed',
            'rider_status' => 'Delivered',
            'assigned_at' => now()->subDay(),
            'accepted_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/returns/{$request->id}/status", ['status' => 'Approved'])
            ->assertOk();

        return [$admin, $order, $request];
    }

    // The one active rider, created on first use and reused after that.
    private function rider(): array
    {
        $profile = DeliveryProfile::with('user')->first();

        if ($profile) {
            return [$profile->user, $profile];
        }

        $user = $this->user('delivery');
        $profile = DeliveryProfile::create([
            'user_id' => $user->id,
            'staff_code' => 'DEL' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'area' => 'Dhaka',
        ]);

        return [$user, $profile->fresh('user')];
    }

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . uniqid() . '@example.com',
            'phone' => '017' . random_int(10000000, 99999999),
            'password' => bcrypt('password'),
            'role' => $role,
            'status' => 'Active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
        ]);
    }
}
