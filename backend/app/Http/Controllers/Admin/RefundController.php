<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Models\RefundLog;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

// The admin's view of every refund
class RefundController extends Controller
{
    // Inject the refund service
    public function __construct(private RefundService $refunds)
    {
    }

    // List refunds with status, method and search filters, plus tab counts
    public function index(Request $request)
    {
        // Load refunds with their order and customer, newest first
        $query = Refund::with(['order', 'customer'])->orderByDesc('id');

        // Filter by status unless "ALL" is chosen
        if ($request->filled('status') && strtoupper($request->status) !== 'ALL') {
            $query->where('status', strtoupper($request->status));
        }

        // Filter by refund method
        if ($request->filled('method')) {
            $query->where('refund_method', strtoupper($request->method));
        }

        // Search by refund number, transaction ids, order number or customer name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('refund_number', 'like', "%{$search}%")
                    ->orWhere('sslcommerz_refund_id', 'like', "%{$search}%")
                    ->orWhere('original_transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('order', fn ($o) => $o->where('order_number', 'like', "%{$search}%"))
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        $refunds = $query->get();

        // Send the list and the number of refunds in each status
        return response()->json([
            'refunds' => $refunds->map(fn (Refund $refund) => $this->present($refund)),
            'counts' => [
                'ALL' => Refund::count(),
                'PENDING' => Refund::where('status', Refund::STATUS_PENDING)->count(),
                'PROCESSING' => Refund::where('status', Refund::STATUS_PROCESSING)->count(),
                'COMPLETED' => Refund::where('status', Refund::STATUS_COMPLETED)->count(),
                'FAILED' => Refund::where('status', Refund::STATUS_FAILED)->count(),
                'REJECTED' => Refund::where('status', Refund::STATUS_REJECTED)->count(),
            ],
            // How many post-delivery requests are sitting on the admin's desk.
            'awaitingApproval' => Refund::where('source', Refund::SOURCE_POST_DELIVERY)
                ->where('status', Refund::STATUS_PENDING)
                ->whereNull('approved_at')
                ->count(),
        ]);
    }

    // Full detail plus the audit trail of everything that happened to this refund
    public function show(Refund $refund)
    {
        $refund->load(['order', 'customer', 'logs', 'returnRequest', 'approver']);

        $return = $refund->returnRequest;

        return response()->json([
            'refund' => array_merge($this->present($refund), [
                'reason' => $refund->reason,
                'requestedByRole' => $refund->requested_by_role,
                'approvedBy' => $refund->approver?->name,
                'orderAmount' => $refund->order?->total_amount,
                'walletAmountOnOrder' => $refund->order?->wallet_amount,
                // Where this order's money actually came from
                'paymentBreakdown' => $refund->order
                    ? $this->breakdown($refund->order)
                    : null,
                // Everything an admin needs to judge a post-delivery request
                'returnRequest' => $return ? [
                    'id' => $return->id,
                    'requestNumber' => $return->request_number,
                    'type' => $return->type,
                    'product' => $return->product_name,
                    'quantity' => $return->quantity,
                    'price' => $return->price,
                    'reason' => $return->reason,
                    'note' => $return->note,
                    'status' => $return->status,
                    'preferredRefundMethod' => $return->preferred_refund_method,
                ] : null,
                'timeline' => $refund->logs->map(fn (RefundLog $log) => [
                    'id' => $log->id,
                    'event' => $log->event,
                    'from' => $log->from_status,
                    'to' => $log->to_status,
                    'message' => $log->message,
                    'context' => $log->context,
                    'at' => $log->created_at?->toIso8601String(),
                ]),
            ]),
        ]);
    }

    // Re-checks a refund against SSLCommerz on demand
    // Validate the optional refund method
    public function approve(Request $request, Refund $refund)
    {
        $validator = Validator::make($request->all(), [
            // The admin may redirect the money, but never set its amount.
            'refund_method' => 'nullable|string|in:' . Refund::METHOD_WALLET . ',' . Refund::METHOD_ORIGINAL_PAYMENT,
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Approve the refund through the service; a rule error returns 422
        try {
            $refund = $this->refunds->approveRefund($refund, $request->user(), $request->input('refund_method'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $refund = $refund->fresh(['order', 'customer']);

        // Send back the refund and a message that depends on how the money is returned
        return response()->json([
            'refund' => $this->present($refund),
            'message' => $refund->refund_method === Refund::METHOD_ORIGINAL_PAYMENT
                ? 'Refund approved. It has been sent to SSLCommerz and may take up to 3 days to reach the original payment method.'
                : 'Refund approved and added to the customer\'s account balance.',
        ]);
    }

    // Refuses a post-delivery refund.
    public function reject(Request $request, Refund $refund)
    {
        // A rejection must include a reason
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Reject the refund through the service
        try {
            $refund = $this->refunds->rejectRefund($refund, $request->user(), $request->input('reason'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'refund' => $this->present($refund->fresh(['order', 'customer'])),
            'message' => 'Refund request rejected.',
        ]);
    }

    // Ask SSLCommerz for the latest status of one refund
    public function sync(Refund $refund)
    {
        $refund = $this->refunds->syncStatus($refund);

        return response()->json([
            'refund' => $this->present($refund->fresh(['order', 'customer'])),
            'message' => 'Refund status re-checked with the payment gateway.',
        ]);
    }

    // The order's payment sources in the shape the detail screen reads.
    private function breakdown(\App\Models\Order $order): array
    {
        $breakdown = $this->refunds->paymentBreakdown($order);

        return [
            'orderTotal' => $breakdown['order_total'],
            'walletPaid' => $breakdown['wallet_paid_amount'],
            'onlinePaid' => $breakdown['online_paid_amount'],
            'codPaid' => $breakdown['cod_paid_amount'],
            'codUnpaid' => $breakdown['cod_unpaid_amount'],
            'actualPaid' => $breakdown['actual_paid_amount'],
            'walletReturned' => $breakdown['wallet_returned_amount'],
            'refunded' => $breakdown['refunded_amount'],
            'refundInProgress' => $breakdown['refund_in_progress_amount'],
            'refundableRemaining' => $breakdown['refundable_amount'],
            'paymentMethod' => $breakdown['payment_method'],
            'paymentGateway' => $breakdown['payment_gateway'],
            'paymentChannel' => $breakdown['payment_channel'],
            'paymentStatus' => $breakdown['payment_status'],
            'originalTransactionId' => $breakdown['original_transaction_id'],
            'gatewayTransactionId' => $breakdown['gateway_transaction_id'],
            'gatewayReferenceAvailable' => $breakdown['gateway_reference_available'],
            'isCod' => $breakdown['is_cod'],
        ];
    }

    // Shape a refund into the array the admin page uses
    private function present(Refund $refund): array
    {
        return [
            'id' => $refund->id,
            'refundNumber' => $refund->refund_number,
            'orderId' => $refund->order_id,
            'orderNumber' => $refund->order?->order_number,
            'customer' => $refund->customer?->name ?? $refund->order?->customer_name,
            'customerPhone' => $refund->order?->customer_phone,
            'orderAmount' => $refund->order?->total_amount,
            'amount' => $refund->amount,
            'refundMethod' => $refund->refund_method,
            'refundMethodLabel' => $refund->methodLabel(),
            // A balance credit that stood in for a gateway refund, and why.
            'isManualFallback' => (bool) $refund->is_manual_fallback,
            'fallbackReason' => $refund->fallback_reason,
            'paymentMethod' => $refund->payment_method,
            'paymentGateway' => $refund->payment_gateway,
            'originalTransactionId' => $refund->original_transaction_id,
            'gatewayTransactionId' => $refund->gateway_transaction_id,
            'sslcommerzRefundId' => $refund->sslcommerz_refund_id,
            'status' => $refund->status,
            'statusLabel' => $refund->statusLabel(),
            'source' => $refund->source,
            'awaitsApproval' => $refund->awaitsApproval(),
            'returnRequestId' => $refund->return_request_id,
            'failureReason' => $refund->failure_reason,
            'rejectionReason' => $refund->rejection_reason,
            'date' => $refund->created_at?->toIso8601String(),
            'approvedAt' => $refund->approved_at?->toIso8601String(),
            'rejectedAt' => $refund->rejected_at?->toIso8601String(),
            'processedAt' => $refund->processed_at?->toIso8601String(),
            'completedAt' => $refund->completed_at?->toIso8601String(),
            'lastCheckedAt' => $refund->last_checked_at?->toIso8601String(),
        ];
    }
}
