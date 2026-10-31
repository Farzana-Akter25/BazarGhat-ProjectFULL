import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const inventoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get inventory (GET /admin/inventory)
    getInventory: builder.query({
      query: () => "/admin/inventory",
      transformResponse: (response) => response.items,
      providesTags: ["Inventory"],
    }),
    // Update stock (PATCH /admin/inventory/:id)
    updateStock: builder.mutation({
      query: ({ id, stock }) => ({
        url: `/admin/inventory/${id}`,
        method: "PATCH",
        body: { stock },
      }),
      invalidatesTags: ["Inventory", "Product", "Dashboard"],
    }),
    // Get stock transactions (GET /admin/inventory-transactions)
    getStockTransactions: builder.query({
      query: () => "/admin/inventory-transactions",
      transformResponse: (response) => response.transactions,
      providesTags: ["Inventory"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetInventoryQuery,
  useUpdateStockMutation,
  useGetStockTransactionsQuery,
} = inventoryApiSlice;
