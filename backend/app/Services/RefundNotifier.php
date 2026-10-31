<?php

namespace App\Services;

use App\Models\Refund;
use App\Notifications\RefundStatusUpdated;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Log;

// Tells the customer what just happened to their money
class RefundNotifier
{
    // Inject the SMS and notification services
    public function __construct(private SmsService $sms, private NotificationService $notifications)
    {
    }

    // completed, failed
    public function notify(Refund $refund, string $event): void
    {
        try {
            // Build the message for this event; skip if there is none
            $message = $this->message($refund, $event);

            if ($message === null) {
                return;
            }

            // In-app notification for the customer
            $refund->customer?->notify(new RefundStatusUpdated($refund, $event, $message));

            // Bell entry for the admins where relevant
            $this->notifyAdmins($refund, $event);

            // Also send the message by SMS if a phone number is known
            $phone = $refund->customer?->phone ?? $refund->order?->customer_phone;

            if (filled($phone)) {
                $this->sms->send($phone, $message);
            }
        } catch (\Throwable $e) {
            // Deliberately swallowed: see the class docblock.
            Log::warning('Refund notification could not be sent.', [
                'refund_id' => $refund->id,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }

    // The operational side of the same event.
    private function notifyAdmins(Refund $refund, string $event): void
    {
        // Order number (or refund number) and amount for the message
        $order = $refund->order?->order_number ?? $refund->refund_number;
        $amount = '৳' . number_format($refund->amount);

        // Only new and approved refunds are sent to admins
        [$type, $title, $message] = match ($event) {
            'requested', 'submitted' => [
                NotificationService::REFUND_REQUESTED,
                'New refund request',
                "New refund request for order {$order} — {$amount}.",
            ],
            'approved' => [
                NotificationService::REFUND_APPROVED,
                'Refund approved',
                "Refund for order {$order} has been approved — {$amount}.",
            ],
            default => [null, null, null],
        };

        if ($type === null) {
            return;
        }

        $this->notifications->sendToAdmins(
            $type,
            $title,
            $message,
            NotificationService::REF_REFUND,
            $refund->id,
            SystemNotification::PRIORITY_INFO,
            "{$type}:refund:{$refund->id}",
        );
    }

    // The customer-facing wording.
    private function message(Refund $refund, string $event): ?string
    {
        // Order number (or refund number), amount, and where the money goes
        $order = $refund->order?->order_number ?? $refund->refund_number;
        $amount = '৳' . number_format($refund->amount);
        $toGateway = $refund->refund_method === Refund::METHOD_ORIGINAL_PAYMENT;

        // The channel the original payment came through
        $via = $refund->payment_method ?: 'SSLCommerz';

        // Pick the text for each event
        return match ($event) {
            'requested' => $toGateway
                ? "BazarGhat: Your refund request for Order {$order} has been confirmed. The refund of {$amount} will be processed through {$via} and may take up to 3 days to reach you."
                : "BazarGhat: Your refund request for Order {$order} has been confirmed. {$amount} will be added to your account balance once it is processed.",

            'submitted' => "BazarGhat: Your refund request for Order {$order} has been submitted and is waiting for review. We will let you know as soon as it is decided.",

            'approved' => $toGateway
                ? "BazarGhat: Your refund for Order {$order} has been approved. The refund of {$amount} will be given by {$via} and may take up to 3 days to reach you."
                : "BazarGhat: Your refund for Order {$order} has been approved. {$amount} is being added to your account balance.",

            'rejected' => "BazarGhat: Your refund request for Order {$order} was not approved."
                . ($refund->rejection_reason ? " Reason: {$refund->rejection_reason}" : ' Please contact support if you need more information.'),

            'processing' => $toGateway
                ? "BazarGhat: Your refund of {$amount} for Order {$order} will be given by {$via} and may take up to 3 days to reach you."
                : "BazarGhat: Your refund of {$amount} for Order {$order} is currently being processed.",

            'completed' => $toGateway
                ? "BazarGhat: Your refund of {$amount} for Order {$order} has been completed and sent back to {$via}."
                : "BazarGhat: Your refund of {$amount} for Order {$order} has been added to your account balance. You can use the balance for future shopping.",

            'failed' => "BazarGhat: Your refund for Order {$order} could not be completed. Please check your refund status or contact support.",

            default => null,
        };
    }
}
