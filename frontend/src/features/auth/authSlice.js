import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

// RTK Query endpoints for auth
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (data) => ({
        url: "/register",
        method: "POST",
        body: data,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    getProfile: builder.query({
      query: () => "/profile",
      providesTags: ["User"],
    }),
  }),
  overrideExisting: false,
});

// Get initial state from localStorage safely
const getInitialState = () => {
  try {
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

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;

      // Save to localStorage only here - centralized location
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
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
  useLoginMutation,
  useLogoutMutation,
  useGetProfileQuery,
} = authApiSlice;

// Export actions
export const { loginSuccess, logoutSuccess, initializeAuth } =
  authSlice.actions;

export default authSlice.reducer;
