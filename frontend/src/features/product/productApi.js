import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const productApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get products (GET /products)
    getProducts: builder.query({
      query: (params) => ({ url: "/products", params }),
      transformResponse: (response) => response.products,
      providesTags: ["Product"],
    }),
    // Get product (GET /products/:id)
    getProduct: builder.query({
      query: (id) => `/products/${id}`,
      transformResponse: (response) => response.product,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetProductsQuery, useGetProductQuery } = productApiSlice;
