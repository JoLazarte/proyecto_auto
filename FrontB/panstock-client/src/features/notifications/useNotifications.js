import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }       from 'react-redux';
import { selectToken }                    from '../auth/authSlice';
import {
  selectNotifEnabled,
  selectNotifInterval,
  selectNotifDaysAhead,
  selectNotifPermission,
  selectNotifiedBatchIds,
  syncPermission,
  setPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
} from './notificationsSlice';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

/* ────────────────────────────────────────────────────────────────────────────
   HELPERS DE ENTORNO
   ─────────────────────────────────────────────────────────────────────────── */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isMacOS() {
  if (typeof navigator === 'undefined') return false;
  return /Mac OS X/.test(navigator.userAgent) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function supportsNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function supportsServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function getBrowserPermission() {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission;
}

/* ────────────────────────────────────────────────────────────────────────────
   FECHA LOCAL DEL CLIENTE (sin depender de timezone del servidor)
   Devuelve YYYY-MM-DD usando el offset del navegador del usuario.
   Esto evita el bug de macOS donde new Date().toISOString() devuelve
   la fecha UTC que en Argentina (UTC-3) puede ser el día anterior.
   ─────────────────────────────────────────────────────────────────────────── */
function todayLocal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
}

/* ────────────────────────────────────────────────────────────────────────────
   SW REGISTRATION — espera a estado 'activated' antes de retornar.
   Crítico en macOS: showNotification() lanza InvalidStateError si el SW
   no está en estado 'active'.
   ─────────────────────────────────────────────────────────────────────────── */
async function registerAndWaitSW() {
  if (!supportsServiceWorker()) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    if (reg.active) return reg;
    await navigator.serviceWorker.ready;
    reg = await navigator.serviceWorker.getRegistration('/');
    return reg || null;
  } catch (err) {
    console.warn('[PanStock SW] Error al registrar:', err);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   PEDIR PERMISO
   ─────────────────────────────────────────────────────────────────────────── */
async function requestPermissionNative() {
  if (!supportsNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   ENVIAR NOTIFICACIÓN
   Orden de preferencia (macOS-safe):
   1. SW postMessage → sw.showNotification  [más confiable en macOS]
   2. reg.showNotification() directo
   3. new Notification() — SOLO si no es macOS
   ─────────────────────────────────────────────────────────────────────────── */
async function sendNotif({ title, body, tag, url }) {
  if (!supportsNotifications()) return false;
  if (Notification.permission !== 'granted') return false;

  const opts = {
    body,
    icon:               '/logo_panstock.png',
    badge:              '/logo_panstock.png',
    tag:                tag || 'panstock-exp',
    renotify:           true,
    requireInteraction: false,
    data:               { url: url || '/expiration' },
  };

  const onMac = isMacOS();

  /* Intento 1: SW postMessage (prioritario en macOS) */
  if (supportsServiceWorker()) {
    try {
      let reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        reg = await navigator.serviceWorker.getRegistration('/');
      }
      const swTarget = reg?.active || reg?.waiting || reg?.installing;
      if (swTarget) {
        return await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          const handler = (event) => {
            if (event.data?.type === 'NOTIFICATION_SENT' && event.data?.tag === tag) {
              clearTimeout(timeout);
              navigator.serviceWorker.removeEventListener('message', handler);
              resolve(true);
            }
          };
          navigator.serviceWorker.addEventListener('message', handler);
          swTarget.postMessage({
            type: 'SHOW_NOTIFICATION',
            title, body,
            tag:  tag || 'panstock-exp',
            url:  url || '/expiration',
            icon: '/logo_panstock.png',
          });
        });
      }
    } catch (e1) {
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] SW postMessage falló:', e1.message);
    }
  }

  /* Intento 2: reg.showNotification() directo */
  if (supportsServiceWorker()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        await reg.showNotification(title, {
          ...opts,
          actions: [
            { action: 'view',    title: 'Ver vencimientos' },
            { action: 'dismiss', title: 'Cerrar'           },
          ],
        });
        return true;
      }
    } catch (e2) {
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] reg.showNotification falló:', e2.message);
    }
  }

  /* Intento 3: new Notification() — SOLO si NO es macOS */
  if (!onMac) {
    try {
      const n = new Notification(title, opts);
      n.onclick = () => {
        window.focus();
        if (window.location.pathname !== (url || '/expiration'))
          window.location.href = url || '/expiration';
        n.close();
      };
      return true;
    } catch (e3) {
      if (import.meta.env?.DEV) console.warn('[PanStock Notif] new Notification() falló:', e3.message);
    }
  }

  return false;
}

