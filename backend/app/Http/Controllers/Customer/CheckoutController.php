<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\User;
use App\Services\CouponService;
use App\Services\FlashSalePricing;
use App\Services\InvoiceService;
use App\Services\NotificationService;
use App\Services\SslCommerzService;
use App\Services\WalletService;
use App\Models\WalletTransaction;
use App\Notifications\SystemNotification;
use App\Support\Phone;
use App\Support\PhoneVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

// Places a customer's order (cash on delivery, online, or paid from wallet)
class CheckoutController extends Controller
{
    // Flat delivery charge in taka
    public const DELIVERY_FEE = 80;

    // Validate the cart, price it, create the order and start payment if needed
    public function store(Request $request, SslCommerzService $sslCommerz, CouponService $coupons, FlashSalePricing $pricing, InvoiceService $invoices, WalletService $wallet)
    {
        // Validate the checkout form and cart items
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string',
            // optional: a wallet-covered order needs no payment method
            'payment_method' => 'nullable|string|in:cod,online',
            'coupon_code' => 'nullable|string|max:50',
            'use_wallet' => 'sometimes|boolean',
            // A requested cap only
            'wallet_amount' => 'nullable|integer|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Convert the delivery phone to the standard format; refuse if invalid
        $normalizedPhone = Phone::normalize($request->customer_phone);

        if (! $normalizedPhone) {
            return response()->json([
                'message' => 'Enter a valid Bangladeshi mobile number for the delivery contact.',
            ], 422);
        }

        // The logged-in customer
        $user = $request->user();

        // The contact number must be OTP-verified before an order exists.
        if (! PhoneVerification::isVerified($user, $normalizedPhone)) {
            return response()->json([
                'message' => 'Please verify your phone number before placing the order.',
                'code' => 'phone_verification_required',
            ], 422);
        }

        // Build the whole order inside one database transaction
        try {
            $order = DB::transaction(function () use ($request, $user, $coupons, $pricing, $normalizedPhone, $invoices, $wallet) {
                // Running subtotal and the priced lines
                $subtotal = 0;
                $lineItems = [];

                // Prices are never taken from the request.
                $activeSales = $pricing->activeSalesFor(collect($request->items)->pluck('product_id'));

                // Price and stock-check each cart item
                foreach ($request->items as $entry) {
                    // Lock the product row so stock cannot change under us
                    $product = Product::where('id', $entry['product_id'])->lockForUpdate()->first();

                    if (! $product || $product->status !== 'Active') {
                        abort(422, "Product is no longer available.");
                    }

                    // Requested quantity
                    $quantity = (int) $entry['quantity'];

                    // Not enough stock
                    if ($product->stock < $quantity) {
                        abort(422, "\"{$product->name}\" only has {$product->stock} left in stock.");
                    }

                    // Sale price if a flash sale is running, otherwise the normal price
                    $unitPrice = $pricing->effectivePriceFor($product, $activeSales->get($product->id));
                    $lineTotal = $unitPrice * $quantity;
                    $subtotal += $lineTotal;

                    $lineItems[] = [
                        'product' => $product,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'line_total' => $lineTotal,
                    ];
                }

                // Delivery fee before any coupon
                $nominalDeliveryFee = self::DELIVERY_FEE;
                $deliveryFee = $nominalDeliveryFee;
                $appliedCoupon = null;
                $couponDiscount = 0;

                // A valid coupon either makes delivery free or takes cash off the items
                if ($request->filled('coupon_code')) {
                    $result = $coupons->resolveForCheckout(
                        $user,
                        strtoupper(trim($request->coupon_code)),
                        $subtotal,
                        lock: true,
                    );

                    $appliedCoupon = $result['coupon'];
                    $couponDiscount = $result['discount'];

                    if ($result['freeDelivery']) {
                        $deliveryFee = 0;
                    }
                }

                // discount = cash off the items + any delivery fee the coupon waived
                $discount = $couponDiscount + ($nominalDeliveryFee - $deliveryFee);

                // Order total = subtotal - coupon discount + delivery fee
                $total = $subtotal - $couponDiscount + $deliveryFee;

                // Refund balance can pay part (or all) of an order whichever way the rest is paid
                $walletUsed = 0;

                if ($request->boolean('use_wallet')) {
                    $available = (int) User::whereKey($user->id)->lockForUpdate()->value('wallet_balance');
                    $requested = $request->filled('wallet_amount') ? (int) $request->wallet_amount : $available;

                    // clamped to the real balance and the real total
                    $walletUsed = max(0, min($requested, $available, (int) $total));
                }

                // What is left after the balance has been applied.
                $remaining = max(0, (int) $total - $walletUsed);

                // covered in full by the balance, no gateway leg
                $settledByWallet = $walletUsed > 0 && $remaining === 0;

                // A payment method is required unless the wallet covers everything
                if (! $settledByWallet && ! $request->filled('payment_method')) {
                    abort(422, 'Please select a payment method for the remaining amount.');
                }

                // Cash on delivery?
                $isCod = $request->payment_method === 'cod';

                // Make a new unique order number
                $orderNumber = $this->generateOrderNumber();

                // Create the order row
                $order = Order::create([
                    'order_number' => $orderNumber,
                    'user_id' => $user->id,
                    'customer_name' => $request->customer_name,
                    // store the normalized form
                    'customer_phone' => $normalizedPhone,
                    'shipping_address' => $request->shipping_address,
                    'status' => 'Pending',
                    'payment_status' => 'Unpaid',
                    // How this order settles is already decided.
                    'payment_method' => match (true) {
                        $settledByWallet => 'BazarGhat Balance',
                        $isCod => 'Cash on Delivery',
                        default => 'SSLCommerz',
                    },
                    // The gateway and our tran_id are known up front.
                    'payment_gateway' => match (true) {
                        $settledByWallet => 'BAZARGHAT_WALLET',
                        $isCod => null,
                        default => 'SSLCOMMERZ',
                    },
                    'transaction_id' => $isCod && ! $settledByWallet ? null : $orderNumber,
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'delivery_fee' => $deliveryFee,
                    'wallet_amount' => $walletUsed,
                    'total_amount' => $total,
                ]);

                // Save each order line and take the quantity out of stock
                foreach ($lineItems as $line) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $line['product']->id,
                        'product_name' => $line['product']->name,
                        // Snapshot: the order keeps the price that applied when
                        'unit_price' => $line['unit_price'],
                        'quantity' => $line['quantity'],
                        'line_total' => $line['line_total'],
                    ]);

                    $line['product']->decrement('stock', $line['quantity']);
                }

                if ($walletUsed > 0) {
                    // One debit, keyed on this order, inside the transaction
                    $wallet->debit(
                        $user,
                        $walletUsed,
                        WalletTransaction::REF_ORDER,
                        $order->id,
                        "Refund balance used on order {$order->order_number}",
                    );

                    // Only now that the balance has actually moved is
                    if ($settledByWallet) {
                        $order->update([
                            'payment_status' => 'Paid',
                            'paid_amount' => 0,
                            'paid_at' => now(),
                        ]);
                    }
                }

                // Record that the coupon was used
                if ($appliedCoupon) {
                    $coupons->redeem($appliedCoupon, $user, $order, $couponDiscount);
                }

                // Build the timeline note for the order
                $noteParts = [];
                if ($appliedCoupon) {
                    $noteParts[] = "coupon {$appliedCoupon->coupon_code} applied";
                }

                // First entry in the order timeline: "Pending"
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => 'Pending',
                    'note' => $noteParts ? ('Order placed — ' . implode('; ', $noteParts) . '.') : 'Order placed.',
                    'changed_by_user_id' => $user->id,
                    'changed_by_role' => 'customer',
                ]);

                // Generate invoice immediately upon order creation so invoices are
                $invoices->generateForOrder($order);

                return $order;
            });
        // Validation errors return 422; anything else is a 500
        } catch (\Throwable $e) {
            $status = $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException ? $e->getStatusCode() : 500;

            return response()->json([
                'message' => $status === 422 ? $e->getMessage() : 'Could not place order. Please try again.',
            ], $status === 422 ? 422 : 500);
        }

        // Wallet paid for everything: clear the cart and finish
        if ($order->wallet_amount > 0 && $order->gatewayPayable() === 0) {
            // Paid in full from the refund balance — there is no gateway leg.
            $orderedProductIds = collect($request->items)->pluck('product_id')->all();
            CartItem::removeForUserProducts($user->id, $orderedProductIds);

            $this->announceOrderPlaced($order);

            return response()->json([
                'message' => 'Order placed and paid from your refund balance.',
                'payment_method' => 'wallet',
                'order_number' => $order->order_number,
                'wallet_amount' => $order->wallet_amount,
            ]);
        }

        // Cash on delivery: clear the cart and finish
        if ($request->payment_method === 'cod') {
            // COD orders are confirmed immediately
            $orderedProductIds = collect($request->items)->pluck('product_id')->all();
            CartItem::removeForUserProducts($user->id, $orderedProductIds);

            $this->announceOrderPlaced($order);

            return response()->json([
                'message' => 'Order placed successfully.',
                'payment_method' => 'cod',
                'order_number' => $order->order_number,
            ]);
        }

        // Online payment: ask SSLCommerz for a payment page URL
        try {
            $gatewayUrl = $sslCommerz->initiatePayment($order, [
                'name' => $request->customer_name,
                'phone' => $normalizedPhone,
                'address' => $request->shipping_address,
                'email' => $user->email,
            ]);
        } catch (\Throwable $e) {
            report($e);
            $gatewayUrl = null;
        }

        // Gateway failed: undo stock and wallet, cancel the order and report the error
        if (! $gatewayUrl) {
            $this->restoreStock($order);
            $wallet->returnOrderFunds($order);
            $order->update([
                'status' => 'Cancelled',
                'payment_status' => 'Unpaid',
                'cancelled_by' => 'customer'
            ]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'Cancelled',
                'note' => 'Could not connect to the payment gateway.',
                'changed_by_role' => 'system',
            ]);

            return response()->json([
                'message' => 'Could not connect to the payment gateway. Please try again.',
            ], 502);
        }

        // Gateway ready: notify and send the payment URL to the frontend
        $this->announceOrderPlaced($order);

        return response()->json([
            'message' => 'Redirecting to payment gateway.',
            'payment_method' => $request->payment_method,
            'order_number' => $order->order_number,
            'gateway_url' => $gatewayUrl,
        ]);
    }

    // Make a new unique order number
    private function generateOrderNumber(): string
    {
        return Order::generateNumber();
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

    // Bell entries for an order that is committed and standing.
    private function announceOrderPlaced(Order $order): void
    {
        // Notification service and the order number used in the messages
        $notifications = app(NotificationService::class);
        $number = $order->order_number;

        // Tell the customer the order was placed
        $notifications->send(
            $order->customer,
            NotificationService::ORDER_PLACED,
            'Order placed',
            "Your order {$number} has been placed successfully.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_SUCCESS,
        );

        // Tell the admins about the new order
        $notifications->sendToAdmins(
            NotificationService::ORDER_PLACED,
            'New order',
            "New order {$number} has been placed.",
            NotificationService::REF_ORDER,
            $order->id,
            SystemNotification::PRIORITY_INFO,
        );

        // Only when balance actually moved
        if ((int) $order->wallet_amount > 0) {
            $amount = '৳' . number_format((int) $order->wallet_amount);

            $notifications->send(
                $order->customer,
                NotificationService::WALLET_PAYMENT,
                'Balance used',
                "{$amount} was used from your account balance for order {$number}.",
                NotificationService::REF_ORDER,
                $order->id,
                SystemNotification::PRIORITY_INFO,
            );
        }

        // Warn admins if any product is now low on stock
        $notifications->checkStockLevelsForOrder($order);
    }
}
