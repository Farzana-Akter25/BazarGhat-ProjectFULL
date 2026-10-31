<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use Illuminate\Http\Request;

// Finished delivery history for the delivery man app
class HistoryController extends Controller
{
    // Money earned for each delivered order
    private const EARNING_PER_ORDER = 80;

    // List the delivery man's finished runs (delivered or failed) and totals
    public function index(Request $request)
    {
        // The logged-in delivery man's profile
        $profile = $request->user()->deliveryProfile;

        // Load only finished runs, most recent first
        $assignments = DeliveryAssignment::with('order')
            ->where('delivery_profile_id', $profile->id)
            ->whereIn('rider_status', ['Delivered', 'Failed'])
            ->orderByDesc('completed_at')
            ->get();

        // Shape each run; only delivered runs earn money
        $history = $assignments->map(function (DeliveryAssignment $a) {
            $earned = $a->rider_status === 'Delivered'
                ? self::EARNING_PER_ORDER
                : 0;

            return [
                'id' => $a->order->order_number,
                // Same order, two runs: a run this rider failed
                'assignmentId' => $a->id,
                'customer' => $a->order->customer_name,
                'area' => $a->area,
                'date' => ($a->completed_at ?? $a->assigned_at)?->format('M j, Y'),
                'amount' => (int) $a->order->total_amount,
                'status' => $a->rider_status,
                'earned' => $earned,
            ];
        })->values();

        // Totals shown above the list
        $stats = [
            'totalDeliveries' => $assignments->where('rider_status', 'Delivered')->count(),
            'failed' => $assignments->where('rider_status', 'Failed')->count(),
            'totalEarned' => $history->sum('earned'),
        ];

        return response()->json([
            'history' => $history,
            'stats' => $stats,
        ]);
    }
}
