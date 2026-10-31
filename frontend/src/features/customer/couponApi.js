import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerCouponApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get available coupons (GET /customer/coupons/available)
    getAvailableCoupons: builder.query({
      query: (subtotal) => `/customer/coupons/available?subtotal=${subtotal}`,
      transformResponse: (response) => ({
        coupons: response.coupons ?? [],
      }),
      providesTags: ["Coupon"],
    }),
    // Apply coupon (POST /customer/coupons/apply)
    applyCoupon: builder.mutation({
      query: (body) => ({
        url: "/customer/coupons/apply",
        method: "POST",
        body,
      }),
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetAvailableCouponsQuery, useApplyCouponMutation } = customerCouponApiSlice;
