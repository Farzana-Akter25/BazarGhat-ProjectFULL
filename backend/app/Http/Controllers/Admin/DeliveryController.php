<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

// Admin endpoints for managing delivery men (staff)
class DeliveryController extends Controller
{
    // List all delivery men, newest first
    public function index()
    {
        $staff = DeliveryProfile::with('user')->orderByDesc('id')->get();

        return response()->json([
            'staff' => $staff->map(fn (DeliveryProfile $profile) => $this->present($profile)),
        ]);
    }

    // Show one delivery man with every order assigned to them
    public function show(DeliveryProfile $deliveryProfile)
    {
        // Load the user account and the assignments with their order items
        $deliveryProfile->load('user');
        $deliveryProfile->load(['assignments' => function ($query) {
            $query->with('order.items')->orderByDesc('id');
        }]);

        return response()->json([
            'staffMember' => $this->present($deliveryProfile),
            'orders' => $deliveryProfile->assignments->map(fn ($assignment) => $this->presentAssignment($assignment)),
        ]);
    }

    // Create a new delivery man account and profile
    public function store(Request $request)
    {
        // Validate the new delivery man's details
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'area' => 'nullable|string|max:255',
            'vehicle_type' => 'nullable|string|max:100',
            'vehicle_number' => 'nullable|string|max:50',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Create the login account with the "delivery" role
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->area,
            'role' => 'delivery',
            'status' => 'Active',
            'password' => Hash::make($request->password),
            'email_verified_at' => now(),
        ]);

        // Create the delivery profile with a staff code like DEL-005
        $profile = DeliveryProfile::create([
            'user_id' => $user->id,
            'staff_code' => 'DEL-' . str_pad($user->id, 3, '0', STR_PAD_LEFT),
            'area' => $request->area,
            'vehicle_type' => $request->vehicle_type,
            'vehicle_number' => $request->vehicle_number,
        ]);

        return response()->json([
            'staffMember' => $this->present($profile->fresh('user')),
        ], 201);
    }

    // Block or unblock a delivery man
    public function toggleStatus(Request $request, DeliveryProfile $deliveryProfile)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:Active,Blocked',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // The status lives on the user account
        $deliveryProfile->user->update(['status' => $request->status]);

        return response()->json(['staffMember' => $this->present($deliveryProfile->fresh('user'))]);
    }

    // Delete a delivery man by deleting the user account
    public function destroy(DeliveryProfile $deliveryProfile)
    {
        $deliveryProfile->user()->delete();

        return response()->json(['message' => 'Delivery man deleted successfully.']);
    }

    // Shape a delivery profile into the array the admin page uses
    private function present(DeliveryProfile $profile): array
    {
        return [
            'id' => $profile->staff_code,
            'profileId' => $profile->id,
            'name' => $profile->user->name,
            'email' => $profile->user->email,
            'phone' => $profile->user->phone,
            'area' => $profile->area,
            'deliveries' => $profile->total_deliveries,
            'rating' => (float) $profile->rating,
            'onTime' => (float) $profile->on_time_percentage,
            'status' => $profile->user->status,
        ];
    }

    // Shape one assignment and its order for the staff detail page
    private function presentAssignment(\App\Models\DeliveryAssignment $assignment): array
    {
        $order = $assignment->order;

        return [
            'orderId' => $order->order_number,
            'status' => $order->status,
            'riderStatus' => $assignment->rider_status,
            'customer' => $order->customer_name,
            'customerPhone' => $order->customer_phone,
            'shippingAddress' => $order->shipping_address,
            'area' => $assignment->area,
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'unitPrice' => $item->unit_price,
                'lineTotal' => $item->line_total,
            ]),
            'amount' => $order->total_amount,
            'paymentStatus' => $order->payment_status,
            'paymentMethod' => $order->paymentMethodLabel(),
            'assignedAt' => $assignment->assigned_at?->toIso8601String(),
            'acceptedAt' => $assignment->accepted_at?->toIso8601String(),
            'completedAt' => $assignment->completed_at?->toIso8601String(),
            'date' => $order->created_at->format('Y-m-d'),
        ];
    }
}
