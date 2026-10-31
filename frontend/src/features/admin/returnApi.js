import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const returnApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get returns (GET /admin/returns)
    getReturns: builder.query({
      query: () => "/admin/returns",
      transformResponse: (response) => response.requests,
      providesTags: ["Return"],
    }),
    // Update return status (PATCH /admin/returns/:id/status)
    updateReturnStatus: builder.mutation({
      query: ({ id, status, admin_note }) => ({
        url: `/admin/returns/${id}/status`,
        method: "PATCH",
        body: { status, admin_note },
      }),
      invalidatesTags: ["Return"],
    }),
    // Resolving to a refund raises it; it does not pay it.
    resolveReturn: builder.mutation({
      query: ({ id, resolution, refund_method }) => ({
        url: `/admin/returns/${id}/resolve`,
        method: "PATCH",
        body: { resolution, ...(refund_method ? { refund_method } : {}) },
      }),
      invalidatesTags: ["Return", "Order", "Inventory", "Refund"],
    }),
    // Records that the returned goods reached the admin.
    receiveReturnItems: builder.mutation({
      query: ({ id, note }) => ({
        url: `/admin/returns/${id}/receive`,
        method: "PATCH",
        body: { note },
      }),
      invalidatesTags: ["Return"],
    }),
    // What this request can actually be refunded, and where it may travel.
    getReturnRefundOptions: builder.query({
      query: (id) => `/admin/returns/${id}/refund-options`,
      providesTags: (result, error, id) => [{ type: "Return", id }],
    }),
    // Delete return (DELETE /admin/returns/:id)
    deleteReturn: builder.mutation({
      query: (id) => ({
        url: `/admin/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Return"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetReturnsQuery,
  useUpdateReturnStatusMutation,
  useResolveReturnMutation,
  useReceiveReturnItemsMutation,
  useGetReturnRefundOptionsQuery,
  useDeleteReturnMutation,
} = returnApiSlice;
