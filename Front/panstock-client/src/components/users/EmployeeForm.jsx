import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createEmployee,
  clearUserActionState,
  selectUserAction,
} from '../../features/users/usersSlice';
import { selectToken } from '../../features/auth/authSlice';
import { Input, Button, Alert } from '../ui/FormField';

const EMPTY = { username: '', firstName: '', lastName: '', email: '', password: '' };

export default function EmployeeForm({ onSuccess, onCancel }) {
  const dispatch          = useDispatch();
  const token             = useSelector(selectToken);
  const { status, error } = useSelector(selectUserAction);

  const [form, setForm]      = useState(EMPTY);
  const [fieldErrors, setFE] = useState({});
  const [showPass, setShow]  = useState(false);

  // Limpia el estado de la acción al abrir el formulario
  useEffect(() => {
    dispatch(clearUserActionState());
  }, [dispatch]);

  // Cierra al crear con éxito
  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearUserActionState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  const validate = () => {
    const e = {};
    const username = form.username.trim();
    if (!username)                    e.username = 'El usuario es obligatorio';
    else if (username.length < 3)     e.username = 'Mínimo 3 caracteres';
    else if (username.length > 50)    e.username = 'Máximo 50 caracteres';
    else if (/\s/.test(username))     e.username = 'No puede tener espacios';

    if (!form.firstName.trim())       e.firstName = 'El nombre es obligatorio';
    if (!form.lastName.trim())        e.lastName  = 'El apellido es obligatorio';

    if (!form.email.trim())           e.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
                                      e.email = 'El email no tiene un formato válido';

    if (!form.password)               e.password = 'La contraseña es obligatoria';
    else if (form.password.length < 8)  e.password = 'Mínimo 8 caracteres';
    else if (form.password.length > 72) e.password = 'Máximo 72 caracteres';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (fieldErrors[field]) setFE((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    dispatch(createEmployee({
      token,
      data: {
        username:  form.username.trim(),
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        password:  form.password,
      },
    }));
  };

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <Alert type="error">{error}</Alert>}

      <div className="ef-row">
        <Input
          label="Nombre *"
          type="text"
          value={form.firstName}
          onChange={handleChange('firstName')}
          error={fieldErrors.firstName}
          disabled={isLoading}
          autoFocus
        />
        <Input
          label="Apellido *"
          type="text"
          value={form.lastName}
          onChange={handleChange('lastName')}
          error={fieldErrors.lastName}
          disabled={isLoading}
        />
      </div>

      <Input
        label="Email *"
        type="email"
        placeholder="empleado@panaderia.com"
        value={form.email}
        onChange={handleChange('email')}
        error={fieldErrors.email}
        disabled={isLoading}
        autoComplete="off"
      />

      <Input
        label="Usuario *"
        type="text"
        placeholder="Con este usuario inicia sesión"
        value={form.username}
        onChange={handleChange('username')}
        error={fieldErrors.username}
        disabled={isLoading}
        autoComplete="off"
      />

      <div>
        <Input
          label="Contraseña inicial *"
          type={showPass ? 'text' : 'password'}
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
          disabled={isLoading}
          autoComplete="new-password"
        />
        <label className="ef-show">
          <input type="checkbox" checked={showPass} onChange={(e) => setShow(e.target.checked)} />
          Mostrar contraseña
        </label>
      </div>

      <p className="ef-hint">
        Pasale al empleado su usuario y esta contraseña. Se crea con rol <strong>Empleado</strong>
        y podés deshabilitarlo cuando quieras.
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button type="button" className="ef-cancel-btn" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </button>
        <Button type="submit" variant="amber" loading={isLoading}>
          Crear empleado
        </Button>
      </div>

      <style>{`
        .ef-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .ef-row { grid-template-columns: 1fr; } }
        .ef-show {
          display: flex; align-items: center; gap: 7px; margin-top: 8px;
          font-size: 0.82rem; color: var(--warm-gray); cursor: pointer;
        }
        .ef-show input { accent-color: var(--amber); }
        .ef-hint { font-size: 0.8rem; color: var(--warm-gray); line-height: 1.5; margin: 0; }
        .ef-cancel-btn {
          padding: 10px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .ef-cancel-btn:hover:not(:disabled) { border-color: var(--warm-gray); color: var(--espresso); }
      `}</style>
    </form>
  );
}
