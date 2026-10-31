<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAssignment;
use App\Models\DeliveryIssueReport;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Delivery man endpoint for reporting a problem with an order
class IssueReportController extends Controller
{
    // Allowed condition values for a report
    private const CONDITIONS = ['Good', 'Minor Issue', 'Major Issue', 'Damaged'];

    // Save an issue report for an assigned order and alert admin and customer
    public function store(Request $request)
    {
        // The logged-in delivery man's profile
        $profile = $request->user()->deliveryProfile;

        // Validate the report fields
        $validator = Validator::make($request->all(), [
            'delivery_assignment_id' => 'required|exists:delivery_assignments,id',
            'condition' => 'required|string|in:' . implode(',', self::CONDITIONS),
            'comment' => 'required|string|max:500',
            'photo' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Load the assignment; it must belong to this delivery man
        $assignment = DeliveryAssignment::findOrFail($request->delivery_assignment_id);

        if ($assignment->delivery_profile_id !== $profile->id) {
            return response()->json(['message' => 'Forbidden. This order is not assigned to you.'], 403);
        }

        // Save the report
        $report = DeliveryIssueReport::create([
            'delivery_assignment_id' => $assignment->id,
            'delivery_profile_id' => $profile->id,
            'condition' => $request->condition,
            'comment' => $request->comment,
            'photo' => $request->photo,
        ]);

        // The order the report is about
        $order = $assignment->order;
        $notifications = app(NotificationService::class);

        // Keyed on the report
        $notifications->sendToAdmins(
            NotificationService::DELIVERY_ISSUE,
            'Delivery issue reported',
            "Delivery issue reported for order {$order?->order_number} — {$report->condition}.",
            NotificationService::REF_ORDER,
            $order?->id,
            SystemNotification::PRIORITY_WARNING,
            NotificationService::DELIVERY_ISSUE . ":report:{$report->id}",
        );

        // Tell the customer too
        $notifications->send(
            $order?->customer,
            NotificationService::DELIVERY_ISSUE,
            'Delivery issue',
            "There is a delivery issue with your order {$order?->order_number}. Our team is looking into it.",
            NotificationService::REF_ORDER,
            $order?->id,
            SystemNotification::PRIORITY_WARNING,
            NotificationService::DELIVERY_ISSUE . ":report:{$report->id}",
        );

        // Send back the saved report
        return response()->json([
            'message' => 'Report submitted.',
            'report' => [
                'id' => $report->id,
                'condition' => $report->condition,
                'comment' => $report->comment,
            ],
        ], 201);
    }
}
