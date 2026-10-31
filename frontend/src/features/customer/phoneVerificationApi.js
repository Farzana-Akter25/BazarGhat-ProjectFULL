import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const phoneVerificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Send phone otp (POST /customer/phone/send-otp)
    sendPhoneOtp: builder.mutation({
      query: (data) => ({
        url: "/customer/phone/send-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Verify phone otp (POST /customer/phone/verify-otp)
    verifyPhoneOtp: builder.mutation({
      query: (data) => ({
        url: "/customer/phone/verify-otp",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"], // phone_verified_at may have changed
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useSendPhoneOtpMutation, useVerifyPhoneOtpMutation } = phoneVerificationApiSlice;
