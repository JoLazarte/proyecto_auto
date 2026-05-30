/**
 * useNotifications.js — FIXED v3
 *
 * Fix principal: isMobileDevice() ya NO usa maxTouchPoints como criterio
 * porque Chrome DevTools en modo responsive devuelve maxTouchPoints > 1
 * incluso en escritorio, causando un falso positivo que usa el canal 'push'
 * (Service Worker) cuando el SW aún no está activo, y las notificaciones
 * nunca se muestran.
 *
 * Nueva lógica: solo user-agent string. Si es ambiguo, 'desktop' gana.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }       from 'react-redux';
import { selectToken }                    from '../auth/authSlice';
import {
  selectNotifEnabled,
  selectNotifChannel,
  selectNotifInterval,
  selectNotifDaysAhead,
  selectNotifPermission,
  selectNotifiedBatchIds,
  setPermission,
  setSwRegistered,
  markBatchNotified,
  cleanStaleNotified,
  setLastCheckAt,
} from './notificationsSlice';

const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8081';

// ── Utilidades exportadas ─────────────────────────────────────────────────────

/**
 * Detección de móvil basada SOLO en user-agent.
 * No usamos maxTouchPoints porque Chrome DevTools en modo responsive
 * devuelve maxTouchPoints > 1 en escritorio, causando falsos positivos.
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function supportsNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function supportsServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

// ── Registro del SW ────────────────────────────────────────────────────────────

async function registerSW() {
  if (!supportsServiceWorker()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Esperar a que esté activo antes de intentar usarlo
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[PanStock SW] Error al registrar:', err);
    return null;
  }
}

// ── Solicitar permiso ──────────────────────────────────────────────────────────

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

// ── Enviar notificación ────────────────────────────────────────────────────────
// Estrategia: intenta SW primero (solo si está realmente activo),
// luego Notification API directa como fallback.

async function sendNotif({ title, body, tag, url }) {
  if (!supportsNotifications() || Notification.permission !== 'granted') return;

  const opts = {
    body,
    icon:    '/logo_panstock.png',
    badge:   '/logo_panstock.png',
    tag:     tag || 'panstock-exp',
    renotify: true,
    requireInteraction: false,
    data:    { url: url || '/expiration' },
  };

  // Intentar Service Worker solo si está ACTIVO (no installing/waiting)
  if (supportsServiceWorker()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.active) {
        await reg.showNotification(title, {
          ...opts,
          actions: [
            { action: 'view',    title: '👀 Ver vencimientos' },
            { action: 'dismiss', title: '✕ Cerrar'           },
          ],
        });
        return; // éxito
      }
    } catch (swErr) {
      console.warn('[PanStock Notif] SW falló, usando Notification API:', swErr.message);
    }
  }

  // Fallback: Web Notifications API directa (siempre funciona en escritorio)
  try {
    const n = new Notification(title, opts);
    n.onclick = () => {
      window.focus();
      window.location.href = url || '/expiration';
      n.close();
    };
  } catch (err) {
    console.error('[PanStock Notif] Error final:', err);
  }
}

// ── Fetch del semáforo ─────────────────────────────────────────────────────────

async function fetchSemaphore(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export default function useNotifications() {
  const dispatch         = useDispatch();
  const token            = useSelector(selectToken);
  const enabled          = useSelector(selectNotifEnabled);
  const channel          = useSelector(selectNotifChannel);
  const intervalMinutes  = useSelector(selectNotifInterval);
  const daysAhead        = useSelector(selectNotifDaysAhead);
  const permission       = useSelector(selectNotifPermission);
  const notifiedBatchIds = useSelector(selectNotifiedBatchIds);

  // Refs para acceso fresco dentro del intervalo sin re-crearlo
  const swRegRef         = useRef(null);
  const tokenRef         = useRef(token);
  const channelRef       = useRef(channel);
  const daysAheadRef     = useRef(daysAhead);
  const permissionRef    = useRef(permission);
  const notifiedRef      = useRef(notifiedBatchIds);
  const intervalRef      = useRef(null);

  useEffect(() => { tokenRef.current      = token;          }, [token]);
  useEffect(() => { channelRef.current    = channel;        }, [channel]);
  useEffect(() => { daysAheadRef.current  = daysAhead;      }, [daysAhead]);
  useEffect(() => { permissionRef.current = permission;     }, [permission]);
  useEffect(() => { notifiedRef.current   = notifiedBatchIds; }, [notifiedBatchIds]);

  // ── Sincronizar permission con el navegador al montar ────────────
  useEffect(() => {
    if (!supportsNotifications()) {
      dispatch(setPermission('unsupported'));
      return;
    }
    dispatch(setPermission(Notification.permission));
  }, []); // eslint-disable-line

  // ── Registrar SW al montar ───────────────────────────────────────
  useEffect(() => {
    if (!supportsServiceWorker()) return;
    registerSW().then(reg => {
      if (reg) { swRegRef.current = reg; dispatch(setSwRegistered(true)); }
    });
  }, []); // eslint-disable-line

  // ── Función de chequeo ───────────────────────────────────────────
  const checkExpirations = useCallback(async () => {
    const tkn  = tokenRef.current;
    const perm = permissionRef.current;

    if (!tkn) return;
    if (!supportsNotifications()) return;
    if (perm !== 'granted') return;

    if (import.meta.env?.DEV) {
      console.log('[PanStock Notif] Chequeando vencimientos...');
    }

    try {
      const items = await fetchSemaphore(tkn);
      dispatch(setLastCheckAt(Date.now()));
      dispatch(cleanStaleNotified());

      const days   = daysAheadRef.current;
      const urgent = items.filter(
        i => i.daysToExpire != null && i.daysToExpire >= 0 && i.daysToExpire <= days
      );
      if (urgent.length === 0) return;

      // Agrupar por producto, saltar ya notificados
      const groups = {};
      for (const item of urgent) {
        const alreadyNotified = notifiedRef.current.some(
          n => n.batchId === item.batchId && n.expirationDate === item.expirationDate
        );
        if (alreadyNotified) continue;

        dispatch(markBatchNotified({
          batchId:        item.batchId,
          expirationDate: item.expirationDate,
        }));

        if (!groups[item.productId]) {
          groups[item.productId] = { productName: item.productName, batches: [] };
        }
        groups[item.productId].batches.push(item);
      }

      for (const group of Object.values(groups)) {
        if (!group.batches.length) continue;
        const b = group.batches[0];

        const daysText = b.daysToExpire === 0
          ? 'vence HOY ⚠️'
          : b.daysToExpire === 1
            ? 'vence mañana'
            : `vence en ${b.daysToExpire} días`;

        const expStr = b.expirationDate
          ? new Date(b.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })
          : '—';

        const qty = Number(b.currentQuantity).toLocaleString('es-AR');

        await sendNotif({
          title: `⏰ ${group.productName} — ${daysText}`,
          body:  `📅 Vence: ${expStr}\n📦 Stock en riesgo: ${qty} u.${group.batches.length > 1 ? `\n(+${group.batches.length - 1} lote(s) más)` : ''}`,
          tag:   `panstock-exp-${b.batchId}-${b.expirationDate}`,
          url:   '/expiration',
        });
      }
    } catch (err) {
      console.warn('[PanStock Notif] Error en chequeo:', err.message);
    }
  }, [dispatch]);

  // ── Gestión del intervalo ────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled || !token) return;
    if (!supportsNotifications()) return;
    if (permission !== 'granted') return;

    // Chequeo inmediato al activar
    checkExpirations();

    const ms = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkExpirations, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, token, intervalMinutes, permission]); // eslint-disable-line

  return {
    requestPermission: async () => {
      const result = await requestPermissionNative();
      dispatch(setPermission(result));
      return result;
    },
    checkNow:              checkExpirations,
    isMobile:              isMobileDevice(),
    supportsNotifications: supportsNotifications(),
    supportsServiceWorker: supportsServiceWorker(),
  };
}