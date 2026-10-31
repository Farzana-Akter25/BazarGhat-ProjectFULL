import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Get base URL from .env
const baseUrl = `${import.meta.env.VITE_REACT_APP_BACKEND_URL}/api`;

// Enhanced base query with error handling
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    headers.set("Accept", "application/json");

    // Get token from Redux state
    const token = getState().auth?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// The one shared RTK Query API; each feature file adds its endpoints to it
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  // Enhanced tag types for better cache invalidation
  tagTypes: [
    "User",
    "Product",
    "Order",
    "Inventory",
    "Customer",
    "DeliveryStaff",
    "DeliveryAssignment",
    "DeliveryRequest",
    "Invoice",
    "Return",
    "DeliveryIssueReport",
    "Complaint",
    "Dashboard",
    "FlashSale",
    "Notification",
    "Coupon",
    "Cart",
    "ReturnReason",
    "RefundSetting",
    "Refund",
    "Wallet",
  ],
  // Optimal cache configuration
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 300,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
