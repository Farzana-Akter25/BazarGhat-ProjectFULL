import { apiSlice } from "../api/apiSlice";

// Admin view of one refund, plus the decisions that are genuinely the admin's: approving or rejecting a refund asked for after delivery.
export const adminRefundApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get refund (GET /admin/refunds/:id)
    getRefund: builder.query({
      query: (id) => `/admin/refunds/${id}`,
      transformResponse: (response) => response.refund,
      providesTags: (result, error, id) => [{ type: "Refund", id }],
    }),
    // Releases the money: a balance credit lands at once, a gateway refund is handed to SSLCommerz.
    approveRefund: builder.mutation({
      query: ({ id, refund_method }) => ({
        url: `/admin/refunds/${id}/approve`,
        method: "POST",
        body: refund_method ? { refund_method } : {},
      }),
      invalidatesTags: ["Refund", "Order", "Return", "Customer"],
    }),
    // Reject refund (POST /admin/refunds/:id/reject)
    rejectRefund: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/refunds/${id}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Refund", "Order", "Return"],
    }),
    // Sync refund (POST /admin/refunds/:id/sync)
    syncRefund: builder.mutation({
      query: (id) => ({
        url: `/admin/refunds/${id}/sync`,
        method: "POST",
      }),
      invalidatesTags: ["Refund", "Order", "Return"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetRefundQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
  useSyncRefundMutation,
} = adminRefundApiSlice;
