<?php

namespace App\Http\Controllers\Customer;

use App\Exceptions\ComplaintWorkflowException;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Models\ComplaintStatusHistory;
use App\Models\Order;
use App\Services\ComplaintWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

// Customer endpoints for complaints about a delivery man
class ComplaintController extends Controller
{
    // Only finished complaints can be removed by the customer
    private const DELETABLE_STATUSES = ['Resolved', 'Rejected', 'Closed'];

    // Inject the complaint workflow service
    public function __construct(private readonly ComplaintWorkflowService $workflow)
    {
    }

    // List this customer's complaints that they have not hidden
    public function index(Request $request)
    {
        $complaints = Complaint::with(['order', 'history.actor'])
            ->where('complaint_type', 'delivery_man')
            ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))
            ->whereNull('hidden_from_customer_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'complaints' => $complaints->map(fn (Complaint $c) => $this->present($c)),
        ]);
    }

    // File a new complaint against the delivery man of an order
    public function store(Request $request)
    {
        // Order and reason are required
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer|exists:orders,id',
            'reason' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Load the order; it must belong to this customer
        $order = Order::with('deliveryAssignment.deliveryProfile.user')->findOrFail($request->order_id);
        abort_unless($order->user_id === $request->user()->id, 403, 'Forbidden.');

        // The delivery man assigned to the order, if any
        $rider = $order->deliveryAssignment?->deliveryProfile;
        $user = $request->user();

        // Create the complaint with a temporary number first
        $complaint = Complaint::create([
            'complaint_number' => 'CMP-TMP-' . uniqid(),
            'complaint_type' => 'delivery_man',
            'filer_name' => $user->name,
            'filer_code' => 'CUST' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
            'against_name' => $rider?->user?->name ?? 'Unassigned',
            'against_code' => $rider?->staff_code,
            'order_id' => $order->id,
            'order_reference' => $order->order_number,
            'reason' => $request->reason,
            'status' => 'Pending',
        ]);

        // Replace it with the real number based on the id, e.g. CMP-2026-0007
        $complaint->update([
            'complaint_number' => 'CMP-' . now()->format('Y') . '-' . str_pad($complaint->id, 4, '0', STR_PAD_LEFT),
        ]);

        // First timeline entry: "Pending"
        ComplaintStatusHistory::create([
            'complaint_id' => $complaint->id,
            'status' => 'Pending',
            'note' => $request->reason,
            'changed_by_user_id' => $user->id,
            'changed_by_role' => 'customer',
        ]);

        // Tell the admins a new complaint arrived
        app(NotificationService::class)->sendToAdmins(
            NotificationService::COMPLAINT_CREATED,
            'New complaint',
            "New customer complaint {$complaint->complaint_number} has been submitted.",
            NotificationService::REF_COMPLAINT,
            $complaint->id,
            SystemNotification::PRIORITY_WARNING,
        );

        return response()->json([
            'complaint' => $this->present($complaint->fresh(['order', 'history.actor'])),
        ], 201);
    }

    // Customer answers an admin's request for more information
    public function respond(Request $request, Complaint $complaint)
    {
        // Only the owner of the order may respond
        abort_unless($complaint->order?->user_id === $request->user()->id, 403, 'Forbidden.');

        // A message is required; up to 3 photos are allowed
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:1000',
            'photos' => 'nullable|array|max:3',
            'photos.*' => 'image|max:4096',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Store the uploaded photos
        $photoPaths = collect($request->file('photos', []))
            ->map(fn ($file) => $file->store('complaints', 'public'))
            ->all();

        // Pass the response to the workflow service
        try {
            $complaint = $this->workflow->submitResponse(
                $complaint,
                $request->user(),
                'customer',
                $request->string('message')->toString(),
                $photoPaths
            );
        } catch (ComplaintWorkflowException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'complaint' => $this->present($complaint->fresh(['order', 'history.actor'])),
        ]);
    }

    // Hide a finished complaint from the customer's list
    public function destroy(Request $request, Complaint $complaint)
    {
        // Only the owner of the order may do this
        abort_unless($complaint->order?->user_id === $request->user()->id, 403, 'Forbidden.');

        if (! in_array($complaint->status, self::DELETABLE_STATUSES, true)) {
            return response()->json([
                'message' => 'Only resolved, rejected, or closed complaints can be deleted.',
            ], 422);
        }

        // Soft-hide it (admins still see it)
        $complaint->update(['hidden_from_customer_at' => now()]);

        return response()->json(['message' => 'Complaint deleted.']);
    }

    // Shape a complaint into the array the customer page uses
    private function present(Complaint $complaint): array
    {
        return [
            'id' => $complaint->complaint_number,
            'complaintId' => $complaint->id,
            'orderId' => $complaint->order_reference,
            'against' => $complaint->against_name,
            'reason' => $complaint->reason,
            'status' => $complaint->status,
            'waitingOn' => $complaint->waiting_on,
            'resolutionNote' => $complaint->resolution_note,
            'decidedAt' => $complaint->decided_at?->toIso8601String(),
            'closedAt' => $complaint->closed_at?->toIso8601String(),
            'date' => $complaint->created_at->format('Y-m-d'),
            'time' => $complaint->created_at->format('h:i A'),
            'history' => $this->presentHistory($complaint),
        ];
    }

    // Convert the complaint's status history into plain arrays
    private function presentHistory(Complaint $complaint): array
    {
        return $complaint->history->map(fn (ComplaintStatusHistory $h) => [
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
