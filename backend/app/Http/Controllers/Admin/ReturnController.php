<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Models\StockTransaction;
use App\Models\User;
use App\Services\OrderStatusService;
use App\Services\RefundService;
use App\Services\ReplacementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

// Admin endpoints for return and refund requests from customers
class ReturnController extends Controller
{
    // Statuses the admin can set on a request
    private const STATUSES = ['Pending', 'In Review', 'Approved', 'Rejected', 'Completed'];

    // Inject the replacement, refund and order status services
    public function __construct(
        private ReplacementService $replacementService,
        private RefundService $refunds,
        private OrderStatusService $orderStatus,
    ) {
    }

    // List all return/refund requests with their order, pickup and refunds
    public function index()
    {
        $requests = ReturnRequest::with([
            'order.returnPickupAssignment.deliveryProfile.user',
            'customer',
            'refunds',
        ])->orderByDesc('id')->get();

        return response()->json([
            'requests' => $requests->map(fn (ReturnRequest $request) => $this->present($request)),
        ]);
    }

    // Change a request's status (approve, reject, etc.) and run what follows from it
    public function updateStatus(Request $request, ReturnRequest $returnRequest)
    {
        // Validate the new status and the optional admin note
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:' . implode(',', self::STATUSES),
            'admin_note' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $status = $request->status;
        // Both of these are deferred until after the status change has committed
        $raiseRefund = false;
        $attemptReplacement = false;

        DB::transaction(function () use ($request, $returnRequest, $status, &$raiseRefund, &$attemptReplacement) {
            // Row lock so two concurrent status updates on the
            $returnRequest = ReturnRequest::where('id', $returnRequest->id)->lockForUpdate()->first();

            if ($status === 'Approved') {
                // Approving a return does not touch inventory
                if ($this->wantsReplacement($returnRequest)) {
                    $attemptReplacement = ! $returnRequest->resolution;
                } elseif ($returnRequest->refunds()->doesntExist() && ! $returnRequest->resolution) {
                    // Approving a refund request raises the refund
                    $raiseRefund = true;
                }
            } elseif ($status !== 'Approved'
                && $returnRequest->stock_restored
                && ! $returnRequest->resolution
                && ! $returnRequest->received_at) {
                // Approval is being undone (e.g. Approved -> Rejected) on
                $productId = $returnRequest->orderItem?->product_id;
                if ($productId) {
                    $this->adjustStockForReturn($returnRequest, $productId, -$returnRequest->quantity, StockTransaction::TYPE_RETURN_APPROVAL_REVERSED, 'Return approval reversed');
                }
                $returnRequest->stock_restored = false;
            }

            // Save the new status and note
            $returnRequest->status = $status;
            $returnRequest->admin_note = $request->input('admin_note', $returnRequest->admin_note);
            $returnRequest->save();
        });

        // Tell the customer about an approval or rejection
        $this->announceDecision($returnRequest->fresh(['order', 'customer']), $status);

        // The goods are what the return branch is about
        $this->syncCollectionBranch($returnRequest->fresh('order'), $status, $request->user());

        if ($status === 'Rejected') {
            // Rejecting the request rejects any refund still waiting on a decision
            $this->rejectPendingRefunds($returnRequest, $request->user(), $request->input('admin_note'));
        }

        // Open the refund now that the request is approved
        if ($raiseRefund) {
            try {
                $this->refunds->openReturnRefund(
                    $returnRequest->fresh(),
                    $returnRequest->preferred_refund_method,
                    $request->user(),
                    'admin',
                );
            } catch (RuntimeException $e) {
                // The status change stands
                return response()->json([
                    'request' => $this->present($returnRequest->fresh(['order', 'customer'])),
                    'message' => $e->getMessage(),
                    'refund_raised' => false,
                ], 422);
            }
        }

        // Try to create the replacement order
        if ($attemptReplacement) {
            // The customer asked for the item replaced
            $message = $this->tryReplacement($returnRequest->fresh(), $request->user());

            if ($message) {
                return response()->json([
                    'request' => $this->present($returnRequest->fresh(['order', 'customer'])),
                    'message' => $message,
                    'replacement_created' => false,
                ], 422);
            }
        }

        // Success: send back the updated request
        return response()->json([
            'request' => $this->present($returnRequest->fresh(['order', 'customer'])),
        ]);
    }

