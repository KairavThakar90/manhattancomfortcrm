import { configureStore } from '@reduxjs/toolkit';
import purchaseOrderReducer from './purchaseOrderSlice';

export const store = configureStore({
  reducer: {
    purchaseOrders: purchaseOrderReducer,
  },
});
