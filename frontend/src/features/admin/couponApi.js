import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const couponApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get admin coupons (GET /admin/coupons)
    getAdminCoupons: builder.query({
      query: (params) => ({ url: "/admin/coupons", params }),
      providesTags: ["Coupon"],
    }),
    // Create coupon (POST /admin/coupons)
    addCoupon: builder.mutation({
      query: (data) => ({
        url: "/admin/coupons",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Coupon"],
    }),
    // Update coupon (PUT /admin/coupons/:id)
    updateCoupon: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admin/coupons/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Coupon"],
    }),
    // Activate / deactivate coupon (PATCH /admin/coupons/:id/status)
    toggleCouponStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/coupons/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Coupon"],
    }),
    // Delete coupon (DELETE /admin/coupons/:id)
    deleteCoupon: builder.mutation({
      query: (id) => ({
        url: `/admin/coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Coupon"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const {
  useGetAdminCouponsQuery,
  useAddCouponMutation,
  useUpdateCouponMutation,
  useToggleCouponStatusMutation,
  useDeleteCouponMutation,
} = couponApiSlice;
