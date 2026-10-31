import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerNotificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get one page of customer notifications (GET /customer/notifications)
    getNotifications: builder.query({
      // page 1 is requested with no argument, so the bell and the first page of the notifications page share a single cache entry
      query: (page) => (page && page > 1 ? `/customer/notifications?page=${page}` : "/customer/notifications"),
      providesTags: ["Notification"],
    }),
    // Mark notification read (PATCH /customer/notifications/:id/read)
    markNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `/customer/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Mark all notifications read (PATCH /customer/notifications/read-all)
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: "/customer/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Delete notification (DELETE /customer/notifications/:id)
    deleteNotification: builder.mutation({
      query: (notificationId) => ({
        url: `/customer/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
      async onQueryStarted(notificationId, { dispatch, queryFulfilled }) {
        // Remove the notification from the cached list right away (undone if the request fails)
        const patchResult = dispatch(
          customerNotificationApiSlice.util.updateQueryData("getNotifications", undefined, (draft) => {
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
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = customerNotificationApiSlice;
