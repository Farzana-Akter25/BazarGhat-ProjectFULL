import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const flashSaleApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get admin flash sales (GET /admin/flash-sales)
    getAdminFlashSales: builder.query({
      query: (params) => ({ url: "/admin/flash-sales", params }),
      providesTags: ["FlashSale"],
    }),
    // Add flash sale (POST /admin/flash-sales)
    addFlashSale: builder.mutation({
      query: (data) => ({
        url: "/admin/flash-sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FlashSale", "Product"],
    }),
    // Update flash sale (PUT /admin/flash-sales/:id)
    updateFlashSale: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admin/flash-sales/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FlashSale", "Product"],
    }),
    // Delete flash sale (DELETE /admin/flash-sales/:id)
    deleteFlashSale: builder.mutation({
      query: (id) => ({
        url: `/admin/flash-sales/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FlashSale", "Product"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetAdminFlashSalesQuery,
  useAddFlashSaleMutation,
  useUpdateFlashSaleMutation,
  useDeleteFlashSaleMutation,
} = flashSaleApiSlice;
