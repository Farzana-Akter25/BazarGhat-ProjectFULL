import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const invoiceApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get invoices, optionally filtered by date range (GET /admin/invoices)
    getInvoices: builder.query({
      query: ({ from, to } = {}) => {
        // Add the optional date filters to the URL
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        return `/admin/invoices${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Invoice"],
    }),
    // Get invoice (GET /admin/invoices/:id)
    getInvoice: builder.query({
      query: (orderId) => `/admin/invoices/${orderId}`,
      transformResponse: (response) => response.invoice,
      providesTags: (result, error, orderId) => [{ type: "Invoice", id: orderId }],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetInvoicesQuery, useLazyGetInvoiceQuery } = invoiceApiSlice;
