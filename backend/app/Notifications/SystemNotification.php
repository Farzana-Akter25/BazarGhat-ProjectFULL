<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

// The one database notification every BazarGhat event goes through.
class SystemNotification extends Notification
{
    // A fixed id (for de-duplication) plus the fields the bell shows
    public function __construct(
        string $id,
        private readonly string $type,
        private readonly string $title,
        private readonly string $message,
        private readonly ?string $referenceType = null,
        private readonly int|string|null $referenceId = null,
        private readonly string $priority = self::PRIORITY_INFO,
    ) {
        $this->id = $id;
    }

    // How important the notification is (sets its colour)
    public const PRIORITY_INFO = 'INFO';
    public const PRIORITY_SUCCESS = 'SUCCESS';
    public const PRIORITY_WARNING = 'WARNING';
    public const PRIORITY_ERROR = 'ERROR';

    // Stored in the notifications table only
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    // The data saved for the notification
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'reference_type' => $this->referenceType,
            'reference_id' => $this->referenceId,
            'priority' => $this->priority,
        ];
    }
}
