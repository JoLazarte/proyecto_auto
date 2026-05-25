import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  if (data && typeof data === 'object' && 'ok' in data) {
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data ?? data;
  }
  return data;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * GET /api/waste-records
 *
 * Parámetros opcionales:
 *   params.from        → YYYY-MM-DD  (fecha desde)
 *   params.to          → YYYY-MM-DD  (fecha hasta)
 *   params.categoryId  → número
 *   params.supplierId  → número
 *   params.reason      → WasteReason enum string
 *
 * Ambos roles (OWNER y EMPLOYEE) pueden acceder.
 */
export const fetchWasteRecords = createAsyncThunk(
  'waste/fetchAll',
  async ({ token, params = {} } = {}, { rejectWithValue }) => {
    try {
      const q = new URLSearchParams();
      if (params.from)        q.set('from',        params.from);
      if (params.to)          q.set('to',          params.to);
      if (params.categoryId)  q.set('categoryId',  String(params.categoryId));
      if (params.supplierId)  q.set('supplierId',  String(params.supplierId));
      if (params.reason)      q.set('reason',      params.reason);

      const qs = q.toString();
      return await fetch(`${BASE_URL}/api/waste-records${qs ? `?${qs}` : ''}`, {
        headers: authHeaders(token),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * POST /api/waste-records
 * Body: { batchId, userId?, quantity, reason, notes? }
 * Accesible por OWNER y EMPLOYEE.
 */
export const createWasteRecord = createAsyncThunk(
  'waste/create',
  async ({ token, data }, { rejectWithValue }) => {
    try {
      return await fetch(`${BASE_URL}/api/waste-records`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }).then(handleResponse);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const wasteSlice = createSlice({
  name: 'waste',
  initialState: {
    items:        [],
    listStatus:   'idle',   // idle | loading | succeeded | failed
    listError:    null,
    actionStatus: 'idle',   // idle | loading | succeeded | failed
    actionError:  null,
    lastCreated:  null,

    // Filtros activos (se persisten en memoria para mantener el estado al navegar)
    activeFilters: {
      from:        '',
      to:          '',
      categoryId:  '',
      supplierId:  '',
      reason:      '',
    },
  },
  reducers: {
    clearWasteActionState(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
      state.lastCreated  = null;
    },
    setWasteFilters(state, action) {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    clearWasteFilters(state) {
      state.activeFilters = {
        from: '', to: '', categoryId: '', supplierId: '', reason: '',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWasteRecords.pending,   (s) => { s.listStatus = 'loading'; s.listError = null; })
      .addCase(fetchWasteRecords.fulfilled, (s, a) => { s.listStatus = 'succeeded'; s.items = a.payload ?? []; })
      .addCase(fetchWasteRecords.rejected,  (s, a) => { s.listStatus = 'failed'; s.listError = a.payload; });

    builder
      .addCase(createWasteRecord.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(createWasteRecord.fulfilled, (s, a) => {
        s.actionStatus = 'succeeded';
        s.lastCreated  = a.payload;
        // Agregar al inicio de la lista
        if (s.items) s.items.unshift(a.payload);
      })
      .addCase(createWasteRecord.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });
  },
});

export const {
  clearWasteActionState,
  setWasteFilters,
  clearWasteFilters,
} = wasteSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWasteRecords     = (s) => s.waste.items;
export const selectWasteListStatus  = (s) => s.waste.listStatus;
export const selectWasteListError   = (s) => s.waste.listError;
export const selectWasteFilters     = (s) => s.waste.activeFilters;
export const selectWasteAction      = (s) => ({
  status:      s.waste.actionStatus,
  error:       s.waste.actionError,
  lastCreated: s.waste.lastCreated,
});

export default wasteSlice.reducer;