    // Keeps the order's return branch in step with the decision just recorded.
    private function syncCollectionBranch(ReturnRequest $returnRequest, string $status, User $admin): void
    {
        // Only item returns with an order have a collection branch
        if ($returnRequest->type !== 'Return' || ! $returnRequest->order) {
            return;
        }

        if ($status === 'Approved') {
            // Goods already checked in have nothing left to collect.
            if ($returnRequest->received_at) {
                return;
            }

            $this->orderStatus->markReturnApproved(
                $returnRequest->order,
                $admin,
                "Return {$returnRequest->request_number} approved — goods awaiting collection.",
            );

            return;
        }

        // On rejection, cancel the pickup and any replacement already sent
        if ($status === 'Rejected') {
            $this->orderStatus->revertReturnApproval(
                $returnRequest->order,
                $admin,
                "Return {$returnRequest->request_number} rejected — collection cancelled.",
            );

            // A replacement already issued on this request went out on that collection
            $this->orderStatus->cancelWithdrawnReplacement(
                $returnRequest->order->fresh(),
                $admin,
                "Return {$returnRequest->request_number} rejected — replacement cancelled.",
            );
        }
    }

    // Did the customer ask for the item replaced rather than refunded?
    private function wantsReplacement(ReturnRequest $returnRequest): bool
    {
        return $returnRequest->type === 'Return'
            && $returnRequest->requested_resolution === 'Replacement';
    }

    // Creates the replacement order the customer asked for.
    private function tryReplacement(ReturnRequest $returnRequest, $admin): ?string
    {
        // Stop if the product is out of stock or discontinued
        if (! $this->replacementService->isAvailable($returnRequest)) {
            return 'Return approved, but a replacement is not available for this product (out of stock or discontinued). Issue a refund instead.';
        }

        // Create the new replacement order
        try {
            $newOrder = $this->replacementService->create($returnRequest, $admin);
        } catch (RuntimeException $e) {
            return 'Return approved, but the replacement could not be created: ' . $e->getMessage();
        }

        // Mirrors resolve()'s replacement branch exactly
        $returnRequest->update([
            'resolution' => 'Replacement',
            'replacement_order_id' => $newOrder->id,
            'status' => 'Completed',
        ]);

        return null;
    }

    // Tells the customer the decision on their request.
    private function announceDecision(ReturnRequest $returnRequest, string $status): void
    {
        // Only approvals and rejections are announced
        if (! in_array($status, ['Approved', 'Rejected'], true)) {
            return;
        }

        // Build the wording: "return"/"refund", the order number and the outcome
        $kind = strtolower($returnRequest->type);
        $number = $returnRequest->order?->order_number;
        $approved = $status === 'Approved';

        // Send the notification to the customer
        app(NotificationService::class)->send(
            $returnRequest->customer,
            $approved ? NotificationService::RETURN_APPROVED : NotificationService::RETURN_REJECTED,
            ucfirst($kind) . ($approved ? ' approved' : ' rejected'),
            $approved
                ? "Your {$kind} request for order {$number} has been approved."
                : "Your {$kind} request for order {$number} was not approved.",
            NotificationService::REF_RETURN,
            $returnRequest->id,
            $approved ? SystemNotification::PRIORITY_SUCCESS : SystemNotification::PRIORITY_WARNING,
            ($approved ? NotificationService::RETURN_APPROVED : NotificationService::RETURN_REJECTED) . ":return:{$returnRequest->id}",
        );
    }

