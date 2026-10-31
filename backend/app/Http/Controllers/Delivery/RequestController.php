<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Delivery man endpoints for sending requests (day off) to the admin
class RequestController extends Controller
{
    // Rejections are not requests the delivery man made
    private const HIDDEN_TYPES = ['Order Rejection', 'Doorstep Rejection'];

    // List this delivery man's own requests, newest first
    public function index(Request $request)
    {
        // The logged-in delivery man's profile
        $profile = $request->user()->deliveryProfile;

        $requests = DeliveryRequest::where('delivery_profile_id', $profile->id)
            ->whereNotIn('type', self::HIDDEN_TYPES)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'requests' => $requests->map(fn (DeliveryRequest $r) => $this->present($r)),
        ]);
    }

    // Send a new day-off request
    public function store(Request $request)
    {
        $profile = $request->user()->deliveryProfile;

        // A message is required
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Save the request as pending
        $deliveryRequest = DeliveryRequest::create([
            'delivery_profile_id' => $profile->id,
            'type' => 'Day Off',
            'message' => $request->message,
            'status' => 'Pending',
        ]);

        return response()->json(['request' => $this->present($deliveryRequest)], 201);
    }

    // Delete one of the delivery man's own requests
    public function destroy(Request $request, DeliveryRequest $deliveryRequest)
    {
        $profile = $request->user()->deliveryProfile;

        // Only the owner may delete it
        if ($deliveryRequest->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $deliveryRequest->delete();

        return response()->json(['message' => 'Request deleted.']);
    }

    // Shape a request into the array the delivery app uses
    private function present(DeliveryRequest $r): array
    {
        return [
            'id' => $r->id,
            'code' => 'REQ-' . str_pad($r->id, 3, '0', STR_PAD_LEFT),
            'type' => $r->type,
            'status' => $r->status,
            'message' => $r->message,
            'date' => $r->created_at->format('M j, Y'),
        ];
    }
}
