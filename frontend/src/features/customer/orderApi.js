import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerOrderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get my orders (GET /customer/orders)
    getMyOrders: builder.query({
      query: () => "/customer/orders",
      transformResponse: (response) => response.orders,
      providesTags: ["Order"],
    }),
    // Get my order (GET /customer/orders/:id)
    getMyOrder: builder.query({
      query: (id) => `/customer/orders/${id}`,
      transformResponse: (response) => response.order,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),
    // What can be refunded on this order and how — computed server-side and only displayed here, so the client never decides a refund amount.
    getRefundOptions: builder.query({
      query: (id) => `/customer/orders/${id}/refund-options`,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),
    // Cancel order (PATCH /customer/orders/:id/cancel)
    cancelOrder: builder.mutation({
      query: ({ id, refundMethod }) => ({
        url: `/customer/orders/${id}/cancel`,
        method: "PATCH",
        body: refundMethod ? { refund_method: refundMethod } : {},
      }),
      // Cancelling puts the order's units back on the shelf, so the cached product and inventory lists are stale the moment it succeeds.
      invalidatesTags: [
        "Order",
        "Refund",
        "Wallet",
        "Return",
        "Product",
        "Inventory",
      ],
    }),
    // Delete my order (DELETE /customer/orders/:id)
    deleteMyOrder: builder.mutation({
      query: (id) => ({
        url: `/customer/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Order"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetMyOrdersQuery,
  useLazyGetMyOrderQuery,
  useLazyGetRefundOptionsQuery,
  useCancelOrderMutation,
  useDeleteMyOrderMutation,
} = customerOrderApiSlice;
