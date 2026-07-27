import { createSlice } from '@reduxjs/toolkit';

const containerSlice = createSlice({
  name: 'containers',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    setContainersList: (state, action) => {
      state.list = action.payload;
    },
    setContainersLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setContainersList, setContainersLoading } =
  containerSlice.actions;
export default containerSlice.reducer;
