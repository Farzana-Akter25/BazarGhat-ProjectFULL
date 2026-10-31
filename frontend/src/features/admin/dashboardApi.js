import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const dashboardApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get dashboard summary (GET /admin/dashboard)
    getDashboardSummary: builder.query({
      query: (range = 7) => `/admin/dashboard?range=${range}`,
      providesTags: ["Dashboard"],
    }),
    // Get sales analytics (GET /admin/sales-analytics)
    getSalesAnalytics: builder.query({
      query: () => "/admin/sales-analytics",
      providesTags: ["Dashboard"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetDashboardSummaryQuery, useGetSalesAnalyticsQuery } = dashboardApiSlice;
