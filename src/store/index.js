import { configureStore } from '@reduxjs/toolkit';
import purchaseOrderReducer from '../features/purchaseOrders/store/purchaseOrderSlice';
import vendorReducer from './vendorSlice';
import containerReducer from '../features/containers/store/containerSlice';

import userReducer from '../features/users/store/userSlice';

export const store = configureStore({
  reducer: {
    purchaseOrders: purchaseOrderReducer,
    vendors: vendorReducer,
    containers: containerReducer,
    users: userReducer,
  },
});
