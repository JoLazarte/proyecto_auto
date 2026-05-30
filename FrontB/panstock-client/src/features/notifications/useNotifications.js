/**
 * useNotifications.js — v4 FIXED
 *
 * Correcciones principales vs v3:
 *
 * BUG 1 (crítico): El intervalo usaba `permission` del store Redux.
 *   El store arrancaba en 'default' porque 'permission' no se persistía.
 *   → Ahora: todas las guardas de permisos leen Notification.permission
 *     DIRECTAMENTE del navegador (fuente de verdad única).
 *
 * BUG 2 (crítico): Race condition con redux-persist.
 *   El effect de sync corría ANTES del rehydrate → sobreescribía el valor
 *   cacheado con 'default'.
 *   → Ahora: syncPermission se llama con un pequeño delay post-mount para
 *     asegurarse de que el rehydrate ya ocurrió.
 *
 * BUG 3: Las notificaciones no incluían categoryName.
 *   → El backend ahora devuelve categoryName en ExpirationItemResponse.
 *   → El body de la notificación incluye categoría, cantidad y fecha exacta.
 *
 * BUG 4: sendNotif intentaba SW antes de verificar si estaba activo.
 *   → Ahora verifica reg.active antes de usar el SW.
 *
 * BUG 5: El modal y el hook estaban desincronizados en el estado del permiso.
 *   → Ambos ahora leen de getBrowserPermission() para el UI y el hook
 *     sincroniza al store como efecto secundario.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector }       from 'react-redux';
import { selectToken }                    from '../auth/authSlice';
import {
  selectNotifEnabled,
  selectNotifInterval,
  selectNotifDaysAhead,
  selectNotifiedBatchIds,
  syncPermission,
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
 * No usamos maxTouchPoints: Chrome DevTools en modo responsive
 * devuelve maxTouchPoints > 1 en escritorio → falsos positivos.
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

/**
 * getBrowserPermission — LEE EL PERMISO REAL DEL NAVEGADOR.
 * Esta es la fuente de verdad. El store Redux es solo un cache para la UI.
 */
export function getBrowserPermission() {
  if (!supportsNotifications()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ── Registro del SW ────────────────────────────────────────────────────────────

async function registerSW() {
  if (!supportsServiceWorker()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      // Esperar a que esté activo
      if (!existing.active) {
        await navigator.serviceWorker.ready;
      }
      return existing;
    }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
// Estrategia:
//   1. Notification API directa (siempre disponible en escritorio, más confiable)
//   2. SW como fallback (mejor en móvil con push real)
//
// IMPORTANTE: Siempre verifica Notification.permission directamente,
// no confía en el valor del store Redux.

async function sendNotif({ title, body, tag, url }) {
  // Guarda real del navegador — NO del store
  if (!supportsNotifications() || Notification.permission !== 'granted') return;

  const opts = {
    body,
    icon:             '/logo_panstock.png',
    badge:            '/logo_panstock.png',
    tag:              tag || 'panstock-exp',
    renotify:         true,
    requireInteraction: false,
    data:             { url: url || '/expiration' },
  };

  // 1. Intentar Notification API directa (más confiable en escritorio)
  try {
    const n = new Notification(title, opts);
    n.onclick = () => {
      window.focus();
      if (window.location.pathname !== (url || '/expiration')) {
        window.location.href = url || '/expiration';
      }
      n.close();
    };
    return; // éxito
  } catch (e1) {
    // En mobile Chrome la Notification API directa puede fallar → fallback SW
    if (import.meta.env?.DEV) {
      console.warn('[PanStock Notif] Notification API falló, intentando SW:', e1.message);
    }
  }

  // 2. Fallback: Service Worker (mejor en móvil)
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
        return;
      }
    } catch (e2) {
      console.warn('[PanStock Notif] SW también falló:', e2.message);
    }
  }

  console.error('[PanStock Notif] No se pudo enviar la notificación por ningún canal.');
}

// ── Fetch del semáforo ─────────────────────────────────────────────────────────

