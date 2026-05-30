/**
 * notificationsSlice.js — v2 FIXED
 *
 * Correcciones vs v1:
 *  - 'permission' ahora SE PERSISTE (estaba en whitelist vacío → al recargar
 *    volvía a 'default' y el intervalo nunca arrancaba aunque el browser ya
 *    tuviese permiso concedido)
 *  - Se agrega 'syncPermission': lee el valor REAL del navegador y lo guarda,
 *    llamado al montar el hook DESPUÉS del rehydrate de redux-persist
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // ── Preferencias ──────────────────────────────────────
  enabled:          false,
  channel:          'auto',
  intervalMinutes:  30,
  alertDaysAhead:   2,

  // ── Estado de permisos ────────────────────────────────
  // AHORA SE PERSISTE para que el intervalo arranque en recargas
  permission:       'default',   // 'default' | 'granted' | 'denied' | 'unsupported'
  swRegistered:     false,

  // ── Tracking de notificaciones enviadas ───────────────
  notifiedBatchIds: [],          // [{ batchId, expirationDate, notifiedAt }]

  // ── Último check ──────────────────────────────────────
  lastCheckAt:      null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setEnabled(state, action) {
      state.enabled = action.payload;
    },
    setChannel(state, action) {
      state.channel = action.payload;
    },
    setIntervalMinutes(state, action) {
      state.intervalMinutes = action.payload;
    },
    setAlertDaysAhead(state, action) {
      state.alertDaysAhead = action.payload;
    },
    setPermission(state, action) {
      state.permission = action.payload;
    },
    /**
     * syncPermission: lee el permiso REAL del navegador y lo sincroniza al store.
     * Llamado al montar el hook, DESPUÉS del rehydrate, para corregir posibles
     * valores cacheados incorrectos (ej: 'default' en store pero 'granted' en browser).
     */
    syncPermission(state) {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        state.permission = 'unsupported';
      } else {
        state.permission = Notification.permission;
      }
    },
    setSwRegistered(state, action) {
      state.swRegistered = action.payload;
    },
    markBatchNotified(state, action) {
      const { batchId, expirationDate } = action.payload;
      const exists = state.notifiedBatchIds.find(
        (n) => n.batchId === batchId && n.expirationDate === expirationDate
      );
      if (!exists) {
        state.notifiedBatchIds.push({ batchId, expirationDate, notifiedAt: Date.now() });
      }
    },
    cleanStaleNotified(state) {
      const now = new Date().toISOString().split('T')[0];
      state.notifiedBatchIds = state.notifiedBatchIds.filter(
        (n) => n.expirationDate >= now
      );
    },
    setLastCheckAt(state, action) {
      state.lastCheckAt = action.payload;
    },
    resetNotificationPrefs(state) {
      state.enabled          = false;
      state.channel          = 'auto';
      state.intervalMinutes  = 30;
      state.alertDaysAhead   = 2;
      state.notifiedBatchIds = [];
      state.lastCheckAt      = null;
      // NO resetear permission: el usuario ya dio permiso en el browser
    },
  },
});

export const {
  setEnabled,
  setChannel,
  setIntervalMinutes,
  setAlertDaysAhead,
  setPermission,
  syncPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
  resetNotificationPrefs,
} = notificationsSlice.actions;

// ── Selectors ─────────────────────────────────────────────
export const selectNotifEnabled     = (s) => s.notifications.enabled;
export const selectNotifChannel     = (s) => s.notifications.channel;
export const selectNotifInterval    = (s) => s.notifications.intervalMinutes;
export const selectNotifDaysAhead   = (s) => s.notifications.alertDaysAhead;
export const selectNotifPermission  = (s) => s.notifications.permission;
export const selectSwRegistered     = (s) => s.notifications.swRegistered;
export const selectNotifiedBatchIds = (s) => s.notifications.notifiedBatchIds;
export const selectLastCheckAt      = (s) => s.notifications.lastCheckAt;

export default notificationsSlice.reducer;