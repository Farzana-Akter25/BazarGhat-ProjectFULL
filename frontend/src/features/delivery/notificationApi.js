import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryNotificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get one page of delivery notifications (GET /delivery/notifications)
    getDeliveryNotifications: builder.query({
      // page 1 is requested with no argument, so the bell and the first page of the notifications page share a single cache entry
      query: (page) => (page && page > 1 ? `/delivery/notifications?page=${page}` : "/delivery/notifications"),
      providesTags: ["Notification"],
    }),
    // Mark delivery notification read (PATCH /delivery/notifications/:id/read)
    markDeliveryNotificationRead: builder.mutation({
      query: (notificationId) => ({
        url: `/delivery/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Mark all delivery notifications read (PATCH /delivery/notifications/read-all)
    markAllDeliveryNotificationsRead: builder.mutation({
      query: () => ({
        url: "/delivery/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    // Delete delivery notification (DELETE /delivery/notifications/:id)
    deleteDeliveryNotification: builder.mutation({
      query: (notificationId) => ({
        url: `/delivery/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
      async onQueryStarted(notificationId, { dispatch, queryFulfilled }) {
        // Remove the notification from the cached list right away (undone if the request fails)
        const patchResult = dispatch(
          deliveryNotificationApiSlice.util.updateQueryData("getDeliveryNotifications", undefined, (draft) => {
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
  useGetDeliveryNotificationsQuery,
  useMarkDeliveryNotificationReadMutation,
  useMarkAllDeliveryNotificationsReadMutation,
  useDeleteDeliveryNotificationMutation,
} = deliveryNotificationApiSlice;
