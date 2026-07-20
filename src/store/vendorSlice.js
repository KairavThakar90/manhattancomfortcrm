import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

// Async Thunk to fetch a page of vendors from the API
export const fetchVendorsPage = createAsyncThunk(
  'vendors/fetchPage',
  async ({ page, pageSize, search }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/vendors', {
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
        },
      });
      return {
        data: response.data,
        page,
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
        const { data, page } = action.payload;

        let fetchedList = [];
        let more = false;

        if (Array.isArray(data)) {
          // If it's a flat array, we filter it local-search style
          const searchVal = action.payload.search.toLowerCase();
          const filtered = data
            .map((v) => ({
              id: v.id,
              name: v.name,
              country: v.country,
            }))
            .filter((v) => v.name?.toLowerCase().includes(searchVal));

          const limit = 15;
          const start = (page - 1) * limit;
          const end = start + limit;
          fetchedList = filtered.slice(start, end);
          more = end < filtered.length;
        } else if (data && typeof data === 'object') {
          const results = data.results || data.vendors || [];
          fetchedList = results.map((v) => ({
            id: v.id,
            name: v.name,
            country: v.country,
          }));
          const total = data.total || results.length;
          more = page * 15 < total;
        }

        if (page === 1) {
          state.list = fetchedList;
        } else {
          // Deduplicate items on append
          const existingIds = new Set(state.list.map((v) => v.id));
          const newItems = fetchedList.filter((v) => !existingIds.has(v.id));
          state.list = [...state.list, ...newItems];
        }

        state.page = page;
        state.hasMore = more;
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