/* ────────────────────────────────────────────────────────────────────────────
   FETCH SEMÁFORO
   ─────────────────────────────────────────────────────────────────────────── */
async function fetchSemaphore(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

/* ────────────────────────────────────────────────────────────────────────────
   HOOK PRINCIPAL
   ─────────────────────────────────────────────────────────────────────────── */
export default function useNotifications() {
  const dispatch         = useDispatch();
  const token            = useSelector(selectToken);
  const enabled          = useSelector(selectNotifEnabled);
  const intervalMinutes  = useSelector(selectNotifInterval);
  const daysAhead        = useSelector(selectNotifDaysAhead);  // ← en deps del intervalo
  const storedPermission = useSelector(selectNotifPermission);
  const notifiedBatchIds = useSelector(selectNotifiedBatchIds);

  const swRegRef      = useRef(null);
  const tokenRef      = useRef(token);
  const daysAheadRef  = useRef(daysAhead);
  const notifiedRef   = useRef(notifiedBatchIds);
  const intervalRef   = useRef(null);
  const permissionRef = useRef(storedPermission);

  useEffect(() => { tokenRef.current      = token;            }, [token]);
  useEffect(() => { daysAheadRef.current  = daysAhead;        }, [daysAhead]);
  useEffect(() => { notifiedRef.current   = notifiedBatchIds; }, [notifiedBatchIds]);
  useEffect(() => { permissionRef.current = storedPermission; }, [storedPermission]);

  /* ── Sync permiso: polling cada 2s ──────────────────────────────────────── */
  useEffect(() => {
    const sync = () => {
      dispatch(syncPermission());
      permissionRef.current = getBrowserPermission();
    };
    sync();
    const id = setInterval(sync, 2000);
    return () => clearInterval(id);
  }, [dispatch]);

  /* ── Registro del SW ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!supportsServiceWorker()) return;
    registerAndWaitSW().then((reg) => {
      if (reg) {
        swRegRef.current = reg;
        dispatch(setSwRegistered(true));
      }
    });
  }, [dispatch]);

  /* ────────────────────────────────────────────────────────────────────────
     checkExpirations
     ─────────────────────────────────────────────────────────────────────────
     LÓGICA DE DEDUPLICACIÓN (corregida para macOS):

     Key de "ya notificado": (batchId, expirationDate, notifiedDate)
     donde notifiedDate = todayLocal() = YYYY-MM-DD del cliente.

     Esto significa:
     - Un lote se notifica UNA VEZ POR DÍA mientras esté en rango.
     - Al día siguiente, notifiedDate cambia → se vuelve a notificar.
     - cleanStaleNotified() elimina entradas del día anterior,
       manteniendo el store limpio.

     Diferencia con la versión anterior:
     - Antes: key = (batchId, expirationDate) → notificado una sola vez
       para siempre. En macOS donde el store persiste sin refresh, esto
       hacía que lotes con 1-6 días restantes nunca se volvieran a notificar.
  ── */
  const checkExpirations = useCallback(async () => {
    const tkn  = tokenRef.current;
    const perm = getBrowserPermission();
    if (!tkn)                        return;
    if (!supportsNotifications())    return;
    if (perm !== 'granted')          return;

    if (import.meta.env?.DEV) console.log('[PanStock Notif] Chequeando vencimientos…');

    try {
      const items = await fetchSemaphore(tkn);
      dispatch(setLastCheckAt(Date.now()));
      dispatch(cleanStaleNotified());
      dispatch(syncPermission());

      const days  = daysAheadRef.current;
      const today = todayLocal();

      const urgent = items.filter(
        (i) => i.daysToExpire != null && i.daysToExpire >= 0 && i.daysToExpire <= days
      );

      if (urgent.length === 0) return;

      const groups = {};
      for (const item of urgent) {
        /* ── Dedup: (batchId, expirationDate, notifiedDate=hoy) ────────────
           Si ya se notificó HOY este lote → saltar.
           Mañana notifiedDate será diferente → se vuelve a notificar.
        ── */
        const alreadyNotified = notifiedRef.current.some(
          (n) =>
            n.batchId        === item.batchId        &&
            n.expirationDate === item.expirationDate &&
            n.notifiedDate   === today
        );
        if (alreadyNotified) continue;

        dispatch(markBatchNotified({
          batchId:        item.batchId,
          expirationDate: item.expirationDate,
          notifiedDate:   today,          // ← nuevo campo
        }));

        if (!groups[item.productId]) {
          groups[item.productId] = {
            productName:  item.productName,
            categoryName: item.categoryName || null,
            batches:      [],
          };
        }
        groups[item.productId].batches.push(item);
      }

      for (const group of Object.values(groups)) {
        if (!group.batches.length) continue;
        group.batches.sort((a, b) => a.daysToExpire - b.daysToExpire);
        const b = group.batches[0];

        const daysText = b.daysToExpire === 0
          ? 'vence HOY'
          : b.daysToExpire === 1
            ? 'vence mañana'
            : `vence en ${b.daysToExpire} días`;

        const expStr = b.expirationDate
          ? new Date(b.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })
          : '—';

        const totalQty = group.batches.reduce(
          (sum, lote) => sum + Number(lote.currentQuantity || 0), 0
        );
        const catStr = group.categoryName ? `Categoría: ${group.categoryName}` : null;

        const bodyLines = [
          catStr,
          `Vence: ${expStr}`,
          `Cantidad en riesgo: ${totalQty.toLocaleString('es-AR')} u.`,
          group.batches.length > 1 ? `(${group.batches.length} lotes afectados)` : null,
        ].filter(Boolean).join('\n');

        await sendNotif({
          title: `PanStock — ${group.productName} ${daysText}`,
          body:  bodyLines,
          tag:   `panstock-exp-${b.batchId}-${b.expirationDate}`,
          url:   '/expiration',
        });
      }
    } catch (err) {
      console.warn('[PanStock Notif] Error en chequeo:', err.message);
    }
  }, [dispatch]);

  /* ────────────────────────────────────────────────────────────────────────
     INTERVALO DE POLLING

     CAMBIO CLAVE (Bug 1):
     Se agrega `daysAhead` a las dependencias del useEffect.

     Cuando el usuario cambia alertDaysAhead en el modal:
     1. notificationsSlice.setAlertDaysAhead() limpia notifiedBatchIds (slice)
     2. daysAhead cambia en el store → React re-renderiza → este useEffect
        se re-ejecuta → se cancela el intervalo viejo → se lanza
        checkExpirations() inmediatamente con el nuevo rango de días.

     Sin esto (versión anterior): el intervalo seguía corriendo con la
     función anterior, y aunque daysAheadRef.current se actualizaba,
     el check no se disparaba hasta el siguiente tick del setInterval
     (que podía ser en 30 minutos). En macOS esto era especialmente
     notable porque el store persistente hacía que los lotes del nuevo
     rango ya estuvieran en notifiedBatchIds (del check anterior con
     menos días), bloqueando las notificaciones.
  ── */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const perm = getBrowserPermission();

    if (!enabled || !token)        return;
    if (!supportsNotifications())  return;
    if (perm !== 'granted')        return;

    /* Disparo inmediato: corre el check ahora con el daysAhead actual */
    checkExpirations();

    const ms = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkExpirations, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // daysAhead en deps: cuando cambia → re-ejecuta el effect → check inmediato
  }, [enabled, token, intervalMinutes, daysAhead, storedPermission, checkExpirations]);

  return {
    requestPermission: async () => {
      const result = await requestPermissionNative();
      dispatch(setPermission(result));
      permissionRef.current = result;
      if (result === 'granted') {
        registerAndWaitSW().then((reg) => {
          if (reg) {
            swRegRef.current = reg;
            dispatch(setSwRegistered(true));
          }
          if (enabled) setTimeout(() => checkExpirations(), 500);
        });
      }
      return result;
    },
    checkNow:              checkExpirations,
    isMobile:              isMobileDevice(),
    isMacOS:               isMacOS(),
    supportsNotifications: supportsNotifications(),
    supportsServiceWorker: supportsServiceWorker(),
  };
}