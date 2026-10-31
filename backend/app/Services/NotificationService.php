<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

// Turns a business event that has already happened into
class NotificationService
{
    // Namespace for the deterministic ids — arbitrary, but must never change.
    private const UUID_NAMESPACE = '5f2b1c4e-9a3d-4c8b-9e17-0d6a4f8b2c31';

    // Order lifecycle
    public const ORDER_PLACED = 'ORDER_PLACED';
    public const ORDER_PROCESSING = 'ORDER_PROCESSING';
    public const ORDER_CONFIRMED = 'ORDER_CONFIRMED';
    public const ORDER_ASSIGNED = 'ORDER_ASSIGNED';
    public const ORDER_PICKED_UP = 'ORDER_PICKED_UP';
    public const ORDER_ON_THE_WAY = 'ORDER_ON_THE_WAY';
    public const ORDER_DELIVERED = 'ORDER_DELIVERED';
    public const ORDER_CANCELLED = 'ORDER_CANCELLED';
    public const ORDER_REJECTED_AT_DOORSTEP = 'ORDER_REJECTED_AT_DOORSTEP';

    // Payment
    public const PAYMENT_SUCCESS = 'PAYMENT_SUCCESS';
    public const PAYMENT_FAILED = 'PAYMENT_FAILED';

    // Refund (the customer-facing wording still comes from RefundNotifier)
    public const REFUND_REQUESTED = 'REFUND_REQUESTED';
    public const REFUND_APPROVED = 'REFUND_APPROVED';
    public const REFUND_REJECTED = 'REFUND_REJECTED';
    public const REFUND_PROCESSING = 'REFUND_PROCESSING';
    public const REFUND_COMPLETED = 'REFUND_COMPLETED';
    public const REFUND_FAILED = 'REFUND_FAILED';

    // Refund balance
    public const WALLET_CREDITED = 'WALLET_CREDITED';
    public const WALLET_PAYMENT = 'WALLET_PAYMENT';

    // Delivery
    public const DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED';
    public const DELIVERY_ACCEPTED = 'DELIVERY_ACCEPTED';
    public const DELIVERY_REJECTED = 'DELIVERY_REJECTED';
    public const DELIVERY_ISSUE = 'DELIVERY_ISSUE';

    // Return / replacement
    public const RETURN_REQUESTED = 'RETURN_REQUESTED';
    public const RETURN_APPROVED = 'RETURN_APPROVED';
    public const RETURN_REJECTED = 'RETURN_REJECTED';
    public const RETURN_RESOLVED = 'RETURN_RESOLVED';

    // Complaints
    public const COMPLAINT_CREATED = 'COMPLAINT_CREATED';
    public const COMPLAINT_UPDATED = 'COMPLAINT_UPDATED';

    // Inventory
    public const LOW_STOCK = 'LOW_STOCK';
    public const OUT_OF_STOCK = 'OUT_OF_STOCK';

    // Promotions
    public const COUPON_ASSIGNED = 'COUPON_ASSIGNED';

    // Reference types the frontend maps to an existing page.
    public const REF_ORDER = 'order';
    public const REF_REFUND = 'refund';
    public const REF_RETURN = 'return';
    public const REF_COMPLAINT = 'complaint';
    public const REF_DELIVERY_ASSIGNMENT = 'delivery_assignment';
    public const REF_PRODUCT = 'product';
    public const REF_WALLET = 'wallet';

    // Sends one bell entry.
    public function send(
        ?User $recipient,
        string $type,
        string $title,
        string $message,
        ?string $referenceType = null,
        int|string|null $referenceId = null,
        string $priority = SystemNotification::PRIORITY_INFO,
        ?string $dedupeKey = null,
    ): bool {
        // Nobody to notify
        if (! $recipient) {
            return false;
        }

        try {
            // Build a fixed id from the recipient and the event, so the same event is never stored twice
            $key = $dedupeKey ?? "{$type}:{$referenceType}:{$referenceId}";
            $id = Uuid::uuid5(self::UUID_NAMESPACE, "user:{$recipient->id}|{$key}")->toString();

            // Save the notification in the database
            $recipient->notify(new SystemNotification(
                $id,
                $type,
                $title,
                $message,
                $referenceType,
                $referenceId,
                $priority,
            ));

            return true;
        } catch (QueryException $e) {
            // Same recipient, same occurrence: it is already in their bell.
            if ($this->isDuplicate($e)) {
                return false;
            }

            $this->swallow($e, $type);

            return false;
        } catch (\Throwable $e) {
            $this->swallow($e, $type);

            return false;
        }
    }

    // Sends the same entry to every active admin.
    public function sendToAdmins(
        string $type,
        string $title,
        string $message,
        ?string $referenceType = null,
        int|string|null $referenceId = null,
        string $priority = SystemNotification::PRIORITY_INFO,
        ?string $dedupeKey = null,
    ): void {
        try {
            // Every admin who is not blocked
            User::where('role', 'admin')
                ->where('status', '!=', 'Blocked')
                ->get()
                ->each(fn (User $admin) => $this->send(
                    $admin,
                    $type,
                    $title,
                    $message,
                    $referenceType,
                    $referenceId,
                    $priority,
                    $dedupeKey,
                ));
        } catch (\Throwable $e) {
            $this->swallow($e, $type);
        }
    }

    // Warns admins when a product crosses the stock lines
    public function checkStockLevel(?Product $product): void
    {
        if (! $product) {
            return;
        }

        // Current stock and today's date (one warning per product per day)
        $stock = (int) $product->stock;
        $today = now()->toDateString();

        // Stock is zero: out-of-stock warning
        if ($stock <= 0) {
            $this->sendToAdmins(
                self::OUT_OF_STOCK,
                'Out of stock',
                "{$product->name} is out of stock.",
                self::REF_PRODUCT,
                $product->id,
                SystemNotification::PRIORITY_ERROR,
                self::OUT_OF_STOCK . ":product:{$product->id}:{$today}",
            );

            return;
        }

        // Stock under 20: low-stock warning
        if ($stock < 20) {
            $this->sendToAdmins(
                self::LOW_STOCK,
                'Low stock',
                "{$product->name} is running low — {$stock} left in stock.",
                self::REF_PRODUCT,
                $product->id,
                SystemNotification::PRIORITY_WARNING,
                self::LOW_STOCK . ":product:{$product->id}:{$today}",
            );
        }
    }

    // Every product on an order, checked once each after the stock has moved.
    public function checkStockLevelsForOrder(Order $order): void
    {
        try {
            // Unique product ids on the order
            $productIds = $order->items()->pluck('product_id')->filter()->unique();

            Product::whereIn('id', $productIds)
                ->get()
                ->each(fn (Product $product) => $this->checkStockLevel($product));
        } catch (\Throwable $e) {
            $this->swallow($e, 'stock-check');
        }
    }

    // True if the database refused the insert because the id already exists
    private function isDuplicate(QueryException $e): bool
    {
        return ($e->errorInfo[1] ?? null) === 1062 || str_contains($e->getMessage(), 'Duplicate entry');
    }

    // Log a failed notification without breaking the main action
    private function swallow(\Throwable $e, string $type): void
    {
        // Deliberately swallowed: see the class docblock.
        Log::warning('Notification could not be created.', [
            'type' => $type,
            'error' => $e->getMessage(),
        ]);
    }
}
