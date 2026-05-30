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
  key:       'panstock-auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const categoriesPersistConfig = {
  key:       'panstock-categories',
  storage,
  whitelist: ['items'],
};

const productsPersistConfig = {
  key:       'panstock-products',
  storage,
  whitelist: ['items'],
};

const suppliersPersistConfig = {
  key:       'panstock-suppliers',
  storage,
  whitelist: ['items'],
};

const wastePersistConfig = {
  key:       'panstock-waste',
  storage,
  whitelist: ['users'],
};

/**
 * notificationsPersistConfig — CORREGIDO
 *
 * Se agrega 'permission' a la whitelist.
 *
 * RAZÓN: Sin persistir 'permission', al recargar la página el store arrancaba
 * en 'default' aunque el navegador ya tuviese 'granted'. El hook leía el valor
 * del store y nunca arrancaba el intervalo de chequeo → notificaciones silenciosas.
 *
 * El hook sincroniza el permiso real del navegador vía syncPermission() con un
 * pequeño delay post-mount, por lo que si el usuario revocó el permiso en el
 * browser entre sesiones, se corrige automáticamente.
 *
 * NO se persisten:
 *  - swRegistered: el SW se re-registra en cada inicio
 *  - lastCheckAt: resetear para forzar chequeo fresco en cada sesión
 *  - notifiedBatchIds: se regeneran para no silenciar alertas tras días de ausencia
 */
const notificationsPersistConfig = {
  key:       'panstock-notifications',
  storage,
  whitelist: [
    'enabled',
    'channel',
    'intervalMinutes',
    'alertDaysAhead',
    'permission',          // ← NUEVO: persiste el permiso para que el intervalo
                           //   arranque correctamente en recargas de página
  ],
};

// ─── Root Reducer con reset en logout ────────────────────────────────────────

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