import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const flashSaleApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get flash sales (GET /flash-sales)
    getFlashSales: builder.query({
      query: () => "/flash-sales",
      transformResponse: (response) => response.flash_sales,
      providesTags: ["FlashSale"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetFlashSalesQuery } = flashSaleApiSlice;
