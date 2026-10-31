<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryProfile;
use App\Models\Order;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Services\OrderStatusService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

// Admin endpoints for assigning orders to delivery men
class DeliveryAssignmentController extends Controller
{
    // A fresh assignment reads "Assigned"
    private const STATUSES = ['Assigned', 'Pending', 'In Progress', 'Completed'];

    // Inject the order status and notification services
    public function __construct(private OrderStatusService $orderStatusService, private NotificationService $notifications)
    {
    }

    // List every delivery assignment, newest first
    public function index()
    {
        $assignments = DeliveryAssignment::with(['order.returnRequest', 'deliveryProfile.user'])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'assignments' => $assignments->map(fn (DeliveryAssignment $assignment) => $this->present($assignment)),
        ]);
    }

    // Assign a confirmed order (or a return pickup) to a delivery man
    public function store(Request $request)
    {
        // Both the order and the delivery profile must exist
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'delivery_profile_id' => 'required|exists:delivery_profiles,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Load the order being assigned
        $order = Order::findOrFail($request->order_id);

        // An order reaches a rider on one of two errands.
        $isReturnPickup = in_array($order->status, OrderStatusService::RETURN_PICKUP_ASSIGNABLE, true);

        // Only confirmed orders or approved return pickups can be assigned
        if ($order->status !== 'Confirmed' && ! $isReturnPickup) {
            return response()->json(['message' => 'Only confirmed orders, or orders with an approved return awaiting collection, can be assigned to a delivery man.'], 422);
        }

        // Load the delivery man and make sure the account is active
        $deliveryProfile = DeliveryProfile::with('user')->findOrFail($request->delivery_profile_id);

        if ($deliveryProfile->user->status !== 'Active') {
            return response()->json(['message' => 'This delivery man is not active and cannot be assigned orders.'], 422);
        }

        // A return pickup is by definition a second trip
        $settledStatuses = $isReturnPickup
            ? ['Failed', 'Customer Rejected at Doorstep', 'Delivered', 'Return Picked Up']
            : ['Failed', 'Customer Rejected at Doorstep'];

        // Refuse if the order already has an assignment that is still running
        $hasActiveAssignment = DeliveryAssignment::where('order_id', $order->id)
            ->whereNotIn('rider_status', $settledStatuses)
            ->exists();

        if ($hasActiveAssignment) {
            return response()->json(['message' => 'This order already has an active delivery assignment.'], 422);
        }

        // Move the order status and create the assignment in one transaction
        try {
            $assignment = DB::transaction(function () use ($request, $order, $isReturnPickup) {
                // Mark the order as sent for return pickup, or as assigned for delivery
                if ($isReturnPickup) {
                    $this->orderStatusService->assignReturnPickup($order, $request->user());
                } else {
                    $this->orderStatusService->assign($order, $request->user());
                }

                // Create the assignment row
                return DeliveryAssignment::create([
                    'order_id' => $order->id,
                    'delivery_profile_id' => $request->delivery_profile_id,
                    'area' => $order->shipping_address,
                    'type' => $isReturnPickup ? 'Return Pickup' : 'Delivery',
                    'status' => 'Assigned',
                    'rider_status' => 'Assigned',
                    'assigned_at' => now(),
                ]);
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // The rider's own alert.
        $this->notifications->send(
            $deliveryProfile->user,
            NotificationService::DELIVERY_ASSIGNED,
            $isReturnPickup ? 'New return pickup assignment' : 'New delivery assignment',
            $isReturnPickup
                ? "New return pickup assignment for order {$order->order_number}."
                : "New delivery assignment for order {$order->order_number}.",
            NotificationService::REF_DELIVERY_ASSIGNMENT,
            $assignment->id,
            SystemNotification::PRIORITY_INFO,
        );

        return response()->json([
            'assignment' => $this->present($assignment->fresh(['order', 'deliveryProfile.user'])),
        ], 201);
    }

    // Change the admin-side status of an assignment
    public function updateStatus(Request $request, DeliveryAssignment $deliveryAssignment)
    {
        // The new status must be one of STATUSES
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:' . implode(',', self::STATUSES),
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Save the status; stamp completed_at when it becomes Completed
        $deliveryAssignment->update([
            'status' => $request->status,
            'completed_at' => $request->status === 'Completed' ? now() : $deliveryAssignment->completed_at,
        ]);

        return response()->json([
            'assignment' => $this->present($deliveryAssignment->fresh(['order', 'deliveryProfile.user'])),
        ]);
    }

    // Shape an assignment into the array the admin page uses
    private function present(DeliveryAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'orderId' => $assignment->order->order_number,
            'orderDbId' => $assignment->order_id,
            'customer' => $assignment->order->customer_name,
            'customerPhone' => $assignment->order->customer_phone,
            'rider' => $assignment->deliveryProfile->user->name,
            'riderPhone' => $assignment->deliveryProfile->user->phone,
            'riderProfileId' => $assignment->deliveryProfile->id,
            'area' => $assignment->area,
            // "Delivery" or "Return Pickup"
            'type' => $assignment->type,
            // The return request a collection run was raised from
            'returnRequestId' => $assignment->type === 'Return Pickup'
                ? $assignment->order->returnRequest?->request_number
                : null,
            'time' => $assignment->assigned_at?->format('d M Y, h:i A'),
            'status' => $assignment->status,
            'riderStatus' => $assignment->rider_status,
        ];
    }
}
