<?php

namespace App\Notifications;

use App\Models\Refund;
use App\Services\NotificationService;
use Illuminate\Notifications\Notification;

// In-app bell entry for a refund reaching a new point in its life.
class RefundStatusUpdated extends Notification
{
    // The refund, what happened to it, and the message to show
    public function __construct(
        private readonly Refund $refund,
        private readonly string $event,
        private readonly string $message,
    ) {
    }

    // Stored in the notifications table only
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    // The original keys are kept exactly as they were
    public function toArray(object $notifiable): array
    {
        return [
            'refund_id' => $this->refund->id,
            'refund_number' => $this->refund->refund_number,
            'order_number' => $this->refund->order?->order_number,
            'event' => $this->event,
            'status' => $this->refund->status,
            'amount' => $this->refund->amount,
            'message' => $this->message,

            // Common fields used by the notification bell
            'type' => match ($this->event) {
                'approved' => NotificationService::REFUND_APPROVED,
                'rejected' => NotificationService::REFUND_REJECTED,
                'processing' => NotificationService::REFUND_PROCESSING,
                'completed' => NotificationService::REFUND_COMPLETED,
                'failed' => NotificationService::REFUND_FAILED,
                default => NotificationService::REFUND_REQUESTED,
            },
            'title' => match ($this->event) {
                'approved' => 'Refund approved',
                'rejected' => 'Refund rejected',
                'processing' => 'Refund processing',
                'completed' => 'Refund completed',
                'failed' => 'Refund failed',
                default => 'Refund requested',
            },
            'reference_type' => NotificationService::REF_REFUND,
            'reference_id' => $this->refund->id,
            'priority' => match ($this->event) {
                'approved', 'completed' => SystemNotification::PRIORITY_SUCCESS,
                'failed' => SystemNotification::PRIORITY_ERROR,
                'rejected' => SystemNotification::PRIORITY_WARNING,
                default => SystemNotification::PRIORITY_INFO,
            },
        ];
    }
}
