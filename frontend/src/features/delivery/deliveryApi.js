import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const deliveryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get delivery dashboard (GET /delivery/dashboard)
    getDeliveryDashboard: builder.query({
      query: () => "/delivery/dashboard",
      providesTags: ["Dashboard"],
    }),
    // Get assigned orders (GET /delivery/assigned-orders)
    getAssignedOrders: builder.query({
      query: () => "/delivery/assigned-orders",
      transformResponse: (response) => response.orders,
      providesTags: ["DeliveryAssignment"],
    }),
    // Update assigned order status (PATCH /delivery/assigned-orders/:id/status)
    updateAssignedOrderStatus: builder.mutation({
      query: ({ assignmentId, status, reason, note }) => ({
        url: `/delivery/assigned-orders/${assignmentId}/status`,
        method: "PATCH",
        body: { status, reason, note },
      }),
      invalidatesTags: ["DeliveryAssignment", "Dashboard", "DeliveryRequest", "Inventory", "Order"],
    }),
    // Accept assignment (PATCH /delivery/assigned-orders/:id/accept)
    acceptAssignment: builder.mutation({
      query: (assignmentId) => ({
        url: `/delivery/assigned-orders/${assignmentId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["DeliveryAssignment", "Dashboard", "DeliveryRequest"],
    }),
    // Reject assignment (PATCH /delivery/assigned-orders/:id/reject)
    rejectAssignment: builder.mutation({
      query: ({ assignmentId, reason }) => ({
        url: `/delivery/assigned-orders/${assignmentId}/reject`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: ["DeliveryAssignment", "Dashboard", "DeliveryRequest", "Order"],
    }),
    // Get assigned order invoice (GET /delivery/assigned-orders/:id/invoice)
    getAssignedOrderInvoice: builder.query({
      query: (assignmentId) => `/delivery/assigned-orders/${assignmentId}/invoice`,
      transformResponse: (response) => response.invoice,
    }),
    // Get delivery history (GET /delivery/history)
    getDeliveryHistory: builder.query({
      query: () => "/delivery/history",
      providesTags: ["DeliveryAssignment"],
    }),
    // Get delivery requests (GET /delivery/requests)
    getDeliveryRequests: builder.query({
      query: () => "/delivery/requests",
      transformResponse: (response) => response.requests,
      providesTags: ["DeliveryRequest"],
    }),
    // Create delivery request (POST /delivery/requests)
    createDeliveryRequest: builder.mutation({
      query: (data) => ({
        url: "/delivery/requests",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DeliveryRequest"],
    }),
    // Delete my delivery request (DELETE /delivery/requests/:id)
    deleteMyDeliveryRequest: builder.mutation({
      query: (id) => ({
        url: `/delivery/requests/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DeliveryRequest"],
    }),
    // Create issue report (POST /delivery/issue-reports)
    createIssueReport: builder.mutation({
      query: (data) => ({
        url: "/delivery/issue-reports",
        method: "POST",
        body: data,
      }),
    }),
    // Update delivery profile (PUT /delivery/profile)
    updateDeliveryProfile: builder.mutation({
      query: (data) => ({
        url: "/delivery/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Dashboard"],
    }),
    // Activate self (PATCH /delivery/status/activate)
    activateSelf: builder.mutation({
      query: () => ({
        url: "/delivery/status/activate",
        method: "PATCH",
      }),
      invalidatesTags: ["Dashboard"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetDeliveryDashboardQuery,
  useGetAssignedOrdersQuery,
  useUpdateAssignedOrderStatusMutation,
  useAcceptAssignmentMutation,
  useRejectAssignmentMutation,
  useLazyGetAssignedOrderInvoiceQuery,
  useGetDeliveryHistoryQuery,
  useGetDeliveryRequestsQuery,
  useCreateDeliveryRequestMutation,
  useDeleteMyDeliveryRequestMutation,
  useCreateIssueReportMutation,
  useUpdateDeliveryProfileMutation,
  useActivateSelfMutation,
} = deliveryApiSlice;
