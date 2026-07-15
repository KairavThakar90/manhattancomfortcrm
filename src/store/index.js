import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    // Add your slices here
    // auth: authReducer,
    // dashboard: dashboardReducer,
  },
});