async function fetchSemaphore(token) {
  const res = await fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
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
  const intervalMinutes  = useSelector(selectNotifInterval);
  const daysAhead        = useSelector(selectNotifDaysAhead);
  const notifiedBatchIds = useSelector(selectNotifiedBatchIds);

  // Refs para acceso fresco dentro del intervalo sin re-crearlo
  const swRegRef        = useRef(null);
  const tokenRef        = useRef(token);
  const daysAheadRef    = useRef(daysAhead);
  const notifiedRef     = useRef(notifiedBatchIds);
  const intervalRef     = useRef(null);

  useEffect(() => { tokenRef.current     = token;          }, [token]);
  useEffect(() => { daysAheadRef.current = daysAhead;      }, [daysAhead]);
  useEffect(() => { notifiedRef.current  = notifiedBatchIds; }, [notifiedBatchIds]);

  // ── Sincronizar permission con el navegador ──────────────────────────────
  // Se hace con un pequeño delay para que redux-persist ya haya rehidratado.
  // Si el store dice 'default' pero el browser dice 'granted' (usuario ya había
  // dado permiso en sesiones anteriores), esto lo corrige.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(syncPermission());
    }, 200);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  // ── Registrar SW al montar ───────────────────────────────────────────────
  useEffect(() => {
    if (!supportsServiceWorker()) return;
    registerSW().then(reg => {
      if (reg) {
        swRegRef.current = reg;
        dispatch(setSwRegistered(true));
      }
    });
  }, []); // eslint-disable-line

  // ── Función de chequeo ───────────────────────────────────────────────────
  // CRÍTICO: usa getBrowserPermission() — NO el valor del store —
  // para evitar que un store desactualizado bloquee las notificaciones.
  const checkExpirations = useCallback(async () => {
    const tkn = tokenRef.current;
    if (!tkn) return;
    if (!supportsNotifications()) return;

    // ← FUENTE DE VERDAD: permiso real del navegador
    if (getBrowserPermission() !== 'granted') return;

    if (import.meta.env?.DEV) {
      console.log('[PanStock Notif] Chequeando vencimientos...');
    }

    try {
      const items = await fetchSemaphore(tkn);
      dispatch(setLastCheckAt(Date.now()));
      dispatch(cleanStaleNotified());
      // Sincronizar el store con el estado real del browser (por si cambió)
      dispatch(syncPermission());

      const days   = daysAheadRef.current;
      const urgent = items.filter(
        (i) => i.daysToExpire != null && i.daysToExpire >= 0 && i.daysToExpire <= days
      );

      if (urgent.length === 0) return;

      // Agrupar por producto, saltar ya notificados
      const groups = {};
      for (const item of urgent) {
        const alreadyNotified = notifiedRef.current.some(
          (n) => n.batchId === item.batchId && n.expirationDate === item.expirationDate
        );
        if (alreadyNotified) continue;

        dispatch(markBatchNotified({
          batchId:        item.batchId,
          expirationDate: item.expirationDate,
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

        // Ordenar por urgencia: primero los que vencen antes
        group.batches.sort((a, b) => a.daysToExpire - b.daysToExpire);
        const b = group.batches[0];

        // ── Texto de días ───────────────────────────────────────────────
        const daysText = b.daysToExpire === 0
          ? 'vence HOY ⚠️'
          : b.daysToExpire === 1
            ? 'vence mañana'
            : `vence en ${b.daysToExpire} días`;

        // ── Fecha exacta formateada ─────────────────────────────────────
        const expStr = b.expirationDate
          ? new Date(b.expirationDate + 'T00:00:00').toLocaleDateString('es-AR', {
              day:   '2-digit',
              month: 'long',
              year:  'numeric',
            })
          : '—';

        // ── Cantidad total en riesgo (suma de todos los lotes urgentes) ──
        const totalQty = group.batches.reduce(
          (sum, lote) => sum + Number(lote.currentQuantity || 0),
          0
        );
        const qtyStr = totalQty.toLocaleString('es-AR');

        // ── Categoría ───────────────────────────────────────────────────
        const catStr = group.categoryName ? `📂 ${group.categoryName}` : null;

        // ── Body de la notificación ─────────────────────────────────────
        // Incluye: producto, categoría, cantidad en riesgo, fecha exacta
        const bodyLines = [
          catStr,
          `📅 Vence: ${expStr}`,
          `📦 Cantidad en riesgo: ${qtyStr} u.`,
          group.batches.length > 1
            ? `(${group.batches.length} lotes afectados)`
            : null,
        ].filter(Boolean).join('\n');

        await sendNotif({
          title: `⏰ ${group.productName} — ${daysText}`,
          body:  bodyLines,
          tag:   `panstock-exp-${b.batchId}-${b.expirationDate}`,
          url:   '/expiration',
        });
      }
    } catch (err) {
      console.warn('[PanStock Notif] Error en chequeo:', err.message);
    }
  }, [dispatch]);

  // ── Gestión del intervalo ────────────────────────────────────────────────
  // CRÍTICO: la condición de arranque usa getBrowserPermission() directamente,
  // NO el valor del store (que puede estar en 'default' por el cache).
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled || !token) return;
    if (!supportsNotifications()) return;

    // ← FUENTE DE VERDAD: permiso real del navegador
    if (getBrowserPermission() !== 'granted') return;

    // Chequeo inmediato al activar o cambiar intervalo
    checkExpirations();

    const ms = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(checkExpirations, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token, intervalMinutes]);

  // ── API pública del hook ─────────────────────────────────────────────────
  return {
    requestPermission: async () => {
      const result = await requestPermissionNative();
      dispatch(setPermission(result));
      // Si se acaba de conceder, arrancar el chequeo inmediatamente
      if (result === 'granted' && enabled) {
        checkExpirations();
      }
      return result;
    },
    checkNow:              checkExpirations,
    isMobile:              isMobileDevice(),
    supportsNotifications: supportsNotifications(),
    supportsServiceWorker: supportsServiceWorker(),
  };
}