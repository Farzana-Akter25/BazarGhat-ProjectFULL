import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const customerProfileApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Update profile (PUT /customer/profile)
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/customer/profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useUpdateProfileMutation } = customerProfileApiSlice;
