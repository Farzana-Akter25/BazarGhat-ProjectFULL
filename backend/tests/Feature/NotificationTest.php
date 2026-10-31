<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryProfile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OrderStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// What lands in whose bell, and what must never land in it twice.
class NotificationTest extends TestCase
{
    use RefreshDatabase;

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

    private function rider(): User
    {
        $user = User::create([
            'name' => 'Test Rider',
            'email' => 'rider' . uniqid() . '@example.com',
            'phone' => '01511' . random_int(100000, 999999),
            'password' => bcrypt('password'),
            'role' => 'delivery',
            'status' => 'Active',
            'email_verified_at' => now(),
        ]);

        DeliveryProfile::create([
            'user_id' => $user->id,
            'staff_code' => 'DM' . random_int(1000, 9999),
            'status' => 'Active',
        ]);

        return $user;
    }

    private function order(User $customer, string $status = 'Pending'): Order
    {
        return Order::create([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'user_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'shipping_address' => '12 Test Road, Dhaka',
            'status' => $status,
            'payment_status' => 'Unpaid',
            'payment_method' => 'Cash on Delivery',
            'subtotal' => 500,
            'discount' => 0,
            'wallet_amount' => 0,
            'total_amount' => 500,
        ]);
    }

    // All of a user's notifications, newest first.
    private function bell(User $user)
    {
        return $user->fresh()->notifications()->get();
    }

    private function typesFor(User $user): array
    {
        return $this->bell($user)->map(fn ($n) => $n->data['type'] ?? null)->all();
    }

    // ------------------------------ lifecycle ------------------------------

    public function test_confirming_an_order_notifies_the_customer(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $order = $this->order($customer, 'Processing');

        app(OrderStatusService::class)->adminAdvance($order, 'Confirmed', $admin);

        $this->assertContains(NotificationService::ORDER_CONFIRMED, $this->typesFor($customer));

        $entry = $this->bell($customer)->first();
        $this->assertSame('order', $entry->data['reference_type']);
        $this->assertSame($order->id, $entry->data['reference_id']);
        $this->assertStringContainsString($order->order_number, $entry->data['message']);
    }

    public function test_each_delivery_step_notifies_the_customer_once(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $rider = $this->rider();
        $order = $this->order($customer, 'Confirmed');

        $orders = app(OrderStatusService::class);
        $order = $orders->assign($order, $admin);
        $order = $orders->riderAdvance($order, 'Picked Up', $rider);
        $order = $orders->riderAdvance($order, 'Out for Delivery', $rider);
        $orders->riderAdvance($order, 'Delivered', $rider);

        $types = $this->typesFor($customer);

        foreach ([
            NotificationService::ORDER_ASSIGNED,
            NotificationService::ORDER_PICKED_UP,
            NotificationService::ORDER_ON_THE_WAY,
            NotificationService::ORDER_DELIVERED,
        ] as $expected) {
            $this->assertSame(1, count(array_keys($types, $expected, true)), "{$expected} should appear exactly once");
        }
    }

    public function test_a_rider_rejection_does_not_tell_the_customer_their_order_was_confirmed_again(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $rider = $this->rider();
        $order = $this->order($customer, 'Confirmed');

        $order = app(OrderStatusService::class)->assign($order, $admin);
        // The rider hands it back; the order returns to Confirmed for reassignment.
        app(OrderStatusService::class)->revertToConfirmed($order, $rider, 'Bike broke down');

        $types = $this->typesFor($customer);

        $this->assertNotContains(NotificationService::ORDER_CONFIRMED, $types);
        $this->assertContains(NotificationService::ORDER_ASSIGNED, $types);
    }

    public function test_cancelling_notifies_the_customer_and_the_admins(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $order = $this->order($customer, 'Confirmed');

        app(OrderStatusService::class)->adminCancel($order, $admin, 'Out of stock');

        $this->assertContains(NotificationService::ORDER_CANCELLED, $this->typesFor($customer));
        $this->assertContains(NotificationService::ORDER_CANCELLED, $this->typesFor($admin));
    }

    public function test_a_customer_cancelling_is_not_told_about_their_own_cancellation(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $order = $this->order($customer, 'Confirmed');

        app(OrderStatusService::class)->customerCancel($order, $customer, 'Changed my mind');

        // They just did it — the admins are the ones who need telling.
        $this->assertNotContains(NotificationService::ORDER_CANCELLED, $this->typesFor($customer));
        $this->assertContains(NotificationService::ORDER_CANCELLED, $this->typesFor($admin));
    }

    // --------------------------- duplicate protection ---------------------------

    public function test_the_same_event_sent_twice_creates_one_notification(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);
        $notifications = app(NotificationService::class);

        $first = $notifications->send(
            $customer,
            NotificationService::PAYMENT_SUCCESS,
            'Payment successful',
            "Payment for order {$order->order_number} was successful.",
            NotificationService::REF_ORDER,
            $order->id,
        );

