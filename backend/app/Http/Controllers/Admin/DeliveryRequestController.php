<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Admin endpoints for requests sent by delivery men (day off etc.)
class DeliveryRequestController extends Controller
{
    // Rejections are not delivery-man requests
    private const HIDDEN_TYPES = ['Order Rejection', 'Doorstep Rejection'];

    // List delivery-man requests, leaving out rejections
    public function index()
    {
        $requests = DeliveryRequest::with(['deliveryProfile.user', 'assignment.order'])
            ->whereNotIn('type', self::HIDDEN_TYPES)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'requests' => $requests->map(fn (DeliveryRequest $r) => $this->present($r)),
        ]);
    }

    // Approve, reject or reset a request
    public function updateStatus(Request $request, DeliveryRequest $deliveryRequest)
    {
        // Only Pending, Approved or Rejected are allowed
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:Pending,Approved,Rejected',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Save the new status
        $deliveryRequest->update(['status' => $request->status]);

        // An approved day off makes the delivery man inactive
        if ($deliveryRequest->type === 'Day Off' && $request->status === 'Approved') {
            $deliveryRequest->deliveryProfile->user()->update(['status' => 'Inactive']);
        }

        return response()->json([
            'request' => $this->present($deliveryRequest->fresh(['deliveryProfile.user', 'assignment.order'])),
        ]);
    }

    // Delete a request
    public function destroy(DeliveryRequest $deliveryRequest)
    {
        $deliveryRequest->delete();

        return response()->json(['message' => 'Request deleted']);
    }

    // Shape a request into the array the admin page uses
    private function present(DeliveryRequest $r): array
    {
        $order = $r->assignment?->order;

        return [
            'id' => $r->id,
            'code' => 'REQ-' . str_pad($r->id, 3, '0', STR_PAD_LEFT),
            'type' => $r->type,
            'status' => $r->status,
            'message' => $r->message,
            'date' => $r->created_at->format('M j, Y'),
            'deliveryManName' => $r->deliveryProfile->user->name,
            'deliveryManCode' => $r->deliveryProfile->staff_code,
            'orderNumber' => $order?->order_number,
            'customerName' => $order?->customer_name,
        ];
    }
}
