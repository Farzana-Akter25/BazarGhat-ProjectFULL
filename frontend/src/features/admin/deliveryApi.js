import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get delivery staff (GET /admin/delivery-staff)
    getDeliveryStaff: builder.query({
      query: () => "/admin/delivery-staff",
      transformResponse: (response) => response.staff,
      providesTags: ["DeliveryStaff"],
    }),
    // Get delivery staff detail (GET /admin/delivery-staff/:id)
    getDeliveryStaffDetail: builder.query({
      query: (profileId) => `/admin/delivery-staff/${profileId}`,
      providesTags: ["DeliveryStaff"],
    }),
    // Toggle delivery status (PATCH /admin/delivery-staff/:id/status)
    toggleDeliveryStatus: builder.mutation({
      query: ({ profileId, status }) => ({
        url: `/admin/delivery-staff/${profileId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["DeliveryStaff", "DeliveryAssignment"],
    }),
    // Create delivery staff (POST /admin/delivery-staff)
    createDeliveryStaff: builder.mutation({
      query: (data) => ({
        url: "/admin/delivery-staff",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DeliveryStaff"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetDeliveryStaffQuery,
  useGetDeliveryStaffDetailQuery,
  useToggleDeliveryStatusMutation,
  useCreateDeliveryStaffMutation,
} = deliveryApiSlice;
