import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';
import { VENDORS_LIST } from '../utils/endpoints';

// Async Thunk to fetch all vendors from the API
export const fetchVendorsPage = createAsyncThunk(
  'vendors/fetchPage',
  async ({ search }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(VENDORS_LIST, {
        params: {
          search: search || undefined,
        },
      });
      return {
        data: response.data,
        search,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || 'Failed to fetch vendors',
      );
    }
  },
);

const vendorSlice = createSlice({
  name: 'vendors',
  initialState: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    error: null,
    search: '',
  },
  reducers: {
    clearVendors: (state) => {
      state.list = [];
      state.page = 1;
      state.hasMore = true;
      state.loading = false;
      state.error = null;
      state.search = '';
    },
    setVendorSearch: (state, action) => {
      if (state.search !== action.payload) {
        state.search = action.payload;
        state.list = [];
        state.page = 1;
        state.hasMore = true;
      }
    },
    setVendorPage: (state, action) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorsPage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorsPage.fulfilled, (state, action) => {
        state.loading = false;
        const { data, search } = action.payload;

        let fetchedList = [];

        if (Array.isArray(data)) {
          const searchVal = search ? search.toLowerCase() : '';
          fetchedList = data
            .map((v) => ({
              id: v.id,
              name: v.name,
              country: v.country,
              po_count: v.po_count,
            }))
            .filter((v) => v.name?.toLowerCase().includes(searchVal));
        } else if (data && typeof data === 'object') {
          const results = data.results || data.vendors || [];
          fetchedList = results.map((v) => ({
            id: v.id,
            name: v.name,
            country: v.country,
            po_count: v.po_count,
          }));
        }

        // Just blindly overwrite the list since we fetch all at once
        state.list = fetchedList;
        state.hasMore = false;
      })
      .addCase(fetchVendorsPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch vendors';
      });
  },
});

export const { clearVendors, setVendorSearch, setVendorPage } =
  vendorSlice.actions;
export default vendorSlice.reducer;
