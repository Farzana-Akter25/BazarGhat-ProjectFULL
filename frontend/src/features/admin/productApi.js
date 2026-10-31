import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get admin products (GET /admin/products)
    getAdminProducts: builder.query({
      query: () => "/admin/products",
      transformResponse: (response) => response.products,
      providesTags: ["Product"],
    }),
    // Add product (POST /admin/products)
    addProduct: builder.mutation({
      query: (data) => ({
        url: "/admin/products",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Product", "Inventory", "Dashboard"],
    }),
    // Update product (PUT /admin/products/:id; sent as POST + _method=PUT when uploading a file)
    updateProduct: builder.mutation({
      query: ({ id, body }) => {
        if (body instanceof FormData) {
          body.append("_method", "PUT");
          return { url: `/admin/products/${id}`, method: "POST", body };
        }
        return { url: `/admin/products/${id}`, method: "PUT", body };
      },
      invalidatesTags: ["Product", "Inventory", "Dashboard"],
    }),
    // Delete product (DELETE /admin/products/:id)
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/admin/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Product", "Inventory", "Dashboard"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetAdminProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApiSlice;
