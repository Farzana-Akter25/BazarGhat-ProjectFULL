import { apiSlice } from "../api/apiSlice";

// Backs the Return & Refund panel's "Manage Reasons" and "Refund Settings" quick actions.
export const returnSettingsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get return reasons (GET /admin/return-reasons)
    getReturnReasons: builder.query({
      query: () => "/admin/return-reasons",
      transformResponse: (response) => response.reasons,
      providesTags: ["ReturnReason"],
    }),
    // Create return reason (POST /admin/return-reasons)
    createReturnReason: builder.mutation({
      query: (body) => ({
        url: "/admin/return-reasons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ReturnReason"],
    }),
    // Update return reason (PATCH /admin/return-reasons/:id)
    updateReturnReason: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/return-reasons/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ReturnReason"],
    }),
    // Delete return reason (DELETE /admin/return-reasons/:id)
    deleteReturnReason: builder.mutation({
      query: (id) => ({
        url: `/admin/return-reasons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ReturnReason"],
    }),

    // Get refund settings (GET /admin/refund-settings)
    getRefundSettings: builder.query({
      query: () => "/admin/refund-settings",
      providesTags: ["RefundSetting"],
    }),
    // Update refund settings (PUT /admin/refund-settings)
    updateRefundSettings: builder.mutation({
      query: (body) => ({
        url: "/admin/refund-settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["RefundSetting"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetReturnReasonsQuery,
  useCreateReturnReasonMutation,
  useUpdateReturnReasonMutation,
  useDeleteReturnReasonMutation,
  useGetRefundSettingsQuery,
  useUpdateRefundSettingsMutation,
} = returnSettingsApiSlice;
