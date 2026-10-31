import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get customers (GET /admin/customers)
    getCustomers: builder.query({
      query: () => "/admin/customers",
      transformResponse: (response) => response.customers,
      providesTags: ["Customer"],
    }),
    // Toggle customer status (PATCH /admin/customers/:id/status)
    toggleCustomerStatus: builder.mutation({
      query: ({ userId, status }) => ({
        url: `/admin/customers/${userId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Customer"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetCustomersQuery, useToggleCustomerStatusMutation } =
  customerApiSlice;
