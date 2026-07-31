import { configureStore } from '@reduxjs/toolkit';
import purchaseOrderReducer from './purchaseOrderSlice';
import vendorReducer from './vendorSlice';
import containerReducer from './containerSlice';

import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    purchaseOrders: purchaseOrderReducer,
    vendors: vendorReducer,
    containers: containerReducer,
    users: userReducer,
  },
});
