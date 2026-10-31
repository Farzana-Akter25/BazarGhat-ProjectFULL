<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Notifications\SystemNotification;
use App\Services\InvoiceService;
use App\Services\NotificationService;
use App\Services\OrderStatusService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

// Delivery man endpoints for their assigned orders
class AssignedOrdersController extends Controller
{
    // Statuses a delivery man is allowed to set
    private const RIDER_STATUSES = ['Picked Up', 'Out for Delivery', 'Delivered', 'Customer Rejected at Doorstep', 'Failed', 'Return Picked Up'];

    // Maps each detailed rider status to the simpler admin-side status
    private const COARSE_STATUS_MAP = [
        'Assigned' => 'Pending',
        'Picked Up' => 'In Progress',
        'Out for Delivery' => 'In Progress',
        'Delivered' => 'Completed',
        'Customer Rejected at Doorstep' => 'Completed',
        'Failed' => 'Completed',
        // A collection run has a single step
        'Return Picked Up' => 'Completed',
    ];

    // Inject the order status and notification services
    public function __construct(private OrderStatusService $orderStatusService, private NotificationService $notifications)
    {
    }

    // List every order assigned to this delivery man, newest first
    public function index(Request $request)
    {
        // The logged-in delivery man's profile
        $profile = $request->user()->deliveryProfile;

        $assignments = DeliveryAssignment::with('order.replacementOrder.items')
            ->where('delivery_profile_id', $profile->id)
            ->orderByDesc('assigned_at')
            ->get();

        return response()->json([
            'orders' => $assignments->map(fn (DeliveryAssignment $a) => $this->present($a)),
        ]);
    }

    // Delivery man accepts an assignment
    public function accept(Request $request, DeliveryAssignment $deliveryAssignment)
    {
        $profile = $request->user()->deliveryProfile;

        // Only the assigned delivery man may accept
        if ($deliveryAssignment->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden. This order is not assigned to you.'], 403);
        }

        // Can only accept a fresh, untouched assignment
        if ($deliveryAssignment->rider_status !== 'Assigned' || $deliveryAssignment->accepted_at !== null) {
            return response()->json(['message' => 'This assignment has already been actioned.'], 422);
        }

        // Stamp the time it was accepted
        $deliveryAssignment->update(['accepted_at' => now()]);

        // Guarded above: accepted_at is already set on a second
        $this->notifications->sendToAdmins(
            NotificationService::DELIVERY_ACCEPTED,
            'Assignment accepted',
            "Delivery assignment for order {$deliveryAssignment->order->order_number} was accepted by {$request->user()->name}.",
            NotificationService::REF_DELIVERY_ASSIGNMENT,
            $deliveryAssignment->id,
            SystemNotification::PRIORITY_SUCCESS,
        );

        return response()->json([
            'order' => $this->present($deliveryAssignment->fresh('order')),
        ]);
    }

    // Delivery man declines an assignment before accepting it
    public function reject(Request $request, DeliveryAssignment $deliveryAssignment)
    {
        $profile = $request->user()->deliveryProfile;

        // Only the assigned delivery man may decline
        if ($deliveryAssignment->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden. This order is not assigned to you.'], 403);
        }

        // A reason is required
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Already accepted assignments cannot be declined
        if ($deliveryAssignment->accepted_at !== null) {
            return response()->json(['message' => 'This assignment has already been accepted and cannot be rejected.'], 422);
        }

        // Mark the assignment as failed with the reason
        $deliveryAssignment->update([
            'rider_status' => 'Failed',
            'status' => self::COARSE_STATUS_MAP['Failed'],
            'rejection_reason' => $request->reason,
            'completed_at' => now(),
        ]);

        // A declined collection run goes back to "Return Approved"
        if ($deliveryAssignment->type === 'Return Pickup') {
            $this->orderStatusService->revertReturnPickup($deliveryAssignment->order, $request->user(), $request->reason);
        } else {
            $this->orderStatusService->revertToConfirmed($deliveryAssignment->order, $request->user(), $request->reason);
        }

        // The order is back on the admin desk waiting to be reassigned.
        $this->notifications->sendToAdmins(
            NotificationService::DELIVERY_REJECTED,
            'Assignment rejected',
            "Delivery assignment for order {$deliveryAssignment->order->order_number} was rejected by {$request->user()->name}.",
            NotificationService::REF_DELIVERY_ASSIGNMENT,
            $deliveryAssignment->id,
            SystemNotification::PRIORITY_WARNING,
        );

        return response()->json([
            'order' => $this->present($deliveryAssignment->fresh('order')),
        ]);
    }

