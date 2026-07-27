import { createSlice } from '@reduxjs/toolkit';

const purchaseOrderSlice = createSlice({
  name: 'purchaseOrders',
  initialState: {
    list: [],
    allList: [], // full list for export
    kanbanList: {
      new_without_invoice: [],
      invoice_delayed: [],
      delivery_overdue: [],
      remaining_items: [],
    },
  },
  reducers: {
    setPurchaseOrdersList: (state, action) => {
      console.log(
        'REDUCER setPurchaseOrdersList: payload size =',
        action.payload?.length,
      );
      state.list = action.payload;
    },
    setAllPurchaseOrders: (state, action) => {
      state.allList = action.payload;
    },
    setKanbanList: (state, action) => {
      state.kanbanList = { ...state.kanbanList, ...action.payload };
    },
  },
});

export const { setPurchaseOrdersList, setAllPurchaseOrders, setKanbanList } =
  purchaseOrderSlice.actions;
export default purchaseOrderSlice.reducer;
