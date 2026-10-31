import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const complaintApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get complaints (GET /admin/complaints)
    getComplaints: builder.query({
      query: () => "/admin/complaints",
      providesTags: ["Complaint"],
    }),
    
    // Start complaint review (PATCH /admin/complaints/:id/start-review)
    startComplaintReview: builder.mutation({
      query: (complaintId) => ({
        url: `/admin/complaints/${complaintId}/start-review`,
        method: "PATCH",
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Request complaint info (PATCH /admin/complaints/:id/request-info)
    requestComplaintInfo: builder.mutation({
      query: ({ complaintId, party, message }) => ({
        url: `/admin/complaints/${complaintId}/request-info`,
        method: "PATCH",
        body: { party, message },
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Resolve complaint (PATCH /admin/complaints/:id/resolve)
    resolveComplaint: builder.mutation({
      query: ({ complaintId, note }) => ({
        url: `/admin/complaints/${complaintId}/resolve`,
        method: "PATCH",
        body: { note },
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Reject complaint (PATCH /admin/complaints/:id/reject)
    rejectComplaint: builder.mutation({
      query: ({ complaintId, note }) => ({
        url: `/admin/complaints/${complaintId}/reject`,
        method: "PATCH",
        body: { note },
      }),
      invalidatesTags: ["Complaint"],
    }),
    // Delete complaint (DELETE /admin/complaints/:id)
    deleteComplaint: builder.mutation({
      query: (complaintId) => ({
        url: `/admin/complaints/${complaintId}`,
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
  useGetComplaintsQuery,
  useStartComplaintReviewMutation,
  useRequestComplaintInfoMutation,
  useResolveComplaintMutation,
  useRejectComplaintMutation,
  useDeleteComplaintMutation,
} = complaintApiSlice;