    // Delivery man moves an order to its next step (picked up, delivered, etc.)
    public function updateStatus(Request $request, DeliveryAssignment $deliveryAssignment)
    {
        $profile = $request->user()->deliveryProfile;

        // Only the assigned delivery man may update it
        if ($deliveryAssignment->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden. This order is not assigned to you.'], 403);
        }

        // Validate the new status; failures and doorstep rejections need a reason
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:' . implode(',', self::RIDER_STATUSES),
            'reason' => 'required_if:status,Failed|required_if:status,Customer Rejected at Doorstep|nullable|string|max:500',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // The status the rider picked
        $riderStatus = $request->status;

        // A doorstep rejection must use one of the fixed reasons
        if ($riderStatus === 'Customer Rejected at Doorstep'
            && ! in_array($request->reason, OrderStatusService::DOORSTEP_REJECTION_REASONS, true)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['reason' => ['Select a valid doorstep rejection reason.']],
            ], 422);
        }

        // The category drives stock routing (Available vs Damaged).
        $doorstepCategory = $request->reason;
        $doorstepDisplayReason = $riderStatus === 'Customer Rejected at Doorstep' && $request->filled('note')
            ? "{$request->reason} — {$request->note}"
            : $request->reason;

        // Is this run a return pickup rather than a delivery?
        $isReturnPickup = $deliveryAssignment->type === 'Return Pickup';

        // The two errands take different advances
        if ($isReturnPickup && $riderStatus !== 'Return Picked Up' && $riderStatus !== 'Failed') {
            return response()->json(['message' => 'This is a return pickup — it can only be marked collected or failed.'], 422);
        }

        // A normal delivery cannot be marked as a return pickup
        if (! $isReturnPickup && $riderStatus === 'Return Picked Up') {
            return response()->json(['message' => 'This is a delivery, not a return pickup.'], 422);
        }

        // Must accept before picking up
        if (in_array($riderStatus, ['Picked Up', 'Return Picked Up'], true) && $deliveryAssignment->accepted_at === null) {
            return response()->json(['message' => 'Accept the assignment before marking it picked up.'], 422);
        }

        // Failed: close the assignment and put the order back in the queue
        if ($riderStatus === 'Failed') {
            $deliveryAssignment->update([
                'rider_status' => 'Failed',
                'status' => self::COARSE_STATUS_MAP['Failed'],
                'rejection_reason' => $request->reason,
                'completed_at' => now(),
            ]);

            // A failed collection goes back to "Return Approved" for
            if ($isReturnPickup) {
                $this->orderStatusService->revertReturnPickup($deliveryAssignment->order, $request->user(), $request->reason);
            } else {
                $this->orderStatusService->revertToConfirmed($deliveryAssignment->order, $request->user(), $request->reason);
            }

            return response()->json([
                'order' => $this->present($deliveryAssignment->fresh('order')),
            ]);
        }

        // Return collected: move the order on, then close the assignment
        if ($riderStatus === 'Return Picked Up') {
            try {
                $this->orderStatusService->riderCollectedReturn($deliveryAssignment->order, $request->user(), $request->note);
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            $deliveryAssignment->update([
                'rider_status' => 'Return Picked Up',
                'status' => self::COARSE_STATUS_MAP['Return Picked Up'],
                'completed_at' => now(),
            ]);

            return response()->json([
                'order' => $this->present($deliveryAssignment->fresh('order')),
            ]);
        }

        // Normal delivery step: move the order to the matching status
        try {
            $this->orderStatusService->riderAdvance(
                $deliveryAssignment->order,
                $riderStatus,
                $request->user(),
                $riderStatus === 'Customer Rejected at Doorstep' ? $doorstepDisplayReason : $request->reason,
                $riderStatus === 'Customer Rejected at Doorstep' ? $doorstepCategory : null,
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Delivered and doorstep rejection end the assignment
        $isFinal = in_array($riderStatus, ['Delivered', 'Customer Rejected at Doorstep'], true);

        // Save the new rider status on the assignment
        $deliveryAssignment->update([
            'rider_status' => $riderStatus,
            'status' => self::COARSE_STATUS_MAP[$riderStatus],
            'rejection_reason' => $riderStatus === 'Customer Rejected at Doorstep' ? $doorstepDisplayReason : $deliveryAssignment->rejection_reason,
            'completed_at' => $isFinal ? now() : $deliveryAssignment->completed_at,
        ]);

        if ($riderStatus === 'Delivered') {
            // Keeps the rider's lifetime delivery count
            $profile->update([
                'total_deliveries' => DeliveryAssignment::where('delivery_profile_id', $profile->id)
                    ->where('rider_status', 'Delivered')
                    ->count(),
            ]);
        }

        // A doorstep rejection raises no delivery request of its own.

        return response()->json([
            'order' => $this->present($deliveryAssignment->fresh('order')),
        ]);
    }

    // Invoice for an order assigned to this delivery man
    public function invoice(Request $request, DeliveryAssignment $deliveryAssignment)
    {
        $profile = $request->user()->deliveryProfile;

        // Only the assigned delivery man may see it
        if ($deliveryAssignment->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden. This order is not assigned to you.'], 403);
        }

        // Load the order with items, customer and invoice
        $order = $deliveryAssignment->order()->with(['items', 'customer', 'invoice'])->first();

        // Delivery fee = total - subtotal + discount (never below zero)
        $delivery = max($order->total_amount - $order->subtotal + $order->discount, 0);

        return response()->json([
            'invoice' => [
                // matches the number the invoice is issued with (INV-YYYY-000072)
                'id' => $order->invoice?->invoice_number ?? InvoiceService::previewNumberFor($order),
                'orderId' => $order->order_number,
                'customer' => $order->customer_name,
                'phone' => $order->customer_phone,
                'email' => $order->customer?->email,
                'shippingAddress' => $order->shipping_address,
                'invoiceDate' => $order->created_at->format('Y-m-d'),
                'orderStatus' => $order->status,
                'paymentStatus' => InvoiceService::paymentStatus($order),
                'paymentMethod' => $order->paymentMethodLabel(),
                // gateway's bank_tran_id when known
                'transactionId' => $order->gateway_transaction_id ?: $order->transaction_id,
                'deliveryMan' => InvoiceService::deliveryMan($order),
                'subtotal' => $order->subtotal,
                'delivery' => $delivery,
                'discount' => $order->discount,
                'amount' => $order->total_amount,
                // The part paid from the customer's wallet
                'walletAmount' => (int) $order->wallet_amount,
                'gatewayAmount' => $order->gatewayPayable(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->product_name,
                    'qty' => $item->quantity,
                    'price' => $item->unit_price,
                    'discount' => 0,
                    'lineTotal' => $item->line_total,
                ]),
            ],
        ]);
    }

    // The replacement order riding along on a collection run
    private function presentReplacement(DeliveryAssignment $assignment): ?array
    {
        // Nothing to carry once the run is finished
        if ($assignment->completed_at !== null) {
            return null;
        }

        // Only a confirmed replacement order is carried
        $replacement = $assignment->order->replacementOrder;

        if (! $replacement || $replacement->status !== 'Confirmed') {
            return null;
        }

        return [
            'orderNumber' => $replacement->order_number,
            'product' => optional($replacement->items->first())->product_name,
            'qty' => (int) $replacement->items->sum('quantity'),
        ];
    }

    // Shape an assignment into the array the delivery app uses
    private function present(DeliveryAssignment $assignment): array
    {
        $order = $assignment->order;

        return [
            'id' => $order->order_number,
            'assignmentId' => $assignment->id,
            'customer' => $order->customer_name,
            'phone' => $order->customer_phone,
            'email' => $order->customer?->email,
            'date' => $assignment->assigned_at?->format('M j, Y'),
            'address' => $order->shipping_address,
            'amount' => (int) $order->total_amount,
            // Part of the total the customer already paid from their wallet
            'walletAmount' => (int) $order->wallet_amount,
            'items' => $order->items()->sum('quantity'),
            'product' => optional($order->items()->first())->product_name,
            // Full label, so a rider at the door sees
            'paymentMethod' => $order->paymentMethodLabel(),
            // Which errand this is: "Delivery" or "Return Pickup".
            'type' => $assignment->type,
            // What the rider has to take *out* on a collection run.
            'replacement' => $assignment->type === 'Return Pickup'
                ? $this->presentReplacement($assignment)
                : null,
            'status' => $assignment->rider_status,
            'accepted' => $assignment->accepted_at !== null,
        ];
    }
}
