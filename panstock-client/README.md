# PanStock Frontend

Frontend **mobile-first** para el sistema de inventario PanStock — Dulce Hora.

## Stack

| Tecnología | Uso |
|---|---|
| React 18 + Vite | Framework y bundler |
| React Router DOM v6 | Navegación |
| Redux Toolkit | State management |
| Redux Persist | Persistencia de sesión en localStorage |
| CSS-in-JS (inline `<style>`) | Estilos por componente |

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar en desarrollo
npm run dev
```

> El servidor de desarrollo corre en `http://localhost:5173` y **proxea** automáticamente
> `/auth/**`, `/api/**` y `/users/**` a `http://localhost:8081` (el backend PanStock).

---

## Estructura del proyecto

```
src/
├── components/
│   ├── ProtectedRoute.jsx          # Guarda de rutas autenticadas
│   └── ui/
│       └── FormField.jsx           # Input, Select, Button, Alert reutilizables
├── features/
│   └── auth/
│       ├── authSlice.js            # Redux slice (login, register, logout, thunks)
│       └── index.js                # Barrel exports
├── pages/
│   ├── LoginPage.jsx               # Pantalla de login
│   ├── RegisterPage.jsx            # Pantalla de registro (2 pasos)
│   └── DashboardPage.jsx           # Dashboard placeholder post-login
├── services/
│   └── authService.js              # Fetch calls a la API (/auth/authenticate, /auth/register)
├── store/
│   └── store.js                    # Redux store con redux-persist
├── App.jsx                         # Router principal + TokenGuard
├── main.jsx                        # Entry point con Provider + PersistGate
└── index.css                       # Tokens de diseño globales + animaciones
```

---

## Flujo de autenticación

```
Usuario abre la app
  ↓
PersistGate rehidrata el store desde localStorage
  ↓
TokenGuard verifica exp del JWT
  ↓
¿Autenticado? → /dashboard
¿No?          → /login
  ↓ (login exitoso)
authSlice.loginUser thunk → POST /auth/authenticate
  ↓
Token + user info guardados en Redux + localStorage (persist)
  ↓
Navigate → /dashboard
```

## Endpoints utilizados (Entrega 1)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/authenticate` | Login con username + password |
| `POST` | `/auth/register` | Registro de nuevo usuario |
| `GET`  | `/users/data` | Perfil del usuario autenticado |

---

## Credenciales de prueba (datos mock del backend)

| Usuario | Contraseña | Rol |
|---|---|---|
| `lorena` | `1234` | OWNER |
| `gabriel` | `1234` | OWNER |
| `martina` | `1234` | EMPLOYEE |

---

## Próximas entregas

- Dashboard completo con semáforo de vencimientos
- Gestión de stock y lotes
- Pantalla de mermas
- Promociones sugeridas
- Reportes con gráficos
- Gestión de productos, categorías y proveedores
- Alertas en tiempo real
