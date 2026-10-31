import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const cartApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get cart (GET /customer/cart)
    getCart: builder.query({
      query: () => "/customer/cart",
      transformResponse: (response) => response.items ?? [],
      providesTags: ["Cart"],
    }),
    // Add cart item (POST /customer/cart)
    addCartItem: builder.mutation({
      query: ({ product_id, quantity = 1 }) => ({
        url: "/customer/cart",
        method: "POST",
        body: { product_id, quantity },
      }),
      invalidatesTags: ["Cart"],
    }),
    // Update cart item (PATCH /customer/cart/:id)
    updateCartItem: builder.mutation({
      query: ({ id, quantity }) => ({
        url: `/customer/cart/${id}`,
        method: "PATCH",
        body: { quantity },
      }),
      invalidatesTags: ["Cart"],
    }),
    // Remove cart item (DELETE /customer/cart/:id)
    removeCartItem: builder.mutation({
      query: (id) => ({
        url: `/customer/cart/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),
    // Clear cart (DELETE /customer/cart)
    clearCart: builder.mutation({
      query: () => ({
        url: "/customer/cart",
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApiSlice;
