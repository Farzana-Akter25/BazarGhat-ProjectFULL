import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const adminDeliveryRequestApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get admin delivery requests (GET /admin/delivery-requests)
    getAdminDeliveryRequests: builder.query({
      query: () => "/admin/delivery-requests",
      transformResponse: (response) => response.requests,
      providesTags: ["DeliveryRequest"],
    }),
    // Update delivery request status (PATCH /admin/delivery-requests/:id/status)
    updateDeliveryRequestStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/delivery-requests/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["DeliveryRequest"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetAdminDeliveryRequestsQuery,
  useUpdateDeliveryRequestStatusMutation,
} = adminDeliveryRequestApiSlice;
