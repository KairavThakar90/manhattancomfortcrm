import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getUsers as fetchUsersAPI } from '../services/user.service';

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const data = await fetchUsersAPI();
  return Array.isArray(data) ? data : data?.users || [];
});

const userSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default userSlice.reducer;
