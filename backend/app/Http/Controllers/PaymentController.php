<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Services\SslCommerzService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Handles the SSLCommerz payment callbacks (success, fail, cancel, IPN)
class PaymentController extends Controller
{
    // Browser comes back after a successful payment
    public function success(Request $request, SslCommerzService $sslCommerz)
    {
        // Find the order by the transaction id SSLCommerz sends back
        $order = Order::where('order_number', $request->input('tran_id'))->first();

        if (! $order) {
            return $this->redirectToFrontend(null, 'failed');
        }

        // Ask SSLCommerz to confirm the payment and the amount
        $validation = $sslCommerz->validatePayment($request->input('val_id', ''));
        $status = $validation['status'] ?? null;
        $amount = (int) round((float) ($validation['amount'] ?? 0));

        // Refuse if the payment is not valid or the amount does not match
        if (! in_array($status, ['VALID', 'VALIDATED'], true) || $amount !== $order->gatewayPayable()) {
            Log::warning('SSLCommerz validation failed on success callback', ['order' => $order->order_number, 'validation' => $validation]);

            return $this->redirectToFrontend($order, 'failed');
        }

        // Settling is idempotent (see recordSettledPayment)
        $this->recordSettledPayment($order, $validation);

        return $this->redirectToFrontend($order, 'success');
    }

    // Browser comes back after a failed payment
    public function fail(Request $request)
    {
        $order = Order::where('order_number', $request->input('tran_id'))->first();

        if ($order && $order->payment_status !== 'Paid') {
            $this->cancelUnpaidOrder($order, 'Payment failed at the gateway.');
        }

        return $this->redirectToFrontend($order, 'failed');
    }

    // Browser comes back after the customer cancelled the payment
    public function cancel(Request $request)
    {
        $order = Order::where('order_number', $request->input('tran_id'))->first();

        if ($order && $order->payment_status !== 'Paid') {
            $this->cancelUnpaidOrder($order, 'Payment cancelled at the gateway.');
        }

        return $this->redirectToFrontend($order, 'cancelled');
    }

