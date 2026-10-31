<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ComplaintWorkflowException;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Services\ComplaintWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

// Admin endpoints for reviewing and deciding complaints
class ComplaintController extends Controller
{
    // Inject the complaint workflow service
    public function __construct(private readonly ComplaintWorkflowService $workflow)
    {
    }

    // List all complaints, split into delivery-man and customer complaints
    public function index()
    {
        // Load every complaint with its status history, newest first
        $complaints = Complaint::with('history.actor')->orderByDesc('id')->get();

        // Complaints against customers are filed by delivery men
        $dmComplaints = $complaints->where('complaint_type', 'customer')->values();
        // Complaints against delivery men are filed by customers
        $customerComplaints = $complaints->where('complaint_type', 'delivery_man')->values();

        // Shape both lists into the format the admin page expects
        return response()->json([
            'dmComplaints' => $dmComplaints->map(fn (Complaint $c) => [
                'id' => $c->complaint_number,
                'complaintId' => $c->id,
                'deliveryMan' => $c->filer_name,
                'deliveryManCode' => $c->filer_code,
                'customer' => $c->against_name,
                'customerCode' => $c->against_code,
                'orderId' => $c->order_reference,
                'reason' => $c->reason,
                'status' => $c->status,
                'waitingOn' => $c->waiting_on,
                'resolutionNote' => $c->resolution_note,
                'decidedAt' => $c->decided_at?->toIso8601String(),
                'closedAt' => $c->closed_at?->toIso8601String(),
                'date' => $c->created_at->format('d M Y'),
                'time' => $c->created_at->format('h:i A'),
                'history' => $this->presentHistory($c),
            ]),
            'customerComplaints' => $customerComplaints->map(fn (Complaint $c) => [
                'id' => $c->complaint_number,
                'complaintId' => $c->id,
                'customer' => $c->filer_name,
                'customerCode' => $c->filer_code,
                'against' => $c->against_name,
                'againstCode' => $c->against_code,
                'orderId' => $c->order_reference,
                'reason' => $c->reason,
                'status' => $c->status,
                'waitingOn' => $c->waiting_on,
                'resolutionNote' => $c->resolution_note,
                'decidedAt' => $c->decided_at?->toIso8601String(),
                'closedAt' => $c->closed_at?->toIso8601String(),
                'date' => $c->created_at->format('d M Y'),
                'time' => $c->created_at->format('h:i A'),
                'history' => $this->presentHistory($c),
            ]),
        ]);
    }

    // Move a complaint into "Under Review"
    public function startReview(Request $request, Complaint $complaint)
    {
        return $this->runTransition(fn () => $this->workflow->startReview($complaint, $request->user()));
    }

    // Ask the customer or delivery man for more information
    public function requestInfo(Request $request, Complaint $complaint)
    {
        // Validate which party is asked and the message text
        $validator = Validator::make($request->all(), [
            'party' => 'required|string|in:customer,delivery',
            'message' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Hand off to the workflow service
        return $this->runTransition(fn () => $this->workflow->requestInfo(
            $complaint,
            $request->user(),
            $request->string('party')->toString(),
            $request->string('message')->toString()
        ));
    }

    // Mark a complaint as resolved with an admin note
    public function resolve(Request $request, Complaint $complaint)
    {
        $validator = Validator::make($request->all(), [
            'note' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return $this->runTransition(fn () => $this->workflow->resolve($complaint, $request->user(), $request->string('note')->toString()));
    }

    // Reject a complaint with an admin note
    public function reject(Request $request, Complaint $complaint)
    {
        $validator = Validator::make($request->all(), [
            'note' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return $this->runTransition(fn () => $this->workflow->reject($complaint, $request->user(), $request->string('note')->toString()));
    }

    // Delete a complaint permanently
    public function destroy(Complaint $complaint)
    {
        $complaint->delete();

        return response()->json(['message' => 'Complaint deleted']);
    }

    // Run a workflow step and return the updated complaint, or a 422 on a rule error
    private function runTransition(callable $callback)
    {
        try {
            $complaint = $callback();
        } catch (ComplaintWorkflowException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status' => $complaint->status,
            'id' => $complaint->complaint_number,
            'waitingOn' => $complaint->waiting_on,
            'resolutionNote' => $complaint->resolution_note,
            'decidedAt' => $complaint->decided_at?->toIso8601String(),
            'closedAt' => $complaint->closed_at?->toIso8601String(),
            'history' => $this->presentHistory($complaint),
        ]);
    }

    // Convert the complaint's status history into plain arrays for the frontend
    private function presentHistory(Complaint $complaint): array
    {
        return $complaint->history->map(fn ($h) => [
            'status' => $h->status,
            'note' => $h->note,
            'photos' => $this->photoUrls($h->photos),
            'by' => $h->changed_by_role,
            'byName' => $h->actor?->name,
            'at' => $h->created_at->toIso8601String(),
        ])->all();
    }

    // Turn stored photo paths into full public URLs
    private function photoUrls(?array $photos): array
    {
        return collect($photos ?? [])
            ->map(fn (string $path) => Str::startsWith($path, ['http://', 'https://']) ? $path : Storage::disk('public')->url($path))
            ->all();
    }
}
