import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerInvoiceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my invoice (GET /customer/invoices/:id)
    getMyInvoice: builder.query({
      query: (orderId) => `/customer/invoices/${orderId}`,
      transformResponse: (response) => response.invoice,
      providesTags: (result, error, orderId) => [{ type: "Invoice", id: orderId }],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useLazyGetMyInvoiceQuery } = customerInvoiceApiSlice;
