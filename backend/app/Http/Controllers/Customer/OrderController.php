<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Refund;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

// Customer endpoints for viewing, cancelling and hiding their orders
class OrderController extends Controller
{
    // Only finished orders can be hidden by the customer
    private const DELETABLE_STATUSES = ['Delivered', 'Cancelled'];

    // Relations loaded with every order response
    private const RELATIONS = ['items', 'deliveryAssignment.deliveryProfile.user', 'statusHistories.actor', 'replacementOrder', 'refunds', 'returnRequest'];

    // Request statuses that still have an admin decision coming.
    private const OPEN_REQUEST_STATUSES = ['Pending', 'In Review'];

    // Inject the order status and refund services
    public function __construct(
        private OrderStatusService $orderStatusService,
        private RefundService $refunds,
    ) {
    }

    // List this customer's orders that they have not hidden
    public function index(Request $request)
    {
        // placed(): an online order whose payment never landed is
        $orders = Order::with(self::RELATIONS)
            ->placed()
            ->where('user_id', $request->user()->id)
            ->whereNull('hidden_from_customer_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'orders' => $orders->map(fn (Order $order) => $this->present($order)),
        ]);
    }

    // Show one of the customer's own orders
    public function show(Request $request, Order $order)
    {
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        $order->load(self::RELATIONS);

        return response()->json(['order' => $this->present($order)]);
    }

    // Powers the cancellation modal
    public function refundOptions(Request $request, Order $order)
    {
        // Only the owner may see this
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // Ask the refund service how much can be refunded and how
        $context = $this->refunds->refundContext($order);

        return response()->json([
            'cancellable' => in_array($order->status, OrderStatusService::CUSTOMER_CANCELLABLE, true),
            'refundable' => ! $context['is_cod'] && $context['refundable_amount'] > 0,
            'isCod' => $context['is_cod'],
            'orderTotal' => $context['order_total'],
            'refundableAmount' => $context['refundable_amount'],
            'walletPortion' => $context['wallet_portion'],
            'gatewayPortion' => $context['gateway_portion'],
            // Balance spent on an order that was never paid for.
            'walletReturnAmount' => $context['wallet_return_amount'],
            // Cash still at the door.
            'codUnpaidAmount' => $context['cod_unpaid_amount'],
            'methods' => $context['methods'],
            'paymentMethod' => $context['payment_method'],
            'paymentGateway' => $context['payment_gateway'],
            // Which SSLCommerz channel the money came in through
            'paymentChannel' => $context['payment_channel'],
            'note' => $context['reason'],
        ]);
    }

    // Customer cancels their own order
    public function cancel(Request $request, Order $order)
    {
        // Only the owner may cancel
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // The customer picks where the money goes
        $validator = Validator::make($request->all(), [
            'refund_method' => 'nullable|string|in:' . Refund::METHOD_WALLET . ',' . Refund::METHOD_ORIGINAL_PAYMENT,
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Cancel through the service; it also raises any refund that is due
        try {
            $order = $this->orderStatusService->customerCancel(
                $order,
                $request->user(),
                null,
                $request->input('refund_method'),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Reload the order with its new refunds
        $order->load(self::RELATIONS);
        $refunds = $order->refunds;

        return response()->json([
            'order' => $this->present($order),
            'refund_initiated' => $refunds->isNotEmpty(),
            'refunds' => $refunds->map(fn (Refund $refund) => $this->presentRefund($refund))->values(),
            // Kept for the existing cancel banner, which reads a single refund.
            'refund' => $refunds->isNotEmpty() ? $this->presentRefund($refunds->first()) : null,
        ]);
    }

    // Hide a finished order from the customer's list
    public function destroy(Request $request, Order $order)
    {
        // Only the owner may do this
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        if (! in_array($order->status, self::DELETABLE_STATUSES, true)) {
            return response()->json([
                'message' => 'Only delivered or cancelled orders can be deleted.',
            ], 422);
        }

        // Soft-hide it (admins still see it)
        $order->update(['hidden_from_customer_at' => now()]);

        return response()->json(['message' => 'Order deleted.']);
    }

    // What the customer asked for on this order, if anything.
    private function presentReturnRequest(Order $order): ?array
    {
        // Use the loaded relation if present, otherwise query it
        $request = $order->relationLoaded('returnRequest')
            ? $order->returnRequest
            : $order->returnRequest()->first();

        if (! $request) {
            return null;
        }

        // Is an admin decision still pending?
        $isOpen = in_array($request->status, self::OPEN_REQUEST_STATUSES, true);

        // Named by what the customer is asking for
        $wants = $request->resolution ?: $request->requested_resolution;
        $kind = $request->type === 'Refund' || $wants !== 'Replacement' ? 'Refund' : 'Return';

        return [
            'id' => $request->request_number,
            'requestId' => $request->id,
            'type' => $request->type,
            'requestedResolution' => $request->requested_resolution,
            'status' => $request->status,
            'isOpen' => $isOpen,
            'statusLabel' => $isOpen ? "{$kind} Submitted" : null,
            'submittedAt' => $request->created_at?->toIso8601String(),
        ];
    }

    // Shape a refund for the customer's order page
    private function presentRefund(Refund $refund): array
    {
        return [
            'id' => $refund->id,
            'refundNumber' => $refund->refund_number,
            'amount' => $refund->amount,
            'method' => $refund->refund_method,
            'methodLabel' => $refund->methodLabel(),
            'status' => $refund->status,
            'statusLabel' => $refund->statusLabel(),
            'paymentMethod' => $refund->payment_method,
            'paymentGateway' => $refund->payment_gateway === 'BAZARGHAT_WALLET' ? 'BazarGhat Balance' : $refund->payment_gateway,
            'failureReason' => $refund->failure_reason,
            'createdAt' => $refund->created_at?->toIso8601String(),
            'processedAt' => $refund->processed_at?->toIso8601String(),
            'completedAt' => $refund->completed_at?->toIso8601String(),
        ];
    }

    // Shape an order into the array the customer pages use
    private function present(Order $order): array
    {
        // Assigned delivery man, if any
        $assignment = $order->deliveryAssignment;
        $rider = $assignment?->deliveryProfile?->user;

        // All refunds on the order; the first is the headline one
        $refunds = $order->relationLoaded('refunds') ? $order->refunds : $order->refunds()->get();
        $primaryRefund = $refunds->first();

        return [
            'id' => $order->order_number,
            'orderId' => $order->id,
            'date' => $order->created_at->format('Y-m-d'),
            'status' => $order->status,
            'cancelledBy' => $order->cancelled_by,
            'rejectionReason' => $order->rejection_reason,
            'isReplacement' => $order->is_replacement,
            'replacementForOrderNumber' => $order->is_replacement ? $order->replacementFor?->order_number : null,
            'paymentStatus' => $order->payment_status,
            'paymentMethod' => $order->payment_method,
            'paymentChannel' => $order->paymentChannelName(),
            // Gateway and channel in one string — "SSLCommerz (bKash)".
            'paymentLabel' => $order->paymentMethodLabel(),
            'subtotal' => $order->subtotal,
            'discount' => $order->discount,
            'deliveryFee' => $order->delivery_fee,
            'couponDiscount' => $order->couponCashDiscount(),
            'walletAmount' => $order->wallet_amount,
            'total' => $order->total_amount,
            'shippingAddress' => $order->shipping_address,
            // The one return/refund request this order is allowed.
            'returnRequest' => $this->presentReturnRequest($order),
            'refunds' => $refunds->map(fn (Refund $refund) => $this->presentRefund($refund))->values(),
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->product_name,
                'qty' => $item->quantity,
                'price' => $item->unit_price,
                'lineTotal' => $item->line_total,
            ]),
            'tracking' => [
                'currentStatus' => $order->status,
                'rider' => $rider ? [
                    'name' => $rider->name,
                    'phone' => $rider->phone,
                    'area' => $assignment->area,
                    'status' => $assignment->rider_status,
                ] : null,
                'history' => $order->statusHistories->map(fn ($h) => [
                    'status' => $h->status,
                    'note' => $h->note,
                    'by' => $h->changed_by_role,
                    'byName' => $h->actor?->name,
                    'at' => $h->created_at->toIso8601String(),
                ]),
                // The tracking timeline shows one headline refund
                'refund' => $primaryRefund ? [
                    'status' => $primaryRefund->statusLabel(),
                    'amount' => (int) $refunds->where('status', '!=', Refund::STATUS_FAILED)->sum('amount'),
                    'method' => $primaryRefund->methodLabel(),
                    'initiatedAt' => $primaryRefund->created_at,
                    'processingAt' => $primaryRefund->processed_at,
                    'completedAt' => $primaryRefund->completed_at,
                ] : null,
                'replacementOrder' => $order->replacementOrder ? [
                    'orderNumber' => $order->replacementOrder->order_number,
                    'orderId' => $order->replacementOrder->id,
                    'status' => $order->replacementOrder->status,
                ] : null,
            ],
        ];
    }
}
