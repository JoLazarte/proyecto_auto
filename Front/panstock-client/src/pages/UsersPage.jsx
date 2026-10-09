import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllUsers,
  setUserEnabled,
  clearUserActionState,
  selectUsers,
  selectUsersStatus,
  selectUsersError,
  selectUserAction,
} from '../features/users/usersSlice';
import { selectToken } from '../features/auth/authSlice';
import {
  Modal,
  ConfirmDialog,
  StatusBadge,
  EmptyState,
  SectionHeader,
  FilterBar,
  TableSkeleton,
  PrimaryBtn,
} from '../components/ui/CatalogUI';
import EmployeeForm from '../components/users/EmployeeForm';
import AppTopbar    from '../components/layout/AppTopbar';

const isEnabled = (u) => u.enabled !== false;

export default function UsersPage() {
  const dispatch = useDispatch();
  const token    = useSelector(selectToken);
  const items    = useSelector(selectUsers);
  const status   = useSelector(selectUsersStatus);
  const fetchErr = useSelector(selectUsersError);
  const { status: actStatus, error: actError } = useSelector(selectUserAction);

  const [search,    setSearch]    = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [target,    setTarget]    = useState(null); // usuario a habilitar / deshabilitar

  useEffect(() => {
    dispatch(fetchAllUsers({ token }));
  }, [dispatch, token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const employees     = items.filter((u) => u.role === 'EMPLOYEE');
  const enabledCount  = employees.filter(isEnabled).length;
  const disabledCount = employees.length - enabledCount;

  const openCreate = () => setModalOpen(true);
  const closeModal = () => { setModalOpen(false); dispatch(clearUserActionState()); };
  const handleCreated = () => {
    closeModal();
    dispatch(fetchAllUsers({ token }));
  };

  const handleToggleConfirm = () => {
    if (!target) return;
    dispatch(setUserEnabled({ token, id: target.id, enabled: !isEnabled(target) })).then((res) => {
      setTarget(null);
      // Si salió bien se limpia; si falló, el error queda visible en el banner
      if (res.meta.requestStatus === 'fulfilled') dispatch(clearUserActionState());
    });
  };

  const toggling   = actStatus === 'loading' && target !== null;
  const targetName = target ? `${target.firstName} ${target.lastName}` : '';
  const disabling  = target ? isEnabled(target) : false;

  return (
    <div className="usr-page">
      <AppTopbar />

      <div className="usr-content">
        <SectionHeader
          title="Empleados"
          subtitle={`${enabledCount} habilitado${enabledCount !== 1 ? 's' : ''} · ${disabledCount} deshabilitado${disabledCount !== 1 ? 's' : ''}`}
          action={<PrimaryBtn onClick={openCreate}>+ Nuevo empleado</PrimaryBtn>}
        />

        <p className="usr-hint">
          Los empleados no se registran solos: creá su usuario acá y pasales el usuario y la
          contraseña inicial. Un empleado deshabilitado no puede iniciar sesión.
        </p>

        <FilterBar>
          <div className="usr-search-wrap">
            <span className="usr-search-icon">🔍</span>
            <input
              className="usr-search"
              placeholder="Buscar por nombre, usuario o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="usr-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </FilterBar>

        {fetchErr && <div className="usr-error">⚠ {fetchErr}</div>}
        {actStatus === 'failed' && actError && <div className="usr-error">⚠ {actError}</div>}

        {status === 'loading' && <TableSkeleton rows={4} />}

        {status === 'succeeded' && filtered.length > 0 && (
          <div className="usr-list">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className={`usr-row ${!isEnabled(u) ? 'inactive' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="usr-main">
                  <div className="usr-avatar">
                    {(u.firstName?.[0] || u.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="usr-info">
                    <span className="usr-name">{u.firstName} {u.lastName}</span>
                    <span className="usr-sub">@{u.username} · {u.email}</span>
                  </div>
                </div>

                <div className="usr-meta">
                  <span className={`usr-role ${u.role === 'OWNER' ? 'owner' : ''}`}>
                    {u.role === 'OWNER' ? 'Dueño' : 'Empleado'}
                  </span>
                  <StatusBadge active={isEnabled(u)} />
                  {u.role === 'EMPLOYEE' && (
                    <button
                      className={`usr-toggle ${isEnabled(u) ? 'danger' : ''}`}
                      onClick={() => setTarget(u)}
                    >
                      {isEnabled(u) ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'succeeded' && !search && employees.length === 0 && (
          <EmptyState
            icon="👥"
            title="Todavía no hay empleados"
            description="Creá el primero y pasale su usuario y contraseña para que pueda iniciar sesión."
            action={<PrimaryBtn onClick={openCreate}>+ Nuevo empleado</PrimaryBtn>}
          />
        )}

        {status === 'succeeded' && search && filtered.length === 0 && (
          <EmptyState icon="🔍" title="Sin resultados" description="Probá con otra búsqueda." />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Nuevo empleado" width="500px">
        <EmployeeForm onSuccess={handleCreated} onCancel={closeModal} />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={handleToggleConfirm}
        title={disabling ? 'Deshabilitar empleado' : 'Habilitar empleado'}
        message={
          disabling
            ? `¿Deshabilitar a ${targetName}? No va a poder iniciar sesión y se cierra su sesión activa. Podés volver a habilitarlo cuando quieras.`
            : `¿Habilitar a ${targetName}? Va a poder iniciar sesión de nuevo con su usuario y contraseña.`
        }
        confirmLabel={disabling ? 'Deshabilitar' : 'Habilitar'}
        danger={disabling}
        loading={toggling}
      />

      <style>{`
        .usr-page    { min-height: 100vh; background: var(--cream); }
        .usr-content { max-width: 900px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

        .usr-hint { font-size: 0.85rem; color: var(--warm-gray); line-height: 1.5; margin: 0 0 16px; }

        .usr-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .usr-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); font-size: 0.85rem; pointer-events: none;
        }
        .usr-search {
          width: 100%; padding: 9px 36px;
          font-family: var(--font-body); font-size: 0.88rem;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          background: white; color: var(--espresso); outline: none;
          transition: border-color var(--transition-base);
        }
        .usr-search:focus { border-color: var(--amber); }
        .usr-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--warm-gray); font-size: 0.75rem; padding: 4px;
        }

        .usr-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        .usr-list { display: flex; flex-direction: column; gap: 8px; }
        .usr-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 16px;
          background: white; border-radius: var(--radius-lg);
          border: 1px solid var(--cream-dark); box-shadow: var(--shadow-sm);
          animation: fadeIn 0.3s ease both; overflow: hidden;
        }
        .usr-row.inactive { opacity: 0.6; }

        .usr-main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .usr-avatar {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          background: var(--espresso); color: var(--cream);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.95rem;
        }
        .usr-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .usr-name { font-weight: 700; font-size: 0.95rem; color: var(--espresso); word-break: break-word; }
        .usr-sub  { font-size: 0.78rem; color: var(--warm-gray); word-break: break-word; }

        .usr-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
        .usr-role {
          padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
          background: rgba(140,123,107,0.12); color: var(--warm-gray);
        }
        .usr-role.owner { background: rgba(200,137,58,0.15); color: var(--amber); }

        .usr-toggle {
          padding: 7px 14px; border-radius: var(--radius-md);
          border: 1.5px solid var(--cream-dark); background: var(--cream);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 600;
          color: var(--espresso); cursor: pointer; transition: all var(--transition-fast);
        }
        .usr-toggle:hover { border-color: var(--amber); }
        .usr-toggle.danger { color: var(--error); }
        .usr-toggle.danger:hover { border-color: var(--error); }

        @media (max-width: 540px) {
          .usr-content { padding: var(--space-lg) var(--space-sm); }
          .usr-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .usr-meta { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}