    // Payment & Return Policy
    public function resolve(Request $request, ReturnRequest $returnRequest)
    {
        // Choose replacement or refund, and optionally the refund method
        $validator = Validator::make($request->all(), [
            'resolution' => 'required|string|in:Replacement,Refund',
            // Where the money goes.
            'refund_method' => 'nullable|string|in:' . Refund::METHOD_WALLET . ',' . Refund::METHOD_ORIGINAL_PAYMENT,
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Only an approved item return can be resolved
        if ($returnRequest->type !== 'Return' || $returnRequest->status !== 'Approved') {
            return response()->json(['message' => 'Only an approved return request can be resolved.'], 422);
        }

        // A request can only be resolved once
        if ($returnRequest->resolution) {
            return response()->json(['message' => 'This request has already been resolved.'], 422);
        }

        // Replacement: check availability, create the new order and complete the request
        if ($request->resolution === 'Replacement') {
            if (! $this->replacementService->isAvailable($returnRequest)) {
                return response()->json([
                    'message' => 'Replacement is not available for this product (out of stock or discontinued). Please issue a refund instead.',
                ], 422);
            }

            try {
                $newOrder = $this->replacementService->create($returnRequest, $request->user());
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            $returnRequest->update([
                'resolution' => 'Replacement',
                'replacement_order_id' => $newOrder->id,
                'status' => 'Completed',
            ]);
        } else {
            // Deciding to refund raises the refund; it does not pay it out.
            try {
                $this->refunds->openReturnRefund(
                    $returnRequest,
                    $request->input('refund_method'),
                    $request->user(),
                    'admin',
                );
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        return response()->json([
            'request' => $this->present($returnRequest->fresh(['order', 'customer'])),
        ]);
    }

    // Records that the returned goods physically reached the admin.
    public function receiveItems(Request $request, ReturnRequest $returnRequest)
    {
        // Validate the counted quantities and the optional note
        $validator = Validator::make($request->all(), [
            // Counts of what came back
            'restock_quantity' => 'nullable|integer|min:0',
            'damaged_quantity' => 'nullable|integer|min:0',
            'note' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Only an item return can be checked in
        if ($returnRequest->type !== 'Return' || ! $returnRequest->order_item_id) {
            return response()->json(['message' => 'Only an item return can have goods checked back in.'], 422);
        }

        // The return must be approved first
        if (! in_array($returnRequest->status, ['Approved', 'Completed'], true)) {
            return response()->json(['message' => 'Approve the return before checking the goods back in.'], 422);
        }

        // Goods can only be checked in once
        if ($returnRequest->received_at) {
            return response()->json(['message' => 'The goods for this return have already been checked in.'], 422);
        }

        // Numbers of units restocked and units damaged
        $restock = (int) $request->input('restock_quantity', 0);
        $damaged = (int) $request->input('damaged_quantity', 0);

        // Cannot check in more units than the return covers
        if ($restock + $damaged > $returnRequest->quantity) {
            return response()->json([
                'message' => "This return covers {$returnRequest->quantity} unit(s); you cannot check in more than that.",
            ], 422);
        }

        // Save the check-in details under a row lock
        DB::transaction(function () use ($returnRequest, $restock, $damaged, $request) {
            // Row lock so two admins confirming the same return
            $locked = ReturnRequest::where('id', $returnRequest->id)->lockForUpdate()->first();

            if ($locked->received_at) {
                throw new RuntimeException('The goods for this return have already been checked in.');
            }

            $locked->forceFill([
                'received_at' => now(),
                // What the admin counted, if they counted it.
                'restocked_quantity' => $restock,
                'damaged_quantity' => $damaged,
                'admin_note' => $request->filled('note') ? $request->input('note') : $locked->admin_note,
            ])->save();
        });

        // Send back the updated request
        return response()->json([
            'request' => $this->present($returnRequest->fresh(['order', 'customer', 'refunds'])),
        ]);
    }

    // What can be refunded for this request, and where it is allowed to go.
    public function refundOptions(ReturnRequest $returnRequest)
    {
        // Ask the refund service what can be refunded and how
        $context = $this->refunds->returnRefundContext($returnRequest);

        // Send the refund options to the admin screen
        return response()->json([
            'refundable' => $context['refundable_amount'] > 0,
            'refundableAmount' => $context['refundable_amount'],
            'eligibleAmount' => $context['eligible_amount'],
            // Delivery charge held back because the goods were already delivered
            'deliveryCharge' => $context['delivery_charge'],
            'methods' => $context['methods'],
            'preferredMethod' => $context['preferred_method'],
            'gatewayRefundAvailable' => $context['gateway_refund_available'],
            'paymentMethod' => $context['payment_method'],
            'isCod' => $context['is_cod'],
            'note' => $context['reason'],
        ]);
    }

    // Deprecated: a refund's status is now owned by the refund itself.
    public function updateRefundStatus(Request $request, ReturnRequest $returnRequest)
    {
        return response()->json([
            'request' => $this->present($returnRequest->fresh(['order', 'customer'])),
            'message' => 'Refund status is tracked against the refund itself and cannot be set by hand.',
        ]);
    }

    // Rejects every refund on this request that is still awaiting a decision.
    private function rejectPendingRefunds(ReturnRequest $returnRequest, $admin, ?string $note): void
    {
        // Load refunds on this request that are still pending
        $pending = $returnRequest->refunds()->where('status', Refund::STATUS_PENDING)->get();

        // Reject each one; a failure on one does not stop the others
        foreach ($pending as $refund) {
            try {
                $this->refunds->rejectRefund($refund, $admin, $note ?: 'The return request was rejected.');
            } catch (RuntimeException $e) {
                report($e);
            }
        }
    }

    // Delete a return/refund request
    public function destroy(ReturnRequest $returnRequest)
    {
        $returnRequest->delete();

        return response()->json(['message' => 'Request deleted']);
    }

    // Applies a signed stock delta
    private function adjustStockForReturn(ReturnRequest $returnRequest, int $productId, int $delta, string $transactionType, string $reason): void
    {
        // Lock the product row before changing its stock
        $product = Product::where('id', $productId)->lockForUpdate()->first();

        if (! $product) {
            return;
        }

        // A negative change can never push stock below zero
        $previousStock = $product->stock;
        $appliedDelta = $delta < 0 ? -min(abs($delta), $previousStock) : $delta;
        $product->stock = $previousStock + $appliedDelta;
        $product->save();

        // Log the stock change
        StockTransaction::create([
            'product_id' => $product->id,
            'order_id' => $returnRequest->order_id,
            'transaction_type' => $transactionType,
            'quantity' => abs($appliedDelta),
            'previous_stock' => $previousStock,
            'new_stock' => $product->stock,
            'reason' => $reason,
            'created_by' => auth()->id(),
        ]);
    }

    // Shape a return request into the array the admin page uses
    private function present(ReturnRequest $returnRequest): array
    {
        return [
            'id' => $returnRequest->request_number,
            'requestId' => $returnRequest->id,
            'orderId' => $returnRequest->order->order_number,
            // Where the order itself has got to.
            'orderStatus' => $returnRequest->order->status,
            // The collection run itself
            'pickup' => $this->presentPickup($returnRequest),
            'customer' => $returnRequest->customer?->name ?? $returnRequest->order->customer_name,
            'customerCode' => $returnRequest->customer_id ? 'CUST' . str_pad($returnRequest->customer_id, 4, '0', STR_PAD_LEFT) : null,
            'phone' => $returnRequest->customer?->phone ?? $returnRequest->order->customer_phone,
            'type' => $returnRequest->type,
            // What the customer asked for
            'requestedResolution' => $returnRequest->requested_resolution,
            'source' => $returnRequest->source,
            'product' => $returnRequest->product_name,
            'variant' => $returnRequest->variant,
            'qty' => $returnRequest->quantity,
            'price' => $returnRequest->price,
            'reason' => $returnRequest->reason,
            'note' => $returnRequest->note,
            'adminNote' => $returnRequest->admin_note,
            'photos' => $this->photoUrls($returnRequest->photos),
            'amount' => $returnRequest->amount,
            'payment' => $returnRequest->payment_method,
            'shipping' => $returnRequest->shipping_fee,
            'status' => $returnRequest->status,
            'resolution' => $returnRequest->resolution,
            // Whether the goods have physically come back
            'receivedAt' => $returnRequest->received_at,
            'restockedQuantity' => $returnRequest->restocked_quantity,
            'damagedQuantity' => $returnRequest->damaged_quantity,
            'replacementOrderId' => $returnRequest->replacementOrder?->order_number,
            'refundStatus' => $returnRequest->refund_status,
            'preferredRefundMethod' => $returnRequest->preferred_refund_method,
            'refundMethod' => $returnRequest->refund_method,
            // The real refunds behind this request
            'refunds' => $returnRequest->refunds->map(fn (Refund $refund) => [
                'id' => $refund->id,
                'refundNumber' => $refund->refund_number,
                'amount' => $refund->amount,
                'method' => $refund->refund_method,
                'methodLabel' => $refund->methodLabel(),
                'status' => $refund->status,
                'statusLabel' => $refund->statusLabel(),
                'awaitsApproval' => $refund->awaitsApproval(),
                'failureReason' => $refund->failure_reason,
                'rejectionReason' => $refund->rejection_reason,
                'sslcommerzRefundId' => $refund->sslcommerz_refund_id,
            ])->values(),
            'refundInitiatedAt' => $returnRequest->refund_initiated_at,
            'refundProcessingAt' => $returnRequest->refund_processing_at,
            'refundCompletedAt' => $returnRequest->refund_completed_at,
            'date' => $returnRequest->created_at->format('d M Y'),
            'time' => $returnRequest->created_at->format('h:i A'),
            'orderDate' => $returnRequest->order->created_at->format('d M Y, h:i A'),
        ];
    }

    // The rider errand collecting this return's goods
    private function presentPickup(ReturnRequest $returnRequest): ?array
    {
        // The pickup assignment linked to this order, if any
        $assignment = $returnRequest->order?->returnPickupAssignment;

        if (! $assignment) {
            return null;
        }

        return [
            'id' => $assignment->id,
            'rider' => $assignment->deliveryProfile?->user?->name,
            'riderPhone' => $assignment->deliveryProfile?->user?->phone,
            'area' => $assignment->area,
            'status' => $assignment->status,
            // "Failed" here is a run the rider declined or could not complete
            'riderStatus' => $assignment->rider_status,
            'rejectionReason' => $assignment->rejection_reason,
            'assignedAt' => $assignment->assigned_at?->format('d M Y, h:i A'),
            'completedAt' => $assignment->completed_at?->format('d M Y, h:i A'),
        ];
    }

    // Turn stored photo paths into full public URLs
    private function photoUrls(?array $photos): array
    {
        return collect($photos ?? [])
            ->map(fn (string $path) => Str::startsWith($path, ['http://', 'https://']) ? $path : Storage::disk('public')->url($path))
            ->all();
    }
}
