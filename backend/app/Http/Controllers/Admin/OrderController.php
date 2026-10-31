<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Refund;
use App\Services\OrderStatusService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

// Admin endpoints for listing and managing orders
class OrderController extends Controller
{
    // Inject the order status service
    public function __construct(private OrderStatusService $orderStatusService)
    {
    }

    // List orders with optional status and search filters
    public function index(Request $request)
    {
        // placed(): an online order whose payment never landed is
        $query = Order::with(['items', 'refunds', 'returnRequest'])->placed()->orderByDesc('id');

        // Filter by status unless "All Status" is chosen
        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->where('status', $request->status);
        }

        // Search by order number or customer name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        $orders = $query->get();

        return response()->json([
            'orders' => $orders->map(fn (Order $order) => $this->present($order)),
        ]);
    }

    // Show one order with its delivery tracking details
    public function show(Order $order)
    {
        $order->load(['items', 'refunds', 'deliveryAssignment.deliveryProfile.user']);

        return response()->json(['order' => $this->present($order, withTracking: true)]);
    }

    // Delete an order; only finished (cancelled or delivered) orders can be removed
    public function destroy(Order $order)
    {
        if (! in_array($order->status, ['Cancelled', 'Delivered'], true)) {
            return response()->json(['message' => 'Only cancelled or delivered orders can be deleted.'], 422);
        }

        $order->delete();

        return response()->json(['message' => 'Order deleted']);
    }

    // Admin only controls Pending -> Processing -> Confirmed
    public function updateStatus(Request $request, Order $order)
    {
        // Only these three statuses can be set by the admin
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:Processing,Confirmed,Cancelled',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // A doorstep rejection is resolved; otherwise cancel or advance the order
        try {
            if ($order->status === 'Customer Rejected at Doorstep' && in_array($request->status, ['Cancelled', 'Confirmed'], true)) {
                $order = $this->orderStatusService->adminResolveDoorstepRejection($order, $request->status, $request->user(), $request->note);
            } elseif ($request->status === 'Cancelled') {
                $order = $this->orderStatusService->adminCancel($order, $request->user(), $request->note);
            } else {
                $order = $this->orderStatusService->adminAdvance($order, $request->status, $request->user(), $request->note);
            }
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['order' => $this->present($order->fresh(['items', 'refunds']))]);
    }

    // Shape an order into the array the admin page uses; optionally with tracking info
    private function present(Order $order, bool $withTracking = false): array
    {
        $data = [
            'id' => $order->order_number,
            'orderId' => $order->id,
            'customer' => $order->customer_name,
            'phone' => $order->customer_phone,
            'area' => $order->shipping_address,
            'date' => $order->created_at->format('Y-m-d'),
            'items' => $order->items->sum('quantity'),
            'amount' => $order->total_amount . 'TK',
            'status' => $order->status,
            'cancelledBy' => $order->cancelled_by,
            'rejectionReason' => $order->rejection_reason,
            'isReplacement' => $order->is_replacement,
            // The return request this order is answering
            'returnRequestId' => $order->returnRequest?->request_number,
            'paymentMethod' => $order->paymentMethodLabel(),
            'paymentStatus' => $order->payment_status,
            'paymentChannel' => $order->paymentChannelName(),
        ];

        // Refund summary for the order row.
        $refunds = $order->relationLoaded('refunds') ? $order->refunds : $order->refunds()->get();
        $primary = $refunds->first();

        if ($primary) {
            $open = $refunds->whereIn('status', Refund::OPEN_STATUSES);
            $failed = $refunds->where('status', Refund::STATUS_FAILED);

            $data['refund'] = [
                'id' => $primary->id,
                'refundNumber' => $primary->refund_number,
                // Worst-still-open status wins
                'status' => $open->isNotEmpty()
                    ? $open->first()->status
                    : ($refunds->where('status', Refund::STATUS_COMPLETED)->isNotEmpty() ? Refund::STATUS_COMPLETED : Refund::STATUS_FAILED),
                'amount' => (int) $refunds->where('status', '!=', Refund::STATUS_FAILED)->sum('amount'),
                'method' => $primary->refund_method,
                'methodLabel' => $primary->methodLabel(),
                'paymentGateway' => $primary->payment_gateway,
                'sslcommerzRefundId' => $refunds->firstWhere(fn ($r) => filled($r->sslcommerz_refund_id))?->sslcommerz_refund_id,
                'failureReason' => $failed->first()?->failure_reason,
                'date' => $primary->created_at?->toIso8601String(),
                'completedAt' => $refunds->max('completed_at')?->toIso8601String(),
                'count' => $refunds->count(),
            ];
        }

        // Tracking details are only added on the order detail view
        if ($withTracking) {
            $assignment = $order->deliveryAssignment;
            $rider = $assignment?->deliveryProfile?->user;
            $replacementOrder = $order->replacementOrder;

            $data['tracking'] = [
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
                'replacementOrder' => $replacementOrder ? [
                    'orderNumber' => $replacementOrder->order_number,
                    'orderId' => $replacementOrder->id,
                    'status' => $replacementOrder->status,
                ] : null,
                'replacementForOrderNumber' => $order->is_replacement ? $order->replacementFor?->order_number : null,
            ];
        }

        return $data;
    }
}
