<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// Single source of truth for the order lifecycle.
class OrderStatusService
{
    // Inject the invoice, refund, wallet and notification services
    public function __construct(private InvoiceService $invoices, private RefundService $refunds, private WalletService $wallet, private NotificationService $notifications)
    {
    }

    // Statuses an admin can manually advance an order to
    private const ADMIN_FORWARD = [
        'Pending' => ['Processing'],
        'Processing' => ['Confirmed'],
    ];

    // Statuses up to which an admin is still allowed to cancel an order.
    public const ADMIN_CANCELLABLE = ['Pending', 'Processing', 'Confirmed', 'Assigned', 'Picked Up'];

    // Statuses up to which a customer is still allowed to cancel an order
    public const CUSTOMER_CANCELLABLE = ['Pending', 'Processing', 'Confirmed'];

    // The return-pickup branch
    public const RETURN_BRANCH = ['Return Approved', 'Return Pickup Assigned', 'Returned'];

    // Statuses from which an order can be handed to a rider to collect a return
    public const RETURN_PICKUP_ASSIGNABLE = ['Return Approved'];

    // Statuses the delivery rider can advance an order to
    private const RIDER_FORWARD = [
        'Assigned' => ['Picked Up'],
        'Picked Up' => ['Out for Delivery'],
        'Out for Delivery' => ['Delivered', 'Customer Rejected at Doorstep'],
    ];

    // Valid doorstep-rejection reason categories
    public const DOORSTEP_REJECTION_REASONS = [
        'Customer Refused',
        'Customer Unavailable',
        'Wrong Product',
        'Product Damaged',
        'Quantity Mismatch',
        'Other',
    ];

    // Admin moves an order forward (Pending -> Processing -> Confirmed)
    public function adminAdvance(Order $order, string $to, User $actor, ?string $note = null): Order
    {
        // Allowed next statuses from the current one
        $allowed = self::ADMIN_FORWARD[$order->status] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw new RuntimeException("An order cannot be moved from \"{$order->status}\" to \"{$to}\".");
        }

        // An order paid online can't be treated as real
        if ($order->isAwaitingOnlinePayment()) {
            throw new RuntimeException('This order was placed for online payment and payment has not been completed yet, so it cannot be moved forward.');
        }

