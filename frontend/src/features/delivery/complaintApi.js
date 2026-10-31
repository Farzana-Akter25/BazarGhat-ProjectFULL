import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryComplaintApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my delivery complaints (GET /delivery/complaints)
    getMyDeliveryComplaints: builder.query({
      query: () => "/delivery/complaints",
      transformResponse: (response) => response.complaints,
      providesTags: ["Complaint"],
    }),
    // Create delivery complaint (POST /delivery/complaints)
    createDeliveryComplaint: builder.mutation({
      query: (body) => ({
        url: "/delivery/complaints",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Respond to delivery complaint (POST /delivery/complaints/:id/respond)
    respondToDeliveryComplaint: builder.mutation({
      // `formData` must be a FormData instance ({ message, photos[] })
      query: ({ complaintId, formData }) => ({
        url: `/delivery/complaints/${complaintId}/respond`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Delete delivery complaint (DELETE /delivery/complaints/:id)
    deleteDeliveryComplaint: builder.mutation({
      query: (complaintId) => ({
        url: `/delivery/complaints/${complaintId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Complaint"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetMyDeliveryComplaintsQuery,
  useCreateDeliveryComplaintMutation,
  useRespondToDeliveryComplaintMutation,
  useDeleteDeliveryComplaintMutation,
} = deliveryComplaintApiSlice;
