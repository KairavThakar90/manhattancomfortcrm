import { configureStore } from '@reduxjs/toolkit';
import purchaseOrderReducer from './purchaseOrderSlice';
import vendorReducer from './vendorSlice';

export const store = configureStore({
  reducer: {
    purchaseOrders: purchaseOrderReducer,
    vendors: vendorReducer,
  },
});
