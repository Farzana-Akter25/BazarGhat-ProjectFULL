<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Refund;

// Invoices are never created by hand
class InvoiceService
{
    // one invoice for an order, made the moment the order is confirmed
    public function generateForOrder(Order $order): Invoice
    {
        // firstOrCreate, so a second call returns the existing invoice instead of a duplicate
        return Invoice::firstOrCreate(
            ['order_id' => $order->id],
            [
                'invoice_number' => $this->numberFor($order),
                // when the invoice was raised
                'issued_at' => now(),
            ],
        );
    }

    // Safety net for orders that reached "Confirmed" before this
    public function backfillConfirmed(): void
    {
        // every order that has ever been confirmed
        $confirmedOrderIds = OrderStatusHistory::where('status', 'Confirmed')
            ->pluck('order_id')
            ->unique();

        // the ones that already carry an invoice
        $invoicedOrderIds = Invoice::whereIn('order_id', $confirmedOrderIds)->pluck('order_id');

        // whatever is left is missing its invoice
        $missingIds = $confirmedOrderIds->diff($invoicedOrderIds);

        // nothing to catch up on
        if ($missingIds->isEmpty()) {
            return;
        }

        // raise the missing invoices one by one
        Order::whereIn('id', $missingIds)->get()->each(fn (Order $order) => $this->generateForOrder($order));
    }

    // Order-number-derived, so it's guaranteed unique without a counter/lock.
    private function numberFor(Order $order): string
    {
        return self::previewNumberFor($order);
    }

    // The number an order's invoice will carry once it's generated.
    public static function previewNumberFor(Order $order): string
    {
        // INV-2026-000014: year plus the order id padded to six digits
        return 'INV-' . now()->format('Y') . '-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
    }

    // the plain payment state an invoice is filed under
    public static function paymentStatus(Order $order): string
    {
        return match (true) {
            // money already returned
            $order->payment_status === 'Refunded' => 'Refunded',
            // a refund is raised but not paid out yet
            $order->payment_status === 'Refund Pending' => 'Refund Pending',
            // the customer has paid
            $order->payment_status === 'Paid' => 'Paid',
            // anything else is still owed
            default => 'Unpaid',
        };
    }

    // What the invoice screen shows in its status column.
    public static function displayPaymentStatus(Order $order): string
    {
        $status = self::paymentStatus($order);

        // paid, but part of it has since gone back
        if ($status === 'Paid' && self::refundedAmount($order) > 0) {
            return 'Partially Refunded';
        }

        return $status;
    }

    // Money actually returned to the customer for this order
    public static function refundedAmount(Order $order): int
    {
        // completed refunds only, so a pending one never reads as paid back
        return (int) $order->refunds
            ->where('status', Refund::STATUS_COMPLETED)
            ->sum('amount');
    }

    // The delivery man the order is assigned to, or null when none is
    public static function deliveryMan(Order $order): ?array
    {
        $user = $order->deliveryAssignment?->deliveryProfile?->user;

        if (! $user) {
            return null;
        }

        return [
            'name' => $user->name,
            'phone' => $user->phone,
        ];
    }

    // How an invoice is labelled and grouped by payment method
    public static function paymentMethodBucket(Order $order): string
    {
        // falls back to "Other" when the order names no method
        return $order->paymentMethodLabel() ?: 'Other';
    }
}
