<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

// Customer endpoint for viewing an invoice of their own order
class InvoiceController extends Controller
{
    // Show the invoice for one of the customer's orders
    public function show(Request $request, Order $order)
    {
        // A customer may only see their own orders
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // Load the order items with products and the customer
        $order->load(['items.product', 'customer']);

        return response()->json(['invoice' => $this->present($order)]);
    }

    // Shape the order into the invoice view format
    private function present(Order $order): array
    {
        // Delivery fee = total - subtotal + discount (never below zero)
        $delivery = max($order->total_amount - $order->subtotal + $order->discount, 0);
        // Same numbering the invoice will be issued with
        $invoiceNumber = $order->invoice?->invoice_number ?? InvoiceService::previewNumberFor($order);

        return [
            'id' => $invoiceNumber,
            'orderId' => $order->order_number,
            'customer' => $order->customer_name,
            'phone' => $order->customer_phone,
            'email' => $order->customer?->email,
            'shippingAddress' => $order->shipping_address,
            'invoiceDate' => $order->created_at->format('Y-m-d'),
            'orderStatus' => $order->status,
            'paymentStatus' => InvoiceService::paymentStatus($order),
            'paymentMethod' => $order->paymentMethodLabel(),
            // gateway's bank_tran_id when known, else the tran_id we sent it
            'transactionId' => $order->gateway_transaction_id ?: $order->transaction_id,
            'deliveryMan' => InvoiceService::deliveryMan($order),
            'subtotal' => $order->subtotal,
            'delivery' => $delivery,
            'discount' => $order->discount,
            'amount' => $order->total_amount,
            // How the total was settled.
            'walletAmount' => (int) $order->wallet_amount,
            'gatewayAmount' => $order->gatewayPayable(),
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->product_name,
                // pack size the product is sold in
                'unit' => $item->product?->unit,
                'qty' => $item->quantity,
                'price' => $item->unit_price,
                'discount' => 0,
                'lineTotal' => $item->line_total,
            ]),
        ];
    }
}
