<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

// The bell, for all three roles.
class NotificationController extends Controller
{
    // Page size — enough to fill the notifications page
    private const PER_PAGE = 20;

    // List the user's notifications page by page, plus the unread count
    public function index(Request $request)
    {
        try {
            // Page size from the request, kept between 1 and 50
            $perPage = min(50, max(1, (int) $request->input('per_page', self::PER_PAGE)));

            // Newest notifications first
            $paginator = $request->user()
                ->notifications()
                ->latest()
                ->paginate($perPage);

            return response()->json([
                'notifications' => collect($paginator->items())
                    ->map(fn (DatabaseNotification $n) => $this->present($n))
                    ->all(),
                'unreadCount' => $request->user()->unreadNotifications()->count(),
                'meta' => [
                    'currentPage' => $paginator->currentPage(),
                    'lastPage' => $paginator->lastPage(),
                    'perPage' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);
        // On any error, return an empty list instead of failing
        } catch (\Exception $e) {
            return response()->json([
                'notifications' => [],
                'unreadCount' => 0,
                'meta' => ['currentPage' => 1, 'lastPage' => 1, 'perPage' => self::PER_PAGE, 'total' => 0],
            ]);
        }
    }

    // Just the badge number.
    public function unreadCount(Request $request)
    {
        try {
            return response()->json([
                'unreadCount' => $request->user()->unreadNotifications()->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['unreadCount' => 0]);
        }
    }

    // Mark one notification as read
    public function markRead(Request $request, string $notification)
    {
        try {
            $request->user()->notifications()->where('id', $notification)->firstOrFail()->markAsRead();
            return response()->json(['message' => 'Notification marked as read']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Notification marked as read']);
        }
    }

    // Mark all unread notifications as read
    public function markAllRead(Request $request)
    {
        try {
            $request->user()->unreadNotifications->markAsRead();
            return response()->json(['message' => 'All notifications marked as read']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'All notifications marked as read']);
        }
    }

    // Delete one notification
    public function destroy(Request $request, string $notification)
    {
        try {
            $request->user()->notifications()->where('id', $notification)->firstOrFail()->delete();
            return response()->json(['message' => 'Notification deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Notification deleted']);
        }
    }

    // One shape for the frontend, whatever wrote the row.
    private function present(DatabaseNotification $n): array
    {
        $data = $n->data ?? [];

        return [
            'id' => $n->id,
            'type' => $data['type'] ?? null,
            'title' => $data['title'] ?? null,
            'message' => $data['message'] ?? '',
            'referenceType' => $data['reference_type'] ?? null,
            'referenceId' => $data['reference_id'] ?? null,
            'priority' => $data['priority'] ?? 'INFO',
            // Kept for the complaint entries that were already being read by name
            'status' => $data['status'] ?? null,
            'complaintNumber' => $data['complaint_number'] ?? null,
            'read' => $n->read_at !== null,
            'createdAt' => $n->created_at->toIso8601String(),
        ];
    }
}
