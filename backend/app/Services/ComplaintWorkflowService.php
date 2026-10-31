<?php

namespace App\Services;

use App\Exceptions\ComplaintWorkflowException;
use App\Models\Complaint;
use App\Models\ComplaintStatusHistory;
use App\Models\User;
use App\Notifications\ComplaintStatusUpdated;

// Status rules for complaints: Pending -> Under Review -> Waiting/Resolved/Rejected -> Closed
class ComplaintWorkflowService
{
    // Admin starts reviewing a pending complaint
    public function startReview(Complaint $complaint, User $admin): Complaint
    {
        // Only allowed from Pending
        $this->assertStatus($complaint, ['Pending']);

        return $this->transition($complaint, 'Under Review', null, null, $admin, 'admin');
    }

    // Admin asks the customer or delivery man for more information
    public function requestInfo(Complaint $complaint, User $admin, string $party, string $message): Complaint
    {
        // Only allowed while Under Review
        $this->assertStatus($complaint, ['Under Review']);

        // Remember who we are waiting on
        $complaint->waiting_on = $party;

        return $this->transition($complaint, 'Waiting for Response', $message, null, $admin, 'admin');
    }

    // Customer or delivery man answers the admin's question
    public function submitResponse(Complaint $complaint, User $user, string $role, string $message, array $photoPaths = []): Complaint
    {
        // Only allowed while Waiting for Response
        $this->assertStatus($complaint, ['Waiting for Response']);

        // A delivery man can always reply with details on a complaint he filed himself
        $isFilerException = $role === 'delivery' && $complaint->complaint_type === 'customer';

        if ($complaint->waiting_on !== $role && ! $isFilerException) {
            throw new ComplaintWorkflowException('This complaint is not waiting for a response from you.');
        }

        // No longer waiting on anyone; back to Under Review
        $complaint->waiting_on = null;

        return $this->transition($complaint, 'Under Review', $message, $photoPaths, $user, $role);
    }

    // Admin resolves the complaint with a note
    public function resolve(Complaint $complaint, User $admin, string $note): Complaint
    {
        // Only allowed while Under Review
        $this->assertStatus($complaint, ['Under Review']);

        // Save the decision and when it was made
        $complaint->resolution_note = $note;
        $complaint->decided_at = now();

        return $this->transition($complaint, 'Resolved', $note, null, $admin, 'admin');
    }

    // Admin rejects the complaint with a note
    public function reject(Complaint $complaint, User $admin, string $note): Complaint
    {
        // Only allowed while Under Review
        $this->assertStatus($complaint, ['Under Review']);

        // Save the decision and when it was made
        $complaint->resolution_note = $note;
        $complaint->decided_at = now();

        return $this->transition($complaint, 'Rejected', $note, null, $admin, 'admin');
    }

    // Auto-close Resolved/Rejected complaints once the configured appeal window has
    public function autoCloseDue(): int
    {
        // Number of days after a decision before auto-closing (default 7)
        $days = (int) config('complaints.auto_close_days', 7);

        // Decided complaints whose appeal window has passed
        $complaints = Complaint::whereIn('status', ['Resolved', 'Rejected'])
            ->whereNull('closed_at')
            ->whereNotNull('decided_at')
            ->where('decided_at', '<=', now()->subDays($days))
            ->get();

        // Close each one with a system note
        foreach ($complaints as $complaint) {
            $complaint->closed_at = now();
            $this->transition(
                $complaint,
                'Closed',
                "Automatically closed after {$days} day(s) with no appeal.",
                null,
                null,
                'system'
            );
        }

        return $complaints->count();
    }

    // Throw an error if the complaint is closed or not in an allowed status
    private function assertStatus(Complaint $complaint, array $allowed): void
    {
        if ($complaint->isClosed()) {
            throw new ComplaintWorkflowException('This complaint is closed and cannot be edited.');
        }

        if (! in_array($complaint->status, $allowed, true)) {
            throw new ComplaintWorkflowException("This action isn't available while the complaint is \"{$complaint->status}\".");
        }
    }

    // Change the status, log it in the history and notify both parties
    private function transition(
        Complaint $complaint,
        string $status,
        ?string $note,
        ?array $photoPaths,
        ?User $actor,
        string $role
    ): Complaint {
        // Save the new status
        $complaint->status = $status;
        $complaint->save();

        // Add a history entry
        ComplaintStatusHistory::create([
            'complaint_id' => $complaint->id,
            'status' => $status,
            'note' => $note,
            'photos' => $photoPaths,
            'changed_by_user_id' => $actor?->id,
            'changed_by_role' => $role,
        ]);

        // Tell the customer and the delivery man
        $this->notifyParties($complaint, $status, $note);

        return $complaint->fresh(['order', 'history.actor']);
    }

    // Send the status update notification to the customer and the delivery man
    private function notifyParties(Complaint $complaint, string $status, ?string $note): void
    {
        $notification = new ComplaintStatusUpdated($complaint, $status, $note);

        foreach ([$complaint->customerUser(), $complaint->deliveryManUser()] as $user) {
            $user?->notify($notification);
        }
    }
}
