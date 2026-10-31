import { apiSlice } from "../api/apiSlice";

// Admin bell endpoints.
export const adminNotificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get one page of admin notifications (GET /admin/notifications)
    getAdminNotifications: builder.query({
      // page 1 is requested with no argument, so the bell and the first page of the notifications page share a single cache entry
      query: (page) => (page && page > 1 ? `/admin/notifications?page=${page}` : "/admin/notifications"),
      providesTags: ["Notification"],
    }),
    // Mark admin notification read (PATCH /admin/notifications/:id/read)
    markAdminNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `/admin/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Mark all admin notifications read (PATCH /admin/notifications/read-all)
    markAllAdminNotificationsRead: builder.mutation({
      query: () => ({
        url: "/admin/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Delete admin notification (DELETE /admin/notifications/:id)
    deleteAdminNotification: builder.mutation({
      query: (notificationId) => ({
        url: `/admin/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
      async onQueryStarted(notificationId, { dispatch, queryFulfilled }) {
        // Remove the notification from the cached list right away (undone if the request fails)
        const patchResult = dispatch(
          adminNotificationApiSlice.util.updateQueryData("getAdminNotifications", undefined, (draft) => {
            const removed = draft.notifications?.find((n) => n.id === notificationId);
            draft.notifications = draft.notifications?.filter((n) => n.id !== notificationId);
            if (removed && !removed.read) {
              draft.unreadCount = Math.max(0, (draft.unreadCount ?? 0) - 1);
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetAdminNotificationsQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
  useDeleteAdminNotificationMutation,
} = adminNotificationApiSlice;
