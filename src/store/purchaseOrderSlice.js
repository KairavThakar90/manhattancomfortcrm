import { createSlice } from '@reduxjs/toolkit';

const purchaseOrderSlice = createSlice({
  name: 'purchaseOrders',
  initialState: {
    list: [],
  },
  reducers: {
    setPurchaseOrdersList: (state, action) => {
      console.log(
        'REDUCER setPurchaseOrdersList: payload size =',
        action.payload?.length,
      );
      state.list = action.payload;
    },
  },
});

export const { setPurchaseOrdersList } = purchaseOrderSlice.actions;
export default purchaseOrderSlice.reducer;
