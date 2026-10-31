<?php

namespace App\Notifications;

use App\Models\Complaint;
use App\Services\NotificationService;
use Illuminate\Notifications\Notification;

// In-app notification sent when a complaint's status changes
class ComplaintStatusUpdated extends Notification
{
    // The complaint, its new status and an optional note
    public function __construct(
        private readonly Complaint $complaint,
        private readonly string $status,
        private readonly ?string $note = null,
    ) {
    }

    // Stored in the notifications table only
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    // The original keys are kept exactly as they were.
    public function toArray(object $notifiable): array
    {
        return [
            'complaint_id' => $this->complaint->id,
            'complaint_number' => $this->complaint->complaint_number,
            'status' => $this->status,
            'note' => $this->note,
            'message' => "Complaint {$this->complaint->complaint_number} is now \"{$this->status}\".",

            // Common fields used by the notification bell
            'type' => NotificationService::COMPLAINT_UPDATED,
            'title' => 'Complaint ' . strtolower($this->status),
            'reference_type' => NotificationService::REF_COMPLAINT,
            'reference_id' => $this->complaint->id,
            'priority' => match ($this->status) {
                'Resolved' => SystemNotification::PRIORITY_SUCCESS,
                'Rejected' => SystemNotification::PRIORITY_WARNING,
                default => SystemNotification::PRIORITY_INFO,
            },
        ];
    }
}
