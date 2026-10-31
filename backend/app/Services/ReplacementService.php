<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// Creates the linked replacement order when an admin approves
class ReplacementService
{
    // Inject the invoice and order status services
    public function __construct(
        private InvoiceService $invoices,
        private OrderStatusService $orderStatus,
    ) {
    }

    // True when the product is active and has enough stock for a replacement
    public function isAvailable(ReturnRequest $returnRequest): bool
    {
        $item = $returnRequest->orderItem;
        $product = $item?->product;

        return $item && $product && $product->status === 'Active' && $product->stock >= $returnRequest->quantity;
    }

    // Create a new confirmed order that sends the same item again
    public function create(ReturnRequest $returnRequest, User $admin): Order
    {
        // Everything happens in one transaction
        return DB::transaction(function () use ($returnRequest, $admin) {
            // The original order and the item being returned
            $originalOrder = $returnRequest->order;
            $item = $returnRequest->orderItem;

            // Re-validate under a row lock inside the transaction.
            $product = Product::where('id', $item->product_id)->lockForUpdate()->first();

            if (! $product || $product->stock < $returnRequest->quantity) {
                throw new RuntimeException('Replacement is no longer available for this product (out of stock).');
            }

            // Create the replacement order (numbered RPL-XXXXXX)
            $newOrder = Order::create([
                'order_number' => Order::generateNumber('RPL'),
                'user_id' => $originalOrder->user_id,
                'customer_name' => $originalOrder->customer_name,
                'customer_phone' => $originalOrder->customer_phone,
                'shipping_address' => $originalOrder->shipping_address,
                'status' => 'Confirmed',
                // A replacement carries the original order's settlement over.
                'payment_status' => $originalOrder->payment_status === 'Paid' ? 'Paid' : 'Unpaid',
                'payment_method' => $originalOrder->payment_method,
                'payment_channel' => $originalOrder->payment_channel,
                'is_replacement' => true,
                'replacement_for_order_id' => $originalOrder->id,
                'subtotal' => $item->line_total,
                'discount' => 0,
                'total_amount' => $item->line_total,
            ]);

            // Add the same item to the new order
            OrderItem::create([
                'order_id' => $newOrder->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'unit_price' => $item->unit_price,
                'quantity' => $returnRequest->quantity,
                'line_total' => $item->line_total,
            ]);

            // Take the quantity out of stock and log it
            $previousStock = $product->stock;
            $product->decrement('stock', $returnRequest->quantity);

            StockTransaction::create([
                'product_id' => $product->id,
                'order_id' => $newOrder->id,
                'transaction_type' => StockTransaction::TYPE_REPLACEMENT_DEDUCTION,
                'quantity' => $returnRequest->quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $previousStock - $returnRequest->quantity,
                'reason' => "Replacement for return {$returnRequest->request_number}",
                'created_by' => $admin->id,
            ]);

            // First timeline entry for the new order
            OrderStatusHistory::create([
                'order_id' => $newOrder->id,
                'status' => 'Confirmed',
                'note' => "Replacement for order {$originalOrder->order_number} (return {$returnRequest->request_number}).",
                'changed_by_user_id' => $admin->id,
                'changed_by_role' => 'admin',
            ]);

            // A replacement order is created straight at "Confirmed" rather
            $this->invoices->generateForOrder($newOrder);

            // The original order's goods are still at the customer's
            $this->orderStatus->markReturnApproved(
                $originalOrder,
                $admin,
                "Return {$returnRequest->request_number} approved — replacement {$newOrder->order_number} issued.",
            );

            return $newOrder;
        });
    }
}
