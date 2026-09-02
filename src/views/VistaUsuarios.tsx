import { useMemo, useState } from 'react';
import { KeyRound, Plus, Shield, Trash2, UserCog, UserPlus } from 'lucide-react';
import Modal from '../components/Modal';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { crearCuentaSinCambiarSesion, mensajeDeError, recuperarClave } from '../services/auth';
import {
  borrarRol,
  borrarUsuario,
  crearRol,
  crearUsuario,
  editarRol,
  editarUsuario,
} from '../services/datos';
import { PERMISOS, type Permiso, type Rol, type Usuario } from '../types';
import './VistaUsuarios.css';

interface Props {
  usuarios: Usuario[];
  roles: Rol[];
  clientesPorUsuario: Map<string, number>;
  publicacionesPorUsuario: Map<string, number>;
}

type Pestana = 'usuarios' | 'roles';

export default function VistaUsuarios({
  usuarios,
  roles,
  clientesPorUsuario,
  publicacionesPorUsuario,
}: Props) {
  const { avisar } = useAvisos();
  const { perfil } = useSesion();
  const [pestana, setPestana] = useState<Pestana>('usuarios');
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [editandoRol, setEditandoRol] = useState<Rol | null>(null);
  const [creandoRol, setCreandoRol] = useState(false);
  const [porBorrar, setPorBorrar] = useState<{ tipo: 'usuario' | 'rol'; id: string; nombre: string } | null>(null);

  const nombreRol = useMemo(() => {
    const mapa = new Map(roles.map((r) => [r.id, r.nombre]));
    return (id: string) => mapa.get(id) ?? 'Rol eliminado';
  }, [roles]);

  const usuariosPorRol = useMemo(() => {
    const mapa = new Map<string, number>();
    usuarios.forEach((u) => mapa.set(u.rolId, (mapa.get(u.rolId) ?? 0) + 1));
    return mapa;
  }, [usuarios]);

  const alternarActivo = async (usuario: Usuario) => {
    if (usuario.id === perfil?.id) {
      avisar('No puedes desactivar tu propia cuenta.', 'error');
      return;
    }
    try {
      await editarUsuario(usuario.id, { activo: !usuario.activo });
      avisar(usuario.activo ? 'Cuenta desactivada.' : 'Cuenta reactivada.');
    } catch {
      avisar('No se pudo cambiar el estado de la cuenta.', 'error');
    }
  };

  const enviarRestablecer = async (usuario: Usuario) => {
    try {
      await recuperarClave(usuario.email);
      avisar(`Enviamos un correo a ${usuario.email} para cambiar la clave.`);
    } catch (e) {
      avisar(mensajeDeError(e), 'error');
    }
  };

  const confirmarBorrado = async () => {
    if (!porBorrar) return;
    try {
      if (porBorrar.tipo === 'usuario') {
        await borrarUsuario(porBorrar.id);
        avisar('Perfil eliminado. La cuenta de acceso hay que borrarla en la consola de Firebase.');
      } else {
        await borrarRol(porBorrar.id);
        avisar('Rol eliminado.');
      }
    } catch {
      avisar('No se pudo eliminar.', 'error');
    }
    setPorBorrar(null);
  };

  return (
    <section className="stack">
      <div className="seccion-head">
        <div className="barra-filtros usuarios-tabs">
          <button
            type="button"
            className={`chip${pestana === 'usuarios' ? ' active' : ''}`}
            onClick={() => setPestana('usuarios')}
          >
            Usuarios ({usuarios.length})
          </button>
          <button
            type="button"
            className={`chip${pestana === 'roles' ? ' active' : ''}`}
            onClick={() => setPestana('roles')}
          >
            Roles ({roles.length})
          </button>
        </div>

        {pestana === 'usuarios' ? (
          <button type="button" className="btn btn-primary" onClick={() => setCreandoUsuario(true)}>
            <UserPlus size={16} />
            Nuevo usuario
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setCreandoRol(true)}>
            <Plus size={16} />
            Nuevo rol
          </button>
        )}
      </div>

      {pestana === 'usuarios' ? (
        <div className="card card-flush">
          <div className="table-scroll tabla-usuarios">
            <table className="table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th className="col-num">Clientes</th>
                  <th className="col-num">Publicaciones</th>
                  <th>Estado</th>
                  <th className="cell-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <span className="avatar">
                          {u.nombre.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                        </span>
                        <div className="celda-nombre">
                          <span className="celda-fuerte truncate">
                            {u.nombre}
                            {u.id === perfil?.id && <span className="badge blue usuarios-tu">Tú</span>}
                          </span>
                          <span className="text-sm muted-soft truncate">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge violet">{nombreRol(u.rolId)}</span>
                    </td>
                    <td className="col-num num">{clientesPorUsuario.get(u.id) ?? 0}</td>
                    <td className="col-num num">{publicacionesPorUsuario.get(u.id) ?? 0}</td>
                    <td>
                      <span className={`badge ${u.activo ? 'green' : ''}`}>
                        {u.activo ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void enviarRestablecer(u)}
                        aria-label={`Enviar cambio de clave a ${u.nombre}`}
                        title="Enviar correo para cambiar la clave"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditandoUsuario(u)}
                        aria-label={`Editar ${u.nombre}`}
                      >
                        <UserCog size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => setPorBorrar({ tipo: 'usuario', id: u.id, nombre: u.nombre })}
                        disabled={u.id === perfil?.id}
                        aria-label={`Eliminar ${u.nombre}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="usuarios-tarjetas">
            {usuarios.map((u) => (
              <li key={u.id} className="usuario-card">
                <div className="row row-between">
                  <div className="row">
                    <span className="avatar">
                      {u.nombre.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                    </span>
                    <div className="celda-nombre">
                      <span className="celda-fuerte">{u.nombre}</span>
                      <span className="text-sm muted-soft truncate">{u.email}</span>
                    </div>
                  </div>
                  <span className={`badge ${u.activo ? 'green' : ''}`}>
                    {u.activo ? 'Activo' : 'Off'}
                  </span>
                </div>
                <div className="row row-wrap">
                  <span className="badge violet">{nombreRol(u.rolId)}</span>
                  <span className="text-sm muted-soft">
                    {clientesPorUsuario.get(u.id) ?? 0} clientes ·{' '}
                    {publicacionesPorUsuario.get(u.id) ?? 0} publicaciones
                  </span>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditandoUsuario(u)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void alternarActivo(u)}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="roles">
          {roles.map((rol) => (
            <li key={rol.id} className="rol card">
              <header className="rol-head">
                <div className="rol-titulo">
                  <h3 className="title-card">{rol.nombre}</h3>
                  <p className="text-sm muted">{rol.descripcion}</p>
                </div>
                <div className="grupo-botones">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setEditandoRol(rol)}
                    aria-label={`Editar ${rol.nombre}`}
                  >
                    <Shield size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => setPorBorrar({ tipo: 'rol', id: rol.id, nombre: rol.nombre })}
                    disabled={rol.protegido || (usuariosPorRol.get(rol.id) ?? 0) > 0}
                    aria-label={`Eliminar ${rol.nombre}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>

              <div className="row row-wrap">
                <span className="badge">{usuariosPorRol.get(rol.id) ?? 0} personas</span>
                <span className="badge blue">
                  {rol.permisos.length} de {PERMISOS.length} permisos
                </span>
                {rol.protegido && <span className="badge amber">Rol base</span>}
              </div>

              <ul className="rol-permisos">
                {PERMISOS.filter((p) => rol.permisos.includes(p.id)).map((p) => (
                  <li key={p.id} className="text-sm muted">
                    {p.etiqueta}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {(creandoUsuario || editandoUsuario) && (
        <FormularioUsuario
          usuario={editandoUsuario}
          roles={roles}
          alCerrar={() => {
            setCreandoUsuario(false);
            setEditandoUsuario(null);
          }}
        />
      )}

      {(creandoRol || editandoRol) && (
        <FormularioRol
          rol={editandoRol}
          alCerrar={() => {
            setCreandoRol(false);
            setEditandoRol(null);
          }}
        />
      )}

      {porBorrar && (
        <Modal
          titulo={porBorrar.tipo === 'usuario' ? 'Eliminar usuario' : 'Eliminar rol'}
          ancho="sm"
          alCerrar={() => setPorBorrar(null)}
          pie={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setPorBorrar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void confirmarBorrado()}>
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm">
            {porBorrar.tipo === 'usuario'
              ? `Se elimina el perfil de ${porBorrar.nombre} y pierde el acceso. Sus clientes y publicaciones se conservan. La cuenta de correo se borra aparte, desde la consola de Firebase.`
              : `Se elimina el rol ${porBorrar.nombre}. Solo se puede si no hay nadie usándolo.`}
          </p>
        </Modal>
      )}
    </section>
  );
}

/* ---------- Formulario de usuario ---------- */

function FormularioUsuario({
  usuario,
  roles,
  alCerrar,
}: {
  usuario: Usuario | null;
  roles: Rol[];
  alCerrar: () => void;
}) {
  const { avisar } = useAvisos();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [rolId, setRolId] = useState(usuario?.rolId ?? roles[0]?.id ?? '');
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const esNuevo = !usuario;

  const guardar = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('Escribe el nombre.');
      return;
    }
    if (!rolId) {
      setError('Elige un rol.');
      return;
    }
    if (esNuevo && clave.length < 6) {
      setError('La clave inicial debe tener al menos 6 caracteres.');
      return;
    }

    setOcupado(true);
    try {
      if (usuario) {
        await editarUsuario(usuario.id, { nombre: nombre.trim(), telefono, rolId, activo });
        avisar('Usuario actualizado.');
      } else {
        const uid = await crearCuentaSinCambiarSesion(email, clave);
        await crearUsuario(uid, {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono,
          rolId,
          activo: true,
          createdAt: new Date().toISOString(),
        });
        avisar(`Cuenta creada. Pásale a ${nombre.trim()} el correo y la clave inicial.`);
      }
      alCerrar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
    setOcupado(false);
  };

  return (
    <Modal
      titulo={esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
      descripcion={
        esNuevo
          ? 'Se crea la cuenta de acceso y el perfil. Tu sesión no se cierra.'
          : 'El correo no se puede cambiar desde acá.'
      }
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-outline" onClick={alCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void guardar()}
            disabled={ocupado}
          >
            {ocupado ? 'Guardando…' : esNuevo ? 'Crear cuenta' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Camila Soto"
          />
        </label>

        <label className="field">
          <span className="field-label">Teléfono</span>
          <input
            className="input"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+56 9 1234 5678"
            inputMode="tel"
          />
          <span className="field-hint">Se inserta en sus mensajes con {'{telefono}'}.</span>
        </label>

        <label className="field col-span-2">
          <span className="field-label">Correo</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="camila@correo.cl"
            disabled={!esNuevo}
            inputMode="email"
          />
        </label>

        {esNuevo && (
          <label className="field col-span-2">
            <span className="field-label">Clave inicial</span>
            <input
              className="input"
              type="text"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <span className="field-hint">
              Se la entregas en persona. Puede cambiarla después con «Olvidé mi clave».
            </span>
          </label>
        )}

        <label className="field">
          <span className="field-label">Rol</span>
          <select className="select" value={rolId} onChange={(e) => setRolId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>

        {!esNuevo && (
          <label className="field row usuarios-check">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <span className="field-label">Cuenta activa</span>
          </label>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}
    </Modal>
  );
}

/* ---------- Formulario de rol ---------- */

function FormularioRol({ rol, alCerrar }: { rol: Rol | null; alCerrar: () => void }) {
  const { avisar } = useAvisos();
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [permisos, setPermisos] = useState<Permiso[]>(rol?.permisos ?? ['publicar', 'clientes.ver']);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof PERMISOS>();
    PERMISOS.forEach((p) => {
      const lista = mapa.get(p.grupo) ?? [];
      lista.push(p);
      mapa.set(p.grupo, lista);
    });
    return [...mapa.entries()];
  }, []);

  const alternar = (permiso: Permiso) =>
    setPermisos((previos) =>
      previos.includes(permiso) ? previos.filter((p) => p !== permiso) : [...previos, permiso]
    );

  const guardar = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('Ponle un nombre al rol.');
      return;
    }
    if (permisos.length === 0) {
      setError('Marca al menos un permiso.');
      return;
    }
    setOcupado(true);
    try {
      if (rol) {
        await editarRol(rol.id, { nombre: nombre.trim(), descripcion, permisos });
        avisar('Rol actualizado.');
      } else {
        await crearRol({
          nombre: nombre.trim(),
          descripcion,
          permisos,
          protegido: false,
          createdAt: new Date().toISOString(),
        });
        avisar('Rol creado.');
      }
      alCerrar();
    } catch {
      setError('No se pudo guardar el rol.');
    }
    setOcupado(false);
  };

  return (
    <Modal
      titulo={rol ? `Permisos de ${rol.nombre}` : 'Nuevo rol'}
      descripcion="Los cambios aplican la próxima vez que la persona entre a la app."
      ancho="lg"
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-outline" onClick={alCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void guardar()}
            disabled={ocupado}
          >
            {ocupado ? 'Guardando…' : 'Guardar rol'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Nombre del rol</span>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Supervisor"
          />
        </label>

        <label className="field">
          <span className="field-label">Para qué sirve</span>
          <input
            className="input"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ve al equipo completo pero no cambia configuración."
          />
        </label>
      </div>

      <div className="permisos">
        {grupos.map(([grupo, lista]) => (
          <section key={grupo} className="permiso-grupo">
            <p className="eyebrow">{grupo}</p>
            <ul className="permiso-lista">
              {lista.map((p) => (
                <li key={p.id}>
                  <label className="permiso">
                    <input
                      type="checkbox"
                      checked={permisos.includes(p.id)}
                      onChange={() => alternar(p.id)}
                    />
                    <span className="permiso-texto">
                      <span className="permiso-titulo">{p.etiqueta}</span>
                      <span className="text-sm muted-soft">{p.ayuda}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {error && <p className="field-error">{error}</p>}
    </Modal>
  );
}
