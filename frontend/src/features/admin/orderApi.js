import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const orderApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get orders (GET /admin/orders)
    getOrders: builder.query({
      query: () => "/admin/orders",
      transformResponse: (response) => response.orders,
      providesTags: ["Order"],
    }),
    // Get order (GET /admin/orders/:id)
    getOrder: builder.query({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: (response) => response.order,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),
    // Update order status (PATCH /admin/orders/:id/status)
    updateOrderStatus: builder.mutation({
      query: ({ id, status, note }) => ({
        url: `/admin/orders/${id}/status`,
        method: "PATCH",
        body: { status, note },
      }),
      // Cancelling from here restores the order's stock, so the cached product and inventory lists have to be refetched alongside the order itself.
      invalidatesTags: [
        "Order",
        "Invoice",
        "Dashboard",
        "Product",
        "Inventory",
      ],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetOrdersQuery,
  useLazyGetOrderQuery,
  useUpdateOrderStatusMutation,
} = orderApiSlice;
