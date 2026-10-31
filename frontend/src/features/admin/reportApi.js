import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const reportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // The whole business performance report for a period.
    getReport: builder.query({
      query: ({ reportType, startDate, endDate } = {}) => {
        // Add the optional report type and dates to the URL
        const params = new URLSearchParams();
        if (reportType) params.set("report_type", reportType);
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        const qs = params.toString();
        return `/admin/reports${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Invoice"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useLazyGetReportQuery } = reportApiSlice;
