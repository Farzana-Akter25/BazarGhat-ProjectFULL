import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "../features/api/apiSlice";
import authSlice from "../features/auth/authSlice";

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  api: apiSlice.reducer,
});

// Enhanced store configuration with caching optimizations
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});