    // Cancels an order whose gateway leg failed or was abandoned
    private function cancelUnpaidOrder(Order $order, string $note): void
    {
        // Cancel only if it is still unpaid and not already cancelled (safe if called twice)
        $claimed = Order::whereKey($order->id)
            ->where('payment_status', '!=', 'Paid')
            ->where('status', '!=', 'Cancelled')
            ->update([
                'status' => 'Cancelled',
                'payment_status' => 'Unpaid',
                'cancelled_by' => 'customer',
            ]);

        // Another request already cancelled it
        if ($claimed === 0) {
            return;
        }

        // Reload the order, then undo stock and wallet
        $order->refresh();

        $this->restoreStock($order);
        // keyed in the ledger, so the balance cannot come back twice
        app(WalletService::class)->returnOrderFunds($order);

        // Record the cancellation in the order timeline
        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => 'Cancelled',
            'note' => $note,
            'changed_by_role' => 'system',
        ]);

        // Tell the customer and the admins
        $this->announcePayment($order, false);
    }

    // Server-to-server payment notice  from SSLCommerz
    public function ipn(Request $request, SslCommerzService $sslCommerz)
    {
        // Find the order by the transaction id
        $order = Order::where('order_number', $request->input('tran_id'))->first();

        if (! $order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Confirm the payment with SSLCommerz
        $validation = $sslCommerz->validatePayment($request->input('val_id', ''));
        $status = $validation['status'] ?? null;
        $amount = (int) round((float) ($validation['amount'] ?? 0));

        if (in_array($status, ['VALID', 'VALIDATED'], true) && $amount === $order->gatewayPayable()) {
            // The IPN and the browser success callback routinely arrive for the same payment
            $this->recordSettledPayment($order, $validation, viaIpn: true);
        }

        return response()->json(['message' => 'IPN processed']);
    }

    // Records a payment SSLCommerz has validated.
    private function recordSettledPayment(Order $order, array $validation, bool $viaIpn = false): void
    {
        // Which channel paid (bKash, card, etc.)
        $channel = $this->resolvePaymentChannel($validation);

        // Mark as paid only if not already paid (safe if called twice)
        $claimed = Order::whereKey($order->id)
            ->where('payment_status', '!=', 'Paid')
            ->update([
                'payment_status' => 'Paid',
                'payment_channel' => $channel,
                'payment_gateway' => 'SSLCOMMERZ',
                'transaction_id' => $validation['tran_id'] ?? $order->order_number,
                'gateway_transaction_id' => $validation['bank_tran_id'] ?? null,
                'gateway_val_id' => $validation['val_id'] ?? null,
                // What the gateway actually captured
                'paid_amount' => (int) round((float) ($validation['amount'] ?? 0)),
                'paid_at' => now(),
            ]);

        // Already recorded by the other callback
        if ($claimed === 0) {
            return;
        }

        $order->refresh();

        // Add a timeline entry for the payment
        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $order->status,
            // names the channel, not just the gateway
            'note' => 'Payment received via ' . $order->paymentMethodLabel()
                . ($viaIpn ? ' (IPN)' : '') . '. Awaiting admin confirmation.',
            'changed_by_role' => 'system',
        ]);

        // The paid items no longer belong in the cart
        $this->removeOrderedItemsFromCart($order);

        $this->announcePayment($order, true);
    }

    // Works out which SSLCommerz channel actually took the money.
    private function resolvePaymentChannel(array $validation): ?string
    {
        // Check the card fields SSLCommerz sends, in order
        foreach (['card_type', 'card_issuer', 'card_brand'] as $key) {
            if (filled($validation[$key] ?? null)) {
                $label = Order::paymentChannelLabel($validation[$key]);

                if (filled($label)) {
                    return $label;
                }
            }
        }

        return null;
    }

    // Tells the customer and the admins how the gateway leg ended.
    private function announcePayment(Order $order, bool $succeeded): void
    {
        // Notification service and the order number used in the messages
        $notifications = app(NotificationService::class);
        $number = $order->order_number;

        if ($succeeded) {
            // names the channel the customer recognises
            $via = $order->paymentMethodLabel() ? ' via ' . $order->paymentMethodLabel() : '';

            $notifications->send(
                $order->customer,
                NotificationService::PAYMENT_SUCCESS,
                'Payment successful',
                "Payment for order {$number} was successful{$via}.",
                NotificationService::REF_ORDER,
                $order->id,
                SystemNotification::PRIORITY_SUCCESS,
            );

            $notifications->sendToAdmins(
                NotificationService::PAYMENT_SUCCESS,
                'Payment received',
                "Payment received for order {$number}{$via}.",
                NotificationService::REF_ORDER,
                $order->id,
                SystemNotification::PRIORITY_SUCCESS,
            );

            return;
        }

        // Payment failed: tell the customer
        $notifications->send(
            $order->customer,
            NotificationService::PAYMENT_FAILED,
            'Payment failed',
            "Payment for order {$number} failed.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_ERROR,
        );

        // And tell the admins
        $notifications->sendToAdmins(
            NotificationService::PAYMENT_FAILED,
            'Payment failed',
            "Payment failed for order {$number}.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_WARNING,
        );
    }

    // Put each item's quantity back into product stock
    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product_id) {
                Product::where('id', $item->product_id)->increment('stock', $item->quantity);
            }
        }
    }

    // Remove the ordered products from the customer's cart
    private function removeOrderedItemsFromCart(Order $order): void
    {
        if (! $order->user_id) {
            return;
        }

        $productIds = $order->items()->pluck('product_id')->filter()->all();

        CartItem::removeForUserProducts($order->user_id, $productIds);
    }

    // Send the browser back to the frontend with the payment result in the URL
    private function redirectToFrontend(?Order $order, string $status)
    {
        // A paid order lands on the customer's dashboard
        $path = $status === 'success' ? '/customer-dashboard' : '/checkout';

        // Build the frontend URL with the status
        $url = rtrim(config('sslcommerz.frontend_url'), '/') . $path . '?status=' . $status;

        // Add the order number when there is one
        if ($order) {
            $url .= '&order=' . urlencode($order->order_number);
        }

        return redirect()->away($url);
    }
}
