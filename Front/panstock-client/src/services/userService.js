// Gestión de usuarios (solo OWNER): listar, crear empleados, habilitar / deshabilitar.

const BASE_URL = import.meta.env.MODE === 'development'
  ? ''
  : import.meta.env.VITE_API_URL;

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Error ${res.status}`);
  }

  if (data && typeof data === 'object' && 'ok' in data) {
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data ?? data;
  }

  return data;
};

export const userService = {
  /** GET /users → todos los usuarios (Page<User>: { content: [...] }) */
  getAll: async (token) => {
    const data = await fetch(`${BASE_URL}/users`, { headers: authHeaders(token) })
      .then(handleResponse);
    return Array.isArray(data) ? data : (data?.content ?? []);
  },

  /** POST /users → crea un empleado. Body: { username, firstName, lastName, email, password } */
  createEmployee: (token, data) =>
    fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }).then(handleResponse),

  /** PATCH /users/{id}/enable | /users/{id}/disable → 204 */
  setEnabled: (token, id, enabled) =>
    fetch(`${BASE_URL}/users/${id}/${enabled ? 'enable' : 'disable'}`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }).then(handleResponse),
};