        // Exactly what a replayed SSLCommerz callback would do.
        $second = $notifications->send(
            $customer,
            NotificationService::PAYMENT_SUCCESS,
            'Payment successful',
            "Payment for order {$order->order_number} was successful.",
            NotificationService::REF_ORDER,
            $order->id,
        );

        $this->assertTrue($first);
        $this->assertFalse($second, 'the replay should be refused by the primary key');
        $this->assertCount(1, $this->bell($customer));
    }

    public function test_a_different_event_on_the_same_order_still_lands(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);
        $notifications = app(NotificationService::class);

        $notifications->send($customer, NotificationService::ORDER_PLACED, 'Order placed', 'a', NotificationService::REF_ORDER, $order->id);
        $notifications->send($customer, NotificationService::ORDER_CONFIRMED, 'Order confirmed', 'b', NotificationService::REF_ORDER, $order->id);

        $this->assertCount(2, $this->bell($customer));
    }

    public function test_two_recipients_each_get_their_own_copy(): void
    {
        $one = $this->admin();
        $two = $this->admin();
        $customer = $this->customer();
        $order = $this->order($customer);

        app(NotificationService::class)->sendToAdmins(
            NotificationService::ORDER_PLACED,
            'New order',
            "New order {$order->order_number} has been placed.",
            NotificationService::REF_ORDER,
            $order->id,
        );

        // One admin reading it must not mark it read for the other.
        $this->assertCount(1, $this->bell($one));
        $this->assertCount(1, $this->bell($two));
        $this->assertNotSame($this->bell($one)->first()->id, $this->bell($two)->first()->id);
    }

    // ------------------------------- inventory -------------------------------

    public function test_low_and_out_of_stock_warn_admins_once_a_day(): void
    {
        $admin = $this->admin();

        $low = Product::create(['name' => 'Low Rice', 'price' => 100, 'stock' => 5, 'category' => 'grocery']);
        $out = Product::create(['name' => 'Gone Dal', 'price' => 100, 'stock' => 0, 'category' => 'grocery']);
        $fine = Product::create(['name' => 'Plenty Oil', 'price' => 100, 'stock' => 400, 'category' => 'grocery']);

        $notifications = app(NotificationService::class);
        $notifications->checkStockLevel($low);
        $notifications->checkStockLevel($low); // a second sale the same day
        $notifications->checkStockLevel($out);
        $notifications->checkStockLevel($fine);

        $types = $this->typesFor($admin);

        $this->assertSame(1, count(array_keys($types, NotificationService::LOW_STOCK, true)));
        $this->assertSame(1, count(array_keys($types, NotificationService::OUT_OF_STOCK, true)));
        $this->assertCount(2, $this->bell($admin), 'a well-stocked product should warn nobody');
    }

    // -------------------------------- the api --------------------------------

    public function test_a_customer_only_ever_sees_their_own_notifications(): void
    {
        $mine = $this->customer();
        $theirs = $this->customer();
        $order = $this->order($theirs);

        app(NotificationService::class)->send(
            $theirs,
            NotificationService::ORDER_PLACED,
            'Order placed',
            'Someone elses order.',
            NotificationService::REF_ORDER,
            $order->id,
        );

        $response = $this->actingAs($mine)->getJson('/api/customer/notifications')->assertOk();

        $this->assertSame([], $response->json('notifications'));
        $this->assertSame(0, $response->json('unreadCount'));
    }

    public function test_a_customer_cannot_mark_another_customers_notification_read(): void
    {
        $mine = $this->customer();
        $theirs = $this->customer();
        $order = $this->order($theirs);

        app(NotificationService::class)->send(
            $theirs,
            NotificationService::ORDER_PLACED,
            'Order placed',
            'Someone elses order.',
            NotificationService::REF_ORDER,
            $order->id,
        );

        $id = $this->bell($theirs)->first()->id;

        $this->actingAs($mine)->patchJson("/api/customer/notifications/{$id}/read")->assertOk();

        // The response is deliberately bland, but the row must be untouched.
        $this->assertNull($this->bell($theirs)->first()->read_at);
    }

    public function test_a_customer_cannot_reach_the_admin_or_delivery_notification_routes(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer)->getJson('/api/admin/notifications')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/delivery/notifications')->assertForbidden();
    }

    public function test_a_delivery_man_cannot_reach_the_admin_notification_routes(): void
    {
        $rider = $this->rider();

        $this->actingAs($rider)->getJson('/api/admin/notifications')->assertForbidden();
        $this->actingAs($rider)->getJson('/api/customer/notifications')->assertForbidden();
    }

    public function test_the_unread_count_comes_from_the_server_and_follows_mark_read(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);
        $notifications = app(NotificationService::class);

        $notifications->send($customer, NotificationService::ORDER_PLACED, 'Order placed', 'a', NotificationService::REF_ORDER, $order->id);
        $notifications->send($customer, NotificationService::ORDER_CONFIRMED, 'Order confirmed', 'b', NotificationService::REF_ORDER, $order->id);

        $this->actingAs($customer)->getJson('/api/customer/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unreadCount', 2);

        $id = $this->bell($customer)->first()->id;
        $this->actingAs($customer)->patchJson("/api/customer/notifications/{$id}/read")->assertOk();

        $this->actingAs($customer)->getJson('/api/customer/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unreadCount', 1);

        $this->actingAs($customer)->patchJson('/api/customer/notifications/read-all')->assertOk();

        $this->actingAs($customer)->getJson('/api/customer/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unreadCount', 0);
    }

    public function test_mark_all_read_only_touches_the_authenticated_user(): void
    {
        $mine = $this->customer();
        $theirs = $this->customer();
        $notifications = app(NotificationService::class);

        $notifications->send($mine, NotificationService::ORDER_PLACED, 'Order placed', 'mine', NotificationService::REF_ORDER, $this->order($mine)->id);
        $notifications->send($theirs, NotificationService::ORDER_PLACED, 'Order placed', 'theirs', NotificationService::REF_ORDER, $this->order($theirs)->id);

        $this->actingAs($mine)->patchJson('/api/customer/notifications/read-all')->assertOk();

        $this->assertNotNull($this->bell($mine)->first()->read_at);
        $this->assertNull($this->bell($theirs)->first()->read_at);
    }

    public function test_the_api_exposes_the_fields_the_frontend_routes_a_click_with(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);

        app(NotificationService::class)->send(
            $customer,
            NotificationService::ORDER_PLACED,
            'Order placed',
            "Your order {$order->order_number} has been placed successfully.",
            NotificationService::REF_ORDER,
            $order->id,
        );

        $row = $this->actingAs($customer)->getJson('/api/customer/notifications')
            ->assertOk()
            ->json('notifications.0');

        $this->assertSame(NotificationService::ORDER_PLACED, $row['type']);
        $this->assertSame('Order placed', $row['title']);
        $this->assertSame('order', $row['referenceType']);
        $this->assertSame($order->id, $row['referenceId']);
        $this->assertSame('INFO', $row['priority']);
        $this->assertFalse($row['read']);
    }

    public function test_the_list_is_paginated(): void
    {
        $customer = $this->customer();
        $notifications = app(NotificationService::class);

        for ($i = 0; $i < 25; $i++) {
            $notifications->send(
                $customer,
                NotificationService::ORDER_PLACED,
                'Order placed',
                "Order number {$i}.",
                NotificationService::REF_ORDER,
                $i,
            );
        }

        $first = $this->actingAs($customer)->getJson('/api/customer/notifications')->assertOk();
        $this->assertCount(20, $first->json('notifications'));
        $this->assertSame(25, $first->json('meta.total'));
        $this->assertSame(2, $first->json('meta.lastPage'));

        $second = $this->actingAs($customer)->getJson('/api/customer/notifications?page=2')->assertOk();
        $this->assertCount(5, $second->json('notifications'));
    }

    // ----------------------------- never in the way -----------------------------

    public function test_a_notification_failure_never_breaks_the_business_action(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $order = $this->order($customer, 'Processing');

        // A recipient whose row is gone is the simplest way to make the write fail; the order must still reach Confirmed.
        $customer->delete();

        $confirmed = app(OrderStatusService::class)->adminAdvance($order->fresh(), 'Confirmed', $admin);

        $this->assertSame('Confirmed', $confirmed->status);
    }

    public function test_a_delivery_assignment_notifies_the_rider_and_the_customer(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $rider = $this->rider();

        $order = $this->order($customer, 'Confirmed');
        $order->items()->save(new OrderItem([
            'product_name' => 'Rice',
            'quantity' => 1,
            'unit_price' => 500,
            'line_total' => 500,
        ]));

        $this->actingAs($admin)->postJson('/api/admin/delivery-assignments', [
            'order_id' => $order->id,
            'delivery_profile_id' => $rider->deliveryProfile->id,
        ])->assertCreated();

        $this->assertContains(NotificationService::DELIVERY_ASSIGNED, $this->typesFor($rider));
        $this->assertContains(NotificationService::ORDER_ASSIGNED, $this->typesFor($customer));
    }

    public function test_a_rider_accepting_and_a_second_accept_notify_admins_once(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();
        $rider = $this->rider();
        $order = $this->order($customer, 'Assigned');

        $assignment = DeliveryAssignment::create([
            'order_id' => $order->id,
            'delivery_profile_id' => $rider->deliveryProfile->id,
            'area' => $order->shipping_address,
            'status' => 'Pending',
            'rider_status' => 'Assigned',
            'assigned_at' => now(),
        ]);

        $this->actingAs($rider)->patchJson("/api/delivery/assigned-orders/{$assignment->id}/accept")->assertOk();
        // A double-tapped button.
        $this->actingAs($rider)->patchJson("/api/delivery/assigned-orders/{$assignment->id}/accept")->assertStatus(422);

        $types = $this->typesFor($admin);
        $this->assertSame(1, count(array_keys($types, NotificationService::DELIVERY_ACCEPTED, true)));
    }
}
