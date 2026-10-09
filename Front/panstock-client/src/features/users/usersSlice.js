import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAllUsers = createAsyncThunk(
  'users/fetchAll',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await userService.getAll(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const createEmployee = createAsyncThunk(
  'users/createEmployee',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await userService.createEmployee(token, data);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

export const setUserEnabled = createAsyncThunk(
  'users/setEnabled',
  async ({ token, id, enabled }, { rejectWithValue }) => {
    try {
      await userService.setEnabled(token, id, enabled);
      return { id, enabled };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    status: 'idle',        // idle | loading | succeeded | failed
    error: null,
    actionStatus: 'idle',  // idle | loading | succeeded | failed
    actionError: null,
  },
  reducers: {
    clearUserActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchAllUsers.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchAllUsers.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    builder
      .addCase(createEmployee.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createEmployee.fulfilled, (s) => { s.actionStatus = 'succeeded'; })
      .addCase(createEmployee.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });

    builder
      .addCase(setUserEnabled.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(setUserEnabled.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        const idx = s.items.findIndex((u) => u.id === a.payload.id);
        if (idx !== -1) s.items[idx] = { ...s.items[idx], enabled: a.payload.enabled };
      })
      .addCase(setUserEnabled.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const { clearUserActionState } = usersSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUsers       = (s) => s.users.items;
export const selectUsersStatus = (s) => s.users.status;
export const selectUsersError  = (s) => s.users.error;
export const selectUserAction  = (s) => ({
  status: s.users.actionStatus,
  error:  s.users.actionError,
});

export default usersSlice.reducer;
