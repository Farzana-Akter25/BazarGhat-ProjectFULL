import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

// RTK Query for auth
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Register (POST /register)
    register: builder.mutation({
      query: (data) => ({
        url: "/register",
        method: "POST",
        body: data,
      }),
    }),
    // Verify registration otp (POST /register/verify-otp)
    verifyRegistrationOtp: builder.mutation({
      query: (data) => ({
        url: "/register/verify-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Resend registration otp (POST /register/resend-otp)
    resendRegistrationOtp: builder.mutation({
      query: (data) => ({
        url: "/register/resend-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Login (POST /login)
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),
    // Logout (POST /logout)
    logout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    // Forgot password check (POST /forgot-password/check)
    forgotPasswordCheck: builder.mutation({
      query: (data) => ({
        url: "/forgot-password/check",
        method: "POST",
        body: data,
      }),
    }),
    // Forgot password send email otp (POST /forgot-password/send-email-otp)
    forgotPasswordSendEmailOtp: builder.mutation({
      query: (data) => ({
        url: "/forgot-password/send-email-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Resend forgot password otp (POST /forgot-password/resend-otp)
    resendForgotPasswordOtp: builder.mutation({
      query: (data) => ({
        url: "/forgot-password/resend-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Forgot password verify email otp (POST /forgot-password/verify-email-otp)
    forgotPasswordVerifyEmailOtp: builder.mutation({
      query: (data) => ({
        url: "/forgot-password/verify-email-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Reset password (POST /reset-password)
    resetPassword: builder.mutation({
      query: (data) => ({
        url: "/reset-password",
        method: "POST",
        body: data,
      }),
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// Get initial state from localStorage safely
// Build the starting auth state from what was saved in the browser
const getInitialState = () => {
  try {
    // Saved token and user from the browser
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    return {
      user: user ? JSON.parse(user) : null,
      token: token || null,
      isAuthenticated: !!token,
    };
  } catch {
    // Clear corrupted data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return {
      user: null,
      token: null,
      isAuthenticated: false,
    };
  }
};

// Redux slice that holds the logged-in user and token
const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    // Save the user and token after a successful login
    loginSuccess: (state, action) => {
      // User and token from the login response
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;

      // Save to localStorage only here - centralized location
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    // Merge updated user fields and save them
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("user", JSON.stringify(state.user));
    },
    // Clear the user and token on logout
    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    // Initialize auth from localStorage on app start
    initializeAuth: (state) => {
      try {
        // Saved token and user from the browser
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token && user) {
          state.token = token;
          state.user = JSON.parse(user);
          state.isAuthenticated = true;
        }
      } catch {
        // Clear corrupted data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    },
  },
});

// Export hooks
export const {
  useRegisterMutation,
  useVerifyRegistrationOtpMutation,
  useResendRegistrationOtpMutation,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordCheckMutation,
  useForgotPasswordSendEmailOtpMutation,
  useResendForgotPasswordOtpMutation,
  useForgotPasswordVerifyEmailOtpMutation,
  useResetPasswordMutation,
} = authApiSlice;

// Export actions
export const { loginSuccess, logoutSuccess, initializeAuth, updateUser } =
  authSlice.actions;

export default authSlice.reducer;
