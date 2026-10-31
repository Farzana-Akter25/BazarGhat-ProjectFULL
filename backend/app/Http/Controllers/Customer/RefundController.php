<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Services\RefundService;
use Illuminate\Http\Request;

// The customer's own refund history and live refund status.
class RefundController extends Controller
{
    // Inject the refund service
    public function __construct(private RefundService $refunds)
    {
    }

    // List this customer's refunds, newest first
    public function index(Request $request)
    {
        $refunds = Refund::with('order')
            ->where('customer_id', $request->user()->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'refunds' => $refunds->map(fn (Refund $refund) => $this->present($refund)),
        ]);
    }

    // Show one refund, refreshing its status from the gateway if needed
    public function show(Request $request, Refund $refund)
    {
        // A customer may only see their own refunds
        abort_unless($refund->customer_id === $request->user()->id, 403, 'Forbidden.');

        // A gateway refund the customer is actively watching is
        if ($refund->status === Refund::STATUS_PROCESSING
            && $refund->refund_method === Refund::METHOD_ORIGINAL_PAYMENT
            && (! $refund->last_checked_at || $refund->last_checked_at->lt(now()->subMinutes(2)))) {
            $refund = $this->refunds->syncStatus($refund);
        }

        return response()->json(['refund' => $this->present($refund->fresh('order'))]);
    }

    // Shape a refund into the array the customer page uses
    private function present(Refund $refund): array
    {
        return [
            'id' => $refund->id,
            'refundNumber' => $refund->refund_number,
            'orderId' => $refund->order_id,
            'orderNumber' => $refund->order?->order_number,
            'amount' => $refund->amount,
            'method' => $refund->refund_method,
            'methodLabel' => $refund->methodLabel(),
            'paymentMethod' => $refund->payment_method,
            'paymentGateway' => $refund->payment_gateway === 'BAZARGHAT_WALLET' ? 'BazarGhat Balance' : $refund->payment_gateway,
            'status' => $refund->status,
            'statusLabel' => $refund->statusLabel(),
            'source' => $refund->source,
            // True while an admin still has to agree to a post-delivery refund
            'awaitsApproval' => $refund->awaitsApproval(),
            'reason' => $refund->reason,
            'failureReason' => $refund->failure_reason,
            'rejectionReason' => $refund->rejection_reason,
            'sslcommerzReference' => $refund->sslcommerz_refund_id,
            'date' => $refund->created_at?->toIso8601String(),
            'requestedAt' => $refund->created_at?->toIso8601String(),
            'approvedAt' => $refund->approved_at?->toIso8601String(),
            'rejectedAt' => $refund->rejected_at?->toIso8601String(),
            'processedAt' => $refund->processed_at?->toIso8601String(),
            'completedAt' => $refund->completed_at?->toIso8601String(),
        ];
    }
}
