import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/es/storage';

import authReducer          from '../features/auth/authSlice';
import categoriesReducer    from '../features/catalog/categoriesSlice';
import productsReducer      from '../features/catalog/productsSlice';
import suppliersReducer     from '../features/catalog/suppliersSlice';
import expirationReducer    from '../features/stock/expirationSlice';
import stockReducer         from '../features/stock/stockSlice';
import wasteReducer         from '../features/waste/wasteSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';

// ─── Persist configs ──────────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'panstock-auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const categoriesPersistConfig = {
  key: 'panstock-categories',
  storage,
  whitelist: ['items'],
};

const productsPersistConfig = {
  key: 'panstock-products',
  storage,
  // Los filtros no persisten; cada login empieza limpio
  whitelist: ['items'],
};

const suppliersPersistConfig = {
  key: 'panstock-suppliers',
  storage,
  whitelist: ['items'],
};

const wastePersistConfig = {
  key: 'panstock-waste',
  storage,
  // Solo se persiste la lista de usuarios para el dropdown del OWNER
  whitelist: ['users'],
};

/**
 * notificationsPersistConfig
 *
 * Persistimos las PREFERENCIAS del usuario (enabled, channel, interval, daysAhead)
 * para que sobrevivan a recargas de página.
 *
 * NO persistimos:
 *  - permission: se re-lee del navegador en cada sesión
 *  - swRegistered: el SW se re-registra en cada inicio
 *  - lastCheckAt: se resetea para forzar un chequeo fresco
 *  - notifiedBatchIds: se regeneran en cada sesión para no silenciar alertas
 *    si el usuario estuvo ausente varios días
 */
const notificationsPersistConfig = {
  key: 'panstock-notifications',
  storage,
  whitelist: ['enabled', 'channel', 'intervalMinutes', 'alertDaysAhead'],
};

// ── expiration: sin persist (time-sensitive, siempre se refresca) ─────────────

// ─── Root Reducer con reset en logout ────────────────────────────────────────
//
// Al hacer logout, reseteamos todo excepto auth (que gestiona su propio estado)
// y notifications (para preservar las preferencias del usuario entre sesiones
// del mismo navegador — el usuario no debería tener que re-configurar la campana
// cada vez que cierra sesión).
// ─────────────────────────────────────────────────────────────────────────────

const appReducer = combineReducers({
  auth:          persistReducer(authPersistConfig,          authReducer),
  categories:    persistReducer(categoriesPersistConfig,    categoriesReducer),
  products:      persistReducer(productsPersistConfig,      productsReducer),
  suppliers:     persistReducer(suppliersPersistConfig,     suppliersReducer),
  expiration:    expirationReducer,
  stock:         stockReducer,
  waste:         persistReducer(wastePersistConfig,         wasteReducer),
  notifications: persistReducer(notificationsPersistConfig, notificationsReducer),
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    // Preservar auth (para que redux-persist no se confunda)
    // y notifications (para que las preferencias del usuario sobrevivan al logout)
    const { auth, notifications } = state;
    return appReducer({ auth, notifications }, action);
  }
  return appReducer(state, action);
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);