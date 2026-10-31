import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryAssignmentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get delivery assignments (GET /admin/delivery-assignments)
    getDeliveryAssignments: builder.query({
      query: () => "/admin/delivery-assignments",
      transformResponse: (response) => response.assignments,
      providesTags: ["DeliveryAssignment"],
    }),
    // Create delivery assignment (POST /admin/delivery-assignments)
    createDeliveryAssignment: builder.mutation({
      query: (data) => ({
        url: "/admin/delivery-assignments",
        method: "POST",
        body: data,
      }),
      // Assigning moves the order from "Confirmed" to "Assigned", so the cached order list has to be refetched.
      invalidatesTags: ["DeliveryAssignment", "Order", "Dashboard"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetDeliveryAssignmentsQuery,
  useCreateDeliveryAssignmentMutation,
} = deliveryAssignmentApiSlice;
