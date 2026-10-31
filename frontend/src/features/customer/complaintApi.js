import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerComplaintApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my complaints (GET /customer/complaints)
    getMyComplaints: builder.query({
      query: () => "/customer/complaints",
      transformResponse: (response) => response.complaints,
      providesTags: ["Complaint"],
    }),
    // Create complaint (POST /customer/complaints)
    createComplaint: builder.mutation({
      query: (body) => ({
        url: "/customer/complaints",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Respond to complaint (POST /customer/complaints/:id/respond)
    respondToComplaint: builder.mutation({
      // `formData` must be a FormData instance ({ message, photos[] })
      query: ({ complaintId, formData }) => ({
        url: `/customer/complaints/${complaintId}/respond`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Delete complaint (DELETE /customer/complaints/:id)
    deleteComplaint: builder.mutation({
      query: (complaintId) => ({
        url: `/customer/complaints/${complaintId}`,
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
  useGetMyComplaintsQuery,
  useCreateComplaintMutation,
  useRespondToComplaintMutation,
  useDeleteComplaintMutation,
} = customerComplaintApiSlice;
