<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryIssueReport;

// Admin endpoints for issue reports sent by delivery men
class DeliveryIssueReportController extends Controller
{
    // List all issue reports with their order and delivery man, newest first
    public function index()
    {
        $reports = DeliveryIssueReport::with(['deliveryAssignment.order', 'deliveryProfile.user'])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'reports' => $reports->map(fn (DeliveryIssueReport $report) => [
                'id' => $report->id,
                'orderId' => $report->deliveryAssignment->order->order_number,
                'customer' => $report->deliveryAssignment->order->customer_name,
                'deliveryMan' => $report->deliveryProfile->user->name,
                'deliveryManCode' => $report->deliveryProfile->staff_code,
                'condition' => $report->condition,
                'comment' => $report->comment,
                'photo' => $report->photo,
                'date' => $report->created_at->format('d M Y'),
                'time' => $report->created_at->format('h:i A'),
            ]),
        ]);
    }

    // Delete an issue report
    public function destroy(DeliveryIssueReport $deliveryIssueReport)
    {
        $deliveryIssueReport->delete();

        return response()->json(['message' => 'Issue report deleted']);
    }
}
