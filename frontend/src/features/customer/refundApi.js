import { apiSlice } from "../api/apiSlice";

// The customer's own refund history and live refund status.
export const customerRefundApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my refunds (GET /customer/refunds)
    getMyRefunds: builder.query({
      query: () => "/customer/refunds",
      transformResponse: (response) => response.refunds,
      providesTags: ["Refund"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetMyRefundsQuery } = customerRefundApiSlice;
