import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerReturnApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my returns (GET /customer/returns)
    getMyReturns: builder.query({
      query: () => "/customer/returns",
      transformResponse: (response) => response.requests,
      providesTags: ["Return"],
    }),
    // reason options for the request form, managed from the admin panel
    getReturnReasonOptions: builder.query({
      query: (type) => ({
        url: "/customer/return-reasons",
        params: type ? { type } : undefined,
      }),
      transformResponse: (response) => response.reasons,
      providesTags: ["ReturnReason"],
    }),
    // Where the money could go if a refund is granted, so the form only offers destinations this order can actually support.
    getReturnRefundOptions: builder.query({
      query: (orderId) => `/customer/returns/refund-options/${orderId}`,
      providesTags: ["Refund"],
    }),
    // Create return (POST /customer/returns)
    createReturn: builder.mutation({
      query: (body) => ({
        url: "/customer/returns",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Return", "Refund"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetMyReturnsQuery,
  useGetReturnReasonOptionsQuery,
  useGetReturnRefundOptionsQuery,
  useCreateReturnMutation,
} = customerReturnApiSlice;
