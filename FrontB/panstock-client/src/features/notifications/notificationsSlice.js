import { createSlice } from '@reduxjs/toolkit';

/* ────────────────────────────────────────────────────────────────────────────
   notificationsSlice — v2

   CAMBIOS RESPECTO A v1:
   ─────────────────────────────────────────────────────────────────────────
   1. markBatchNotified ahora incluye `notifiedDate` (fecha local YYYY-MM-DD)
      en la key de deduplicación.

      Key anterior: (batchId, expirationDate)
      Key nueva:    (batchId, expirationDate, notifiedDate)

      ¿Por qué? Con la key anterior, una vez que un lote era notificado,
      quedaba marcado PARA SIEMPRE hasta que su fecha de vencimiento pasara.
      Esto hacía que en macOS (donde el store persiste sin recargar la página)
      solo se disparara la notificación de los lotes "nuevos" en rango,
      ignorando los lotes que ya habían sido notificados días atrás y que
      ahora tienen MENOS días restantes (seguían siendo urgentes).

      Con la key nueva, cada lote se considera "ya notificado" solo por el
      día en que se envió. Al día siguiente, notifiedDate cambia → la entrada
      no matchea → se vuelve a notificar. Esto replica el comportamiento
      de Windows/Linux donde el refresh vaciaba el store y todos los lotes
      urgentes se notificaban en cada sesión.

   2. cleanStaleNotified ahora usa la misma lógica de fecha Argentina
      (YYYY-MM-DD del lado cliente) y además elimina entradas de días
      anteriores (notifiedDate < hoy), limpiando el store activamente.

   3. resetNotifiedForDaysChange: nueva acción que limpia notifiedBatchIds
      cuando el usuario cambia alertDaysAhead, forzando un re-chequeo
      completo con el nuevo rango. Sin esto, al ampliar de 2 a 7 días,
      los lotes de días 3-7 no se notificaban hasta el día siguiente.
   ─────────────────────────────────────────────────────────────────────────
*/

const initialState = {
  enabled:          false,
  channel:          'auto',
  intervalMinutes:  30,
  alertDaysAhead:   2,
  permission:       'default',
  swRegistered:     false,
  notifiedBatchIds: [],
  lastCheckAt:      null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setEnabled(state, action)         { state.enabled = action.payload; },
    setChannel(state, action)         { state.channel = action.payload; },
    setIntervalMinutes(state, action) { state.intervalMinutes = action.payload; },

    setAlertDaysAhead(state, action) {
      state.alertDaysAhead = action.payload;
      /* Al cambiar el rango de días limpiar las notificaciones ya enviadas
         para que el check inmediato que sigue encuentre todos los lotes
         dentro del nuevo rango como "no notificados aún". */
      state.notifiedBatchIds = [];
    },

    setPermission(state, action)      { state.permission = action.payload; },

    syncPermission(state) {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        state.permission = 'unsupported';
      } else {
        state.permission = Notification.permission;
      }
    },

    setSwRegistered(state, action) { state.swRegistered = action.payload; },

    /* ── markBatchNotified ──────────────────────────────────────────────────
       Registra que el lote `batchId` fue notificado HOY.
       La key de deduplicación es (batchId + expirationDate + notifiedDate).
       notifiedDate = fecha local del cliente en formato YYYY-MM-DD.
    ── */
    markBatchNotified(state, action) {
      const { batchId, expirationDate, notifiedDate } = action.payload;
      const exists = state.notifiedBatchIds.find(
        (n) =>
          n.batchId        === batchId        &&
          n.expirationDate === expirationDate &&
          n.notifiedDate   === notifiedDate
      );
      if (!exists) {
        state.notifiedBatchIds.push({ batchId, expirationDate, notifiedDate });
      }
    },

    /* ── cleanStaleNotified ─────────────────────────────────────────────────
       Elimina entradas donde:
       - La fecha de vencimiento ya pasó (el lote ya venció → no urge notif)
       - La fecha de notificación es anterior a hoy (entrada vieja del día anterior)
       
       Se usa la fecha del cliente (sin timezone offset) comparando strings
       YYYY-MM-DD para evitar problemas con UTC vs Argentina (UTC-3).
    ── */
    cleanStaleNotified(state) {
      const todayStr = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      ).toISOString().split('T')[0];

      state.notifiedBatchIds = state.notifiedBatchIds.filter(
        (n) =>
          n.expirationDate >= todayStr &&  // lote no vencido aún
          n.notifiedDate   >= todayStr     // entrada de hoy (no de días anteriores)
      );
    },

    /* ── resetNotifiedForDaysChange ─────────────────────────────────────────
       Limpia todo el historial de notificaciones enviadas.
       Usada internamente por setAlertDaysAhead (arriba) y también puede
       llamarse manualmente si se necesita forzar un re-chequeo completo.
    ── */
    resetNotifiedForDaysChange(state) {
      state.notifiedBatchIds = [];
    },

    setLastCheckAt(state, action) { state.lastCheckAt = action.payload; },

    resetNotificationPrefs(state) {
      state.enabled          = false;
      state.channel          = 'auto';
      state.intervalMinutes  = 30;
      state.alertDaysAhead   = 2;
      state.notifiedBatchIds = [];
      state.lastCheckAt      = null;
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
  resetNotifiedForDaysChange,
  setLastCheckAt,
  resetNotificationPrefs,
} = notificationsSlice.actions;

export const selectNotifEnabled     = (s) => s.notifications.enabled;
export const selectNotifChannel     = (s) => s.notifications.channel;
export const selectNotifInterval    = (s) => s.notifications.intervalMinutes;
export const selectNotifDaysAhead   = (s) => s.notifications.alertDaysAhead;
export const selectNotifPermission  = (s) => s.notifications.permission;
export const selectSwRegistered     = (s) => s.notifications.swRegistered;
export const selectNotifiedBatchIds = (s) => s.notifications.notifiedBatchIds;
export const selectLastCheckAt      = (s) => s.notifications.lastCheckAt;

export default notificationsSlice.reducer;