        return $this->applyTransition($order, $to, $actor, 'admin', $note);
    }

    // Admin cancels an order (only up to Picked Up)
    public function adminCancel(Order $order, User $actor, ?string $note = null): Order
    {
        if (! in_array($order->status, self::ADMIN_CANCELLABLE, true)) {
            throw new RuntimeException('This order can no longer be cancelled — it is already out for delivery or beyond.');
        }

        // An admin picks no refund method
        return $this->cancel($order, $actor, 'admin', $note);
    }

    // $refundMethod is the customer's choice from the cancellation modal
    public function customerCancel(Order $order, User $actor, ?string $note = null, ?string $refundMethod = null): Order
    {
        // Customers can only cancel before a delivery man is assigned
        if (! in_array($order->status, self::CUSTOMER_CANCELLABLE, true)) {
            throw new RuntimeException('Order can no longer be cancelled once a delivery man has been assigned to it.');
        }

        return $this->cancel($order, $actor, 'customer', $note, $refundMethod);
    }

    // Admin assigns a delivery man to a confirmed order.
    public function assign(Order $order, User $actor): Order
    {
        if ($order->status !== 'Confirmed') {
            throw new RuntimeException('Only confirmed orders can be assigned to a delivery man.');
        }

        // A replacement has no delivery run to assign.
        if ($order->is_replacement) {
            throw new RuntimeException('A replacement order is delivered on the return pickup for the order it replaces — assign that collection instead.');
        }

        // Clear any old rejection reason before re-assigning
        $order->rejection_reason = null;

        // Move to Assigned
        return $this->applyTransition($order, 'Assigned', $actor, 'admin');
    }

    // $rejectionCategory is the fixed reason picked from the doorstep-rejection
    public function riderAdvance(Order $order, string $to, User $actor, ?string $reason = null, ?string $rejectionCategory = null): Order
    {
        // Allowed next statuses from the current one
        $allowed = self::RIDER_FORWARD[$order->status] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw new RuntimeException("Delivery status cannot be moved from \"{$order->status}\" to \"{$to}\".");
        }

        // A doorstep rejection must have a reason
        if ($to === 'Customer Rejected at Doorstep' && ! $reason) {
            throw new RuntimeException('A reason is required when the customer rejects the order at the doorstep.');
        }

        // Lock the order row while changing it
        return DB::transaction(function () use ($order, $to, $actor, $reason) {
            // Re-fetch under lock so a concurrent duplicate request can't
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if (! $order) {
                throw new RuntimeException('Order not found.');
            }

            // The transition was checked before the lock was taken
            if (! in_array($to, self::RIDER_FORWARD[$order->status] ?? [], true)) {
                throw new RuntimeException("Delivery status cannot be moved from \"{$order->status}\" to \"{$to}\".");
            }

            // Save the doorstep rejection reason on the order
            if ($to === 'Customer Rejected at Doorstep') {
                $order->rejection_reason = $reason;
            }

            return $this->applyTransition($order, $to, $actor, 'delivery', $reason);
        });
    }

    // Moves a delivered order onto the return-pickup branch
    public function markReturnApproved(Order $order, User $actor, ?string $note = null): Order
    {
        // Only a delivered order that is not already in the return branch
        if (in_array($order->status, self::RETURN_BRANCH, true) || $order->status !== 'Delivered') {
            return $order;
        }

        return $this->applyTransition($order, 'Return Approved', $actor, 'admin', $note);
    }

    // Takes an order back off the return branch when
    public function revertReturnApproval(Order $order, User $actor, ?string $note = null): Order
    {
        // Only from Return Approved
        if ($order->status !== 'Return Approved') {
            return $order;
        }

        return $this->applyTransition($order, 'Delivered', $actor, 'admin', $note);
    }

    // Admin hands the order back to a rider to collect the returned goods.
    public function assignReturnPickup(Order $order, User $actor): Order
    {
        // Only from Return Approved
        if (! in_array($order->status, self::RETURN_PICKUP_ASSIGNABLE, true)) {
            throw new RuntimeException('Only an order with an approved return awaiting collection can be assigned for return pickup.');
        }

        return $this->applyTransition($order, 'Return Pickup Assigned', $actor, 'admin');
    }

    // The rider has the returned goods in hand.
    public function riderCollectedReturn(Order $order, User $actor, ?string $note = null): Order
    {
        // Only while a pickup is assigned
        if ($order->status !== 'Return Pickup Assigned') {
            throw new RuntimeException("A return cannot be collected from \"{$order->status}\".");
        }

        // Mark the order as Returned
        $order = $this->applyTransition($order, 'Returned', $actor, 'delivery', $note);

        // Deliver any replacement the rider carried on this run
        $this->deliverLinkedReplacement($order, $actor);

        return $order;
    }

    // Hands over the replacement the rider took along on a return-pickup run
    public function cancelWithdrawnReplacement(Order $order, User $actor, ?string $note = null): void
    {
        // Nothing to cancel while the return is still in progress
        if (in_array($order->status, self::RETURN_BRANCH, true)) {
            return;
        }

        // Only a confirmed replacement that has not gone out yet
        $replacement = $order->replacementOrder()->first();

        if (! $replacement || $replacement->status !== 'Confirmed') {
            return;
        }

        $this->cancel($replacement, $actor, 'admin', $note);
    }

    // Mark the replacement that went out with the pickup as delivered
    private function deliverLinkedReplacement(Order $order, User $actor): void
    {
        // Only a confirmed replacement
        $replacement = $order->replacementOrder()->first();

        if (! $replacement || $replacement->status !== 'Confirmed') {
            return;
        }

        $this->applyTransition(
            $replacement,
            'Delivered',
            $actor,
            'delivery',
            "Handed over with the return collected on order {$order->order_number}.",
        );
    }

    // A rider rejected or failed a return-pickup run
    public function revertReturnPickup(Order $order, User $actor, ?string $note = null): Order
    {
        // Only while a pickup is assigned
        if ($order->status !== 'Return Pickup Assigned') {
            return $order;
        }

        return $this->applyTransition($order, 'Return Approved', $actor, 'delivery', $note);
    }

    // Used when a rider rejects an assignment (before accepting)
    public function revertToConfirmed(Order $order, User $actor, ?string $note = null): Order
    {
        // The return branch is excluded too
        if (in_array($order->status, ['Delivered', 'Cancelled'], true)
            || in_array($order->status, self::RETURN_BRANCH, true)) {
            return $order;
        }

        // Surfaced next to the "Confirmed" status in Order Management
        $order->rejection_reason = 'Rejected by Delivery Man';

        return $this->applyTransition($order, 'Confirmed', $actor, 'delivery', $note);
    }

    // Admin resolves a "Customer Rejected at Doorstep" order.
    public function adminResolveDoorstepRejection(Order $order, string $to, User $actor, ?string $note = null): Order
    {
        // Only for doorstep-rejected orders
        if ($order->status !== 'Customer Rejected at Doorstep') {
            throw new RuntimeException('This order is not awaiting doorstep-rejection review.');
        }

        // Either cancel it...
        if ($to === 'Cancelled') {
            return $this->cancel($order, $actor, 'admin', $note);
        }

        // ...or send it back to Confirmed for a new delivery man
        if ($to === 'Confirmed') {
            return $this->applyTransition($order, 'Confirmed', $actor, 'admin', $note ?? 'Re-queued for delivery reassignment.');
        }

        throw new RuntimeException('A doorstep-rejected order can only be cancelled or re-queued for reassignment.');
    }

    // Cancels an order and
    private function cancel(Order $order, User $actor, string $role, ?string $note, ?string $refundMethod = null): Order
    {
        return DB::transaction(function () use ($order, $actor, $role, $note, $refundMethod) {
            // Re-read under lock and re-check.
            $order = Order::whereKey($order->id)->lockForUpdate()->first();

            if (! $order) {
                throw new RuntimeException('Order not found.');
            }

            // Cannot cancel twice
            if ($order->status === 'Cancelled') {
                throw new RuntimeException('This order has already been cancelled.');
            }

            // Remember if this was a doorstep rejection
            $wasDoorstepRejected = $order->status === 'Customer Rejected at Doorstep';

            // Goods turned away at the door are booked back in by hand.
            if (! $wasDoorstepRejected) {
                $this->restoreStockForCancellation($order, $actor);
            }

            // Was the order already paid online?
            $wasPaid = $order->payment_status === 'Paid' && $order->payment_method !== 'Cash on Delivery';

            // Mark the order cancelled and by whom
            $order->status = 'Cancelled';
            $order->cancelled_by = $role;

            // Unpaid orders stay Unpaid
            if (! $wasPaid) {
                $order->payment_status = 'Unpaid';
            }

            $order->save();

            // An online order cancelled before it was ever paid
            $returnedBalance = 0;

            if (! $wasPaid) {
                $held = (int) $order->wallet_amount;
                $returnedBalance = $this->wallet->returnOrderFunds($order) ? $held : 0;
            }

            // Add a timeline entry for the cancellation
            $history = OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'Cancelled',
                'note' => $note,
                'changed_by_user_id' => $actor->id,
                'changed_by_role' => $role,
            ]);

            // Notify the customer and admins
            $this->announceCancellation($order, $role, $history->id);
            $this->announceBalanceReturn($order, $returnedBalance, $wasDoorstepRejected, $history->id);

            // Paid orders get a refund raised automatically
            if ($wasPaid) {
                $this->refunds->processCancellationRefund(
                    $order->fresh(),
                    $refundMethod,
                    $actor,
                    $role,
                    'Order cancelled before delivery.',
                );
            }

            return $order->fresh();
        });
    }

    // Tells the customer the balance they spent on a cancelled order is back.
    private function announceBalanceReturn(Order $order, int $amount, bool $afterDoorstepRejection, int $historyId): void
    {
        // Nothing was returned
        if ($amount <= 0) {
            return;
        }

        // Amount formatted in taka for the message
        $formatted = '৳' . number_format($amount);

        $this->notifications->send(
            $order->customer,
            NotificationService::WALLET_CREDITED,
            'Balance returned',
            $afterDoorstepRejection
                ? "Order {$order->order_number} was rejected at the doorstep. {$formatted} has been returned to your account balance."
                : "{$formatted} has been returned to your account balance for order {$order->order_number}.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_SUCCESS,
            NotificationService::WALLET_CREDITED . ":order:{$order->id}:history:{$historyId}",
        );
    }

    // Puts a cancelled order's units back on the shelf
    private function restoreStockForCancellation(Order $order, User $actor): void
    {
        // Skip if this order's stock was already put back
        $alreadyRestored = StockTransaction::where('order_id', $order->id)
            ->where('transaction_type', StockTransaction::TYPE_ORDER_CANCELLED_RETURN)
            ->exists();

        if ($alreadyRestored) {
            return;
        }

        // Add each item's quantity back to its product and log it
        foreach ($order->items as $item) {
            if (! $item->product_id) {
                continue;
            }

            $product = Product::where('id', $item->product_id)->lockForUpdate()->first();

            if (! $product) {
                continue;
            }

            $previousStock = (int) $product->stock;
            $product->stock = $previousStock + $item->quantity;
            $product->save();

            StockTransaction::create([
                'product_id' => $product->id,
                'order_id' => $order->id,
                'delivery_assignment_id' => $order->deliveryAssignment?->id,
                'transaction_type' => StockTransaction::TYPE_ORDER_CANCELLED_RETURN,
                'quantity' => $item->quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $previousStock + $item->quantity,
                'reason' => 'order_cancelled',
                'created_by' => $actor->id,
            ]);
        }
    }

    // Set a new status, log it, create the invoice on Confirmed, and notify
    private function applyTransition(Order $order, string $to, User $actor, string $role, ?string $note = null): Order
    {
        // Save the new status
        $order->status = $to;

        // Delivery is when a Cash on Delivery order is actually settled.
        if ($to === 'Delivered') {
            $order->payment_status = 'Paid';
        }

        $order->save();

        // Add a timeline entry
        $history = OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $to,
            'note' => $note,
            'changed_by_user_id' => $actor->id,
            'changed_by_role' => $role,
        ]);

        // An order reaching "Confirmed" is the single trigger for invoice generation
        if ($to === 'Confirmed') {
            $this->invoices->generateForOrder($order);
        }

        // Notify the right people
        $this->announce($order, $to, $role, $history->id);

        return $order->fresh();
    }

    // A cancellation is told to both sides
    private function announceCancellation(Order $order, string $role, int $historyId): void
    {
        // Order number and a unique key for de-duplication
        $number = $order->order_number;
        $key = ":order:{$order->id}:history:{$historyId}";

        // Customer is only told when someone else cancelled
        if ($role !== 'customer') {
            $this->notifications->send(
                $order->customer,
                NotificationService::ORDER_CANCELLED,
                'Order cancelled',
                "Your order {$number} has been cancelled.",
                NotificationService::REF_ORDER,
                $order->id,
                SystemNotification::PRIORITY_WARNING,
                NotificationService::ORDER_CANCELLED . $key,
            );
        }

        // Who cancelled, in words
        $by = $role === 'customer' ? 'the customer' : ($role === 'admin' ? 'an admin' : 'the system');

        // Always tell the admins
        $this->notifications->sendToAdmins(
            NotificationService::ORDER_CANCELLED,
            'Order cancelled',
            "Order {$number} has been cancelled by {$by}.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_WARNING,
            NotificationService::ORDER_CANCELLED . $key . ':admin',
        );
    }

    // Puts the transition that just happened in the right people's bell.
    private function announce(Order $order, string $to, string $role, int $historyId): void
    {
        // Order number and a unique key for de-duplication
        $number = $order->order_number;
        $key = ":order:{$order->id}:history:{$historyId}";

        // Pick the notification text for the new status (null means no customer message)
        [$type, $title, $message, $priority] = match ($to) {
            'Processing' => [
                NotificationService::ORDER_PROCESSING,
                'Order being processed',
                "Your order {$number} is being processed.",
                SystemNotification::PRIORITY_INFO,
            ],
            // Only an admin confirmation is a real confirmation.
            'Confirmed' => $role === 'admin' ? [
                NotificationService::ORDER_CONFIRMED,
                'Order confirmed',
                "Your order {$number} has been confirmed.",
                SystemNotification::PRIORITY_SUCCESS,
            ] : null,
            'Assigned' => [
                NotificationService::ORDER_ASSIGNED,
                'Delivery assigned',
                "A delivery man has been assigned to your order {$number}.",
                SystemNotification::PRIORITY_INFO,
            ],
            'Picked Up' => [
                NotificationService::ORDER_PICKED_UP,
                'Order picked up',
                "Your order {$number} has been picked up by the delivery man.",
                SystemNotification::PRIORITY_INFO,
            ],
            'Out for Delivery' => [
                NotificationService::ORDER_ON_THE_WAY,
                'Order on the way',
                "Your order {$number} is on the way.",
                SystemNotification::PRIORITY_INFO,
            ],
            // Only a rider delivers an order.
            'Delivered' => $role === 'delivery' ? [
                NotificationService::ORDER_DELIVERED,
                'Order delivered',
                "Your order {$number} has been delivered.",
                SystemNotification::PRIORITY_SUCCESS,
            ] : null,
            // The return branch.
            'Return Pickup Assigned' => [
                NotificationService::ORDER_ASSIGNED,
                'Return pickup scheduled',
                "A delivery man has been assigned to collect the returned item from order {$number}.",
                SystemNotification::PRIORITY_INFO,
            ],
            'Returned' => [
                NotificationService::RETURN_RESOLVED,
                'Return collected',
                "The returned item from order {$number} has been collected.",
                SystemNotification::PRIORITY_SUCCESS,
            ],
            default => null,
        } ?? [null, null, null, null];

        // Tell the customer if this status has a message
        if ($type !== null) {
            $this->notifications->send(
                $order->customer,
                $type,
                $title,
                $message,
                NotificationService::REF_ORDER,
                $order->id,
                $priority,
                $type . $key,
            );
        }

        // A doorstep rejection is an admin's problem to resolve
        if ($to === 'Customer Rejected at Doorstep') {
            $this->notifications->sendToAdmins(
                NotificationService::ORDER_REJECTED_AT_DOORSTEP,
                'Order rejected at doorstep',
                "Order {$number} was rejected by the customer at the doorstep.",
                NotificationService::REF_ORDER,
                $order->id,
                SystemNotification::PRIORITY_WARNING,
                NotificationService::ORDER_REJECTED_AT_DOORSTEP . $key,
            );
        }
    }
}
