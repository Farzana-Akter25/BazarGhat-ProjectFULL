import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryIssueReportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get delivery issue reports (GET /admin/delivery-issue-reports)
    getDeliveryIssueReports: builder.query({
      query: () => "/admin/delivery-issue-reports",
      transformResponse: (response) => response.reports,
      providesTags: ["DeliveryIssueReport"],
    }),
    // Delete delivery issue report (DELETE /admin/delivery-issue-reports/:id)
    deleteDeliveryIssueReport: builder.mutation({
      query: (id) => ({
        url: `/admin/delivery-issue-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DeliveryIssueReport"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetDeliveryIssueReportsQuery, useDeleteDeliveryIssueReportMutation } =
  deliveryIssueReportApiSlice;
