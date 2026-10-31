<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use Illuminate\Http\Request;

// Home screen data for the delivery man app
class DashboardController extends Controller
{
    // Weekly delivery target shown on the dashboard
    private const WEEKLY_TARGET = 5;
    // Money earned for each delivered order
    private const EARNING_PER_ORDER = 80;

    // Build all the dashboard numbers for the logged-in delivery man
    public function summary(Request $request)
    {
        // The logged-in delivery man's profile
        $profile = $request->user()->deliveryProfile;

        // All their assignments, newest first
        $assignments = DeliveryAssignment::with('order')
            ->where('delivery_profile_id', $profile->id)
            ->orderByDesc('assigned_at')
            ->get();

        // Counts by rider status
        $todaySummary = [
            'assigned' => $assignments->where('rider_status', 'Assigned')->count(),
            'onTheWay' => $assignments->whereIn('rider_status', ['Picked Up', 'Out for Delivery'])->count(),
            'delivered' => $assignments->where('rider_status', 'Delivered')->count(),
            'failed' => $assignments->where('rider_status', 'Failed')->count(),
        ];

        // The five newest assignments
        $todayOrders = $assignments->take(5)->map(fn (DeliveryAssignment $a) => [
            'id' => $a->order->order_number,
            // The row's own identity.
            'assignmentId' => $a->id,
            'customer' => $a->order->customer_name,
            'area' => $a->area,
            'amount' => (int) $a->order->total_amount,
            'status' => $a->rider_status,
        ])->values();

        // Orders delivered in the last 7 days
        $deliveredThisWeek = $assignments->filter(
            fn (DeliveryAssignment $a) => $a->rider_status === 'Delivered'
                && $a->completed_at
                && $a->completed_at->greaterThanOrEqualTo(now()->subDays(7))
        );

        // Earnings for the last 7 days
        $earnings = [
            'weekTotal' => $deliveredThisWeek->count() * self::EARNING_PER_ORDER,
            'successfulDeliveries' => $deliveredThisWeek->count(),
            'weeklyTarget' => self::WEEKLY_TARGET,
        ];

        // Success rate = delivered / (delivered + failed); 100% when there is nothing yet
        $delivered = $assignments->where('rider_status', 'Delivered')->count();
        $failed = $assignments->where('rider_status', 'Failed')->count();
        $successRate = ($delivered + $failed) > 0 ? round(($delivered / ($delivered + $failed)) * 100, 1) : 100.0;

        // Performance numbers from the profile
        $performance = [
            'rating' => (float) $profile->rating,
            'onTimeDelivery' => (float) $profile->on_time_percentage,
            'totalDeliveries' => $profile->total_deliveries,
            'successRate' => $successRate,
        ];

        // Send the rider details and all the sections
        return response()->json([
            'rider' => [
                'name' => $profile->user->name,
                'status' => $profile->user->status,
                'phone' => $profile->user->phone,
                'phone_verified_at' => $profile->user->phone_verified_at,
                'email' => $profile->user->email,
                'area' => $profile->area,
                'vehicle' => $profile->vehicle_type,
                'vehicleNumber' => $profile->vehicle_number,
                'avatar' => $profile->avatar,
            ],
            'todayOrders' => $todayOrders,
            'todaySummary' => $todaySummary,
            'earnings' => $earnings,
            'performance' => $performance,
        ]);
    }
}
