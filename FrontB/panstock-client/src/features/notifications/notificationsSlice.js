/**
 * notificationsSlice.js
 *
 * Gestiona el estado de las notificaciones de vencimiento:
 *  - preferencias del usuario (habilitado, canal, intervalo)
 *  - último check
 *  - IDs de lotes ya notificados (para no repetir)
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // ── Preferencias ──────────────────────────────────────
  enabled:          false,   // notificaciones habilitadas globalmente
  channel:          'auto',  // 'auto' | 'desktop' | 'push'
  intervalMinutes:  30,      // cada cuántos minutos revisar
  alertDaysAhead:   2,       // días de anticipación para alertar

  // ── Estado de permisos ────────────────────────────────
  permission:       'default', // 'default' | 'granted' | 'denied'
  swRegistered:     false,

  // ── Tracking de notificaciones enviadas ───────────────
  // Guardamos los batchId ya notificados con su fecha de vencimiento
  // para no re-notificar en el mismo ciclo
  notifiedBatchIds: [], // [{ batchId, expirationDate, notifiedAt }]

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
    setSwRegistered(state, action) {
      state.swRegistered = action.payload;
    },
    markBatchNotified(state, action) {
      // action.payload: { batchId, expirationDate }
      const exists = state.notifiedBatchIds.find(
        (n) => n.batchId === action.payload.batchId
          && n.expirationDate === action.payload.expirationDate
      );
      if (!exists) {
        state.notifiedBatchIds.push({
          ...action.payload,
          notifiedAt: Date.now(),
        });
      }
    },
    // Limpia los IDs notificados que ya pasaron su fecha de vencimiento
    cleanStaleNotified(state) {
      const now = new Date().toISOString().split('T')[0];
      state.notifiedBatchIds = state.notifiedBatchIds.filter(
        (n) => n.expirationDate >= now
      );
    },
    setLastCheckAt(state, action) {
      state.lastCheckAt = action.payload;
    },
    // Reset completo de preferencias (sin borrar permission, se re-solicita)
    resetNotificationPrefs(state) {
      state.enabled         = false;
      state.channel         = 'auto';
      state.intervalMinutes = 30;
      state.alertDaysAhead  = 2;
      state.notifiedBatchIds = [];
      state.lastCheckAt     = null;
    },
  },
});

export const {
  setEnabled,
  setChannel,
  setIntervalMinutes,
  setAlertDaysAhead,
  setPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
  resetNotificationPrefs,
} = notificationsSlice.actions;

// ── Selectors ─────────────────────────────────────────────
export const selectNotifEnabled       = (s) => s.notifications.enabled;
export const selectNotifChannel       = (s) => s.notifications.channel;
export const selectNotifInterval      = (s) => s.notifications.intervalMinutes;
export const selectNotifDaysAhead     = (s) => s.notifications.alertDaysAhead;
export const selectNotifPermission    = (s) => s.notifications.permission;
export const selectSwRegistered       = (s) => s.notifications.swRegistered;
export const selectNotifiedBatchIds   = (s) => s.notifications.notifiedBatchIds;
export const selectLastCheckAt        = (s) => s.notifications.lastCheckAt;

export default notificationsSlice.reducer;