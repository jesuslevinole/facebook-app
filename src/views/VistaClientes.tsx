import { useMemo, useState } from 'react';
import {
  ExternalLink,
  Facebook,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { COMUNAS } from '../data/comunas';
import { borrarCliente, crearCliente, editarCliente } from '../services/datos';
import type { Cliente, Compania, EstadoCliente, Grupo, Usuario } from '../types';
import { formatearRut, validarRut } from '../utils/rut';
import './VistaClientes.css';

interface Props {
  /** Ya viene filtrado según el permiso `clientes.verTodos`. */
  clientes: Cliente[];
  grupos: Grupo[];
  usuarios: Usuario[];
  cargando: boolean;
}

const ESTADOS: { id: EstadoCliente; etiqueta: string; clase: string }[] = [
  { id: 'nuevo', etiqueta: 'Nuevo', clase: 'blue' },
  { id: 'contactado', etiqueta: 'Contactado', clase: 'violet' },
  { id: 'agendado', etiqueta: 'Agendado', clase: 'amber' },
  { id: 'instalado', etiqueta: 'Instalado', clase: 'green' },
  { id: 'perdido', etiqueta: 'Perdido', clase: 'red' },
];

const VACIO: Omit<Cliente, 'id'> = {
  uid: '',
  compartidoCon: [],
  nombre: '',
  apellido: '',
  rut: '',
  comuna: '',
  direccion: '',
  facebookUrl: '',
  telefono: '',
  compania: 'Claro',
  plan: '',
  estado: 'nuevo',
  grupoId: null,
  notas: '',
  createdAt: '',
  updatedAt: '',
};

export default function VistaClientes({ clientes, grupos, usuarios, cargando }: Props) {
  const { avisar } = useAvisos();
  const { perfil, puede } = useSesion();
  const puedeEditar = puede('clientes.editar');
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCliente | 'todos'>('todos');
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos');
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [creando, setCreando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Cliente | null>(null);
  const [porCompartir, setPorCompartir] = useState<Cliente | null>(null);
  const [visibilidad, setVisibilidad] = useState<'todos' | 'mios' | 'compartidos'>('todos');

  const nombreVendedor = useMemo(() => {
    const mapa = new Map(usuarios.map((u) => [u.id, u.nombre]));
    return (uid: string) => mapa.get(uid) ?? '—';
  }, [usuarios]);

  const nombreGrupo = useMemo(() => {
    const mapa = new Map(grupos.map((g) => [g.id, g.nombre]));
    return (id: string | null) => (id ? mapa.get(id) ?? 'Grupo eliminado' : 'Sin grupo');
  }, [grupos]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return clientes.filter((c) => {
      if (estadoFiltro !== 'todos' && c.estado !== estadoFiltro) return false;
      if (visibilidad === 'mios' && c.uid !== perfil?.id) return false;
      if (visibilidad === 'compartidos' && c.uid === perfil?.id) return false;
      if (grupoFiltro !== 'todos') {
        if (grupoFiltro === 'sin' ? c.grupoId !== null : c.grupoId !== grupoFiltro) return false;
      }
      if (!texto) return true;
      return `${c.nombre} ${c.apellido} ${c.rut} ${c.comuna} ${c.direccion} ${c.telefono}`
        .toLowerCase()
        .includes(texto);
    });
  }, [clientes, busqueda, estadoFiltro, grupoFiltro, visibilidad, perfil]);

  const guardar = async (datos: Omit<Cliente, 'id'>, id?: string) => {
    const ahora = new Date().toISOString();
    try {
      if (id) {
        await editarCliente(id, { ...datos, updatedAt: ahora });
        avisar('Cliente actualizado.');
      } else {
        /* El dueño se fija al crear y no se toca al editar: así un supervisor
           puede corregir una ficha sin robarse la atribución del vendedor. */
        await crearCliente({
          ...datos,
          uid: perfil?.id ?? '',
          compartidoCon: [],
          createdAt: ahora,
          updatedAt: ahora,
        });
        avisar('Cliente registrado.');
      }
      setCreando(false);
      setEditando(null);
    } catch {
      avisar('No se pudo guardar el cliente.', 'error');
    }
  };

  /* El cliente a borrar viaja como dato en el estado, no se lee de una fila
     "seleccionada": así no se borra el equivocado si la lista se reordena. */
  const confirmarBorrado = async (cliente: Cliente) => {
    try {
      await borrarCliente(cliente.id);
      avisar('Cliente eliminado.');
    } catch {
      avisar('No se pudo eliminar el cliente.', 'error');
    }
    setPorBorrar(null);
  };

  return (
    <section className="stack">
      <div className="barra-filtros">
        <div className="search-wrap">
          <span className="search-icon">
            <Search size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUT, dirección o teléfono"
          />
        </div>

        <select
          className="select"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoCliente | 'todos')}
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.etiqueta}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={visibilidad}
          onChange={(e) => setVisibilidad(e.target.value as 'todos' | 'mios' | 'compartidos')}
        >
          <option value="todos">Míos y compartidos</option>
          <option value="mios">Solo los míos</option>
          <option value="compartidos">Compartidos conmigo</option>
        </select>

        <select
          className="select"
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
        >
          <option value="todos">Todos los grupos</option>
          <option value="sin">Sin grupo</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>

        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
            <Plus size={16} />
            Nuevo cliente
          </button>
        )}
      </div>

      <div className="card card-flush">
        {cargando ? (
          <ul className="stack-sm carga-lista">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="skeleton skeleton-row" />
            ))}
          </ul>
        ) : filtrados.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <UserPlus size={22} />
            </span>
            <p className="empty-title">
              {clientes.length === 0 ? 'Aún no registras clientes' : 'Ningún cliente coincide'}
            </p>
            <p className="text-sm muted">
              {clientes.length === 0
                ? 'Registra al primero para empezar a medir qué grupo te trae más ventas.'
                : 'Prueba con otro texto o limpia los filtros.'}
            </p>
            {clientes.length === 0 && puedeEditar && (
              <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
                <Plus size={16} />
                Nuevo cliente
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll tabla-clientes">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>RUT</th>
                    <th>Comuna y dirección</th>
                    <th>Plan</th>
                    <th>Origen</th>
                    <th>Vendedor</th>
                    <th>Estado</th>
                    <th className="cell-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => {
                    const estado = ESTADOS.find((e) => e.id === c.estado) ?? ESTADOS[0];
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="row">
                            <span className="avatar">
                              {c.nombre[0]}
                              {c.apellido[0]}
                            </span>
                            <div className="celda-nombre">
                              <span className="celda-fuerte truncate">
                                {c.nombre} {c.apellido}
                              </span>
                              {c.telefono && <span className="text-sm muted-soft">{c.telefono}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="num-cell">{c.rut}</td>
                        <td>
                          <div className="celda-nombre">
                            <span className="celda-fuerte">{c.comuna}</span>
                            <span className="text-sm muted-soft truncate">{c.direccion}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${c.compania === 'Claro' ? 'red' : 'violet'}`}>
                            {c.compania}
                          </span>
                          {c.plan && <p className="text-sm muted-soft">{c.plan}</p>}
                        </td>
                        <td className="text-sm muted">{nombreGrupo(c.grupoId)}</td>
                        <td className="text-sm muted">
                          {c.uid === perfil?.id ? (
                            <span className="row">
                              Tú
                              {c.compartidoCon.length > 0 ? (
                                <span className="badge blue">
                                  <Users size={11} />
                                  {c.compartidoCon.length}
                                </span>
                              ) : (
                                <Lock size={12} className="muted-soft" />
                              )}
                            </span>
                          ) : (
                            <span className="row">
                              {nombreVendedor(c.uid)}
                              <span className="badge violet">Compartido</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${estado.clase}`}>{estado.etiqueta}</span>
                        </td>
                        <td className="cell-actions">
                          {c.facebookUrl && (
                            <a
                              className="icon-btn"
                              href={c.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir Facebook de ${c.nombre}`}
                            >
                              <Facebook size={16} />
                            </a>
                          )}
                          {c.uid === perfil?.id && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setPorCompartir(c)}
                              aria-label={`Compartir ${c.nombre}`}
                              title="Compartir con el equipo"
                            >
                              <Share2 size={16} />
                            </button>
                          )}
                          {puedeEditar && (
                            <>
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setEditando(c)}
                                aria-label={`Editar ${c.nombre}`}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn-danger"
                                onClick={() => setPorBorrar(c)}
                                aria-label={`Eliminar ${c.nombre}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* En móvil la tabla se reemplaza por tarjetas legibles con el pulgar. */}
            <ul className="tarjetas-clientes">
              {filtrados.map((c) => {
                const estado = ESTADOS.find((e) => e.id === c.estado) ?? ESTADOS[0];
                return (
                  <li key={c.id} className="cliente-card">
                    <div className="row row-between">
                      <div className="row">
                        <span className="avatar">
                          {c.nombre[0]}
                          {c.apellido[0]}
                        </span>
                        <div className="celda-nombre">
                          <span className="celda-fuerte">
                            {c.nombre} {c.apellido}
                          </span>
                          <span className="text-sm muted-soft">{c.rut}</span>
                        </div>
                      </div>
                      <span className={`badge ${estado.clase}`}>{estado.etiqueta}</span>
                    </div>

                    <dl className="cliente-datos">
                      <div>
                        <dt className="eyebrow">Dirección</dt>
                        <dd className="text-sm">
                          <MapPin size={13} /> {c.comuna} · {c.direccion}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Plan</dt>
                        <dd className="text-sm">
                          {c.compania}
                          {c.plan ? ` · ${c.plan}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Origen</dt>
                        <dd className="text-sm">{nombreGrupo(c.grupoId)}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Vendedor</dt>
                        <dd className="text-sm">
                          {c.uid === perfil?.id
                            ? c.compartidoCon.length > 0
                              ? `Tú · compartido con ${c.compartidoCon.length}`
                              : 'Tú · privado'
                            : `${nombreVendedor(c.uid)} · compartido`}
                        </dd>
                      </div>
                    </dl>

                    <div className="cliente-acciones">
                      {c.facebookUrl && (
                        <a
                          className="btn btn-outline btn-sm"
                          href={c.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={14} />
                          Facebook
                        </a>
                      )}
                      {c.uid === perfil?.id && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setPorCompartir(c)}
                        >
                          <Share2 size={14} />
                          Compartir
                        </button>
                      )}
                      {puedeEditar && (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditando(c)}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setPorBorrar(c)}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {(creando || editando) && (
        <FormularioCliente
          cliente={editando}
          grupos={grupos}
          alCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          alGuardar={guardar}
        />
      )}

      {porCompartir && (
        <ModalCompartir
          cliente={porCompartir}
          usuarios={usuarios}
          alCerrar={() => setPorCompartir(null)}
        />
      )}

      {porBorrar && (
        <Modal
          titulo="Eliminar cliente"
          ancho="sm"
          alCerrar={() => setPorBorrar(null)}
          pie={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setPorBorrar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmarBorrado(porBorrar)}
              >
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm">
            Se eliminará a {porBorrar.nombre} {porBorrar.apellido} y su atribución al grupo de
            origen. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  );
}

/* ---------- Formulario ---------- */

interface FormProps {
  cliente: Cliente | null;
  grupos: Grupo[];
  alCerrar: () => void;
  alGuardar: (datos: Omit<Cliente, 'id'>, id?: string) => Promise<void>;
}

function FormularioCliente({ cliente, grupos, alCerrar, alGuardar }: FormProps) {
  const [datos, setDatos] = useState<Omit<Cliente, 'id'>>(() =>
    cliente ? { ...cliente } : { ...VACIO }
  );
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = <K extends keyof Omit<Cliente, 'id'>>(campo: K, valor: Omit<Cliente, 'id'>[K]) =>
    setDatos((previos) => ({ ...previos, [campo]: valor }));

  const rutOk = validarRut(datos.rut);
  const errores = {
    nombre: !datos.nombre.trim(),
    apellido: !datos.apellido.trim(),
    rut: !rutOk,
    comuna: !datos.comuna,
    direccion: !datos.direccion.trim(),
  };
  const hayErrores = Object.values(errores).some(Boolean);

  const enviar = async () => {
    setTocado(true);
    if (hayErrores) return;
    setGuardando(true);
    await alGuardar(datos, cliente?.id);
    setGuardando(false);
  };

  return (
    <Modal
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      descripcion="Los datos marcados son los que pide la contratación."
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="btn btn-outline" onClick={alCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void enviar()}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className={`input${tocado && errores.nombre ? ' invalid' : ''}`}
            value={datos.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            placeholder="María"
          />
          {tocado && errores.nombre && <span className="field-error">Escribe el nombre.</span>}
        </label>

        <label className="field">
          <span className="field-label">Apellido</span>
          <input
            className={`input${tocado && errores.apellido ? ' invalid' : ''}`}
            value={datos.apellido}
            onChange={(e) => cambiar('apellido', e.target.value)}
            placeholder="González"
          />
          {tocado && errores.apellido && <span className="field-error">Escribe el apellido.</span>}
        </label>

        <label className="field">
          <span className="field-label">RUT</span>
          <input
            className={`input${tocado && errores.rut ? ' invalid' : ''}`}
            value={datos.rut}
            onChange={(e) => cambiar('rut', formatearRut(e.target.value))}
            placeholder="12.345.678-9"
            inputMode="text"
          />
          {tocado && errores.rut ? (
            <span className="field-error">El dígito verificador no corresponde.</span>
          ) : (
            <span className="field-hint">Se formatea solo mientras escribes.</span>
          )}
        </label>

        <label className="field">
          <span className="field-label">Teléfono</span>
          <input
            className="input"
            value={datos.telefono}
            onChange={(e) => cambiar('telefono', e.target.value)}
            placeholder="+56 9 1234 5678"
            inputMode="tel"
          />
        </label>

        <label className="field">
          <span className="field-label">Comuna</span>
          <select
            className={`select${tocado && errores.comuna ? ' invalid' : ''}`}
            value={datos.comuna}
            onChange={(e) => cambiar('comuna', e.target.value)}
          >
            <option value="">Selecciona una comuna</option>
            {COMUNAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {tocado && errores.comuna && <span className="field-error">Elige la comuna.</span>}
        </label>

        <label className="field">
          <span className="field-label">Dirección</span>
          <input
            className={`input${tocado && errores.direccion ? ' invalid' : ''}`}
            value={datos.direccion}
            onChange={(e) => cambiar('direccion', e.target.value)}
            placeholder="Av. Los Aromos 1234, depto 501"
          />
          {tocado && errores.direccion && <span className="field-error">Escribe la dirección.</span>}
        </label>

        <label className="field col-span-2">
          <span className="field-label">Perfil de Facebook</span>
          <input
            className="input"
            value={datos.facebookUrl}
            onChange={(e) => cambiar('facebookUrl', e.target.value)}
            placeholder="https://facebook.com/perfil.del.cliente"
            inputMode="url"
          />
          <span className="field-hint">Pega el enlace del perfil para retomar la conversación.</span>
        </label>

        <label className="field">
          <span className="field-label">Compañía</span>
          <select
            className="select"
            value={datos.compania}
            onChange={(e) => cambiar('compania', e.target.value as Compania)}
          >
            <option value="Claro">Claro</option>
            <option value="VTR">VTR</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Plan contratado</span>
          <input
            className="input"
            value={datos.plan}
            onChange={(e) => cambiar('plan', e.target.value)}
            placeholder="Fibra 600 megas + TV"
          />
        </label>

        <label className="field">
          <span className="field-label">Grupo de origen</span>
          <select
            className="select"
            value={datos.grupoId ?? ''}
            onChange={(e) => cambiar('grupoId', e.target.value || null)}
          >
            <option value="">Llegó por otra vía</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} · {g.codigo}
              </option>
            ))}
          </select>
          <span className="field-hint">Pregúntale por el código que vio en la publicación.</span>
        </label>

        <label className="field">
          <span className="field-label">Estado</span>
          <select
            className="select"
            value={datos.estado}
            onChange={(e) => cambiar('estado', e.target.value as EstadoCliente)}
          >
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="field col-span-2">
          <span className="field-label">Notas</span>
          <textarea
            className="textarea"
            value={datos.notas}
            onChange={(e) => cambiar('notas', e.target.value)}
            placeholder="Horario de instalación preferido, si tiene línea fija, quién firma…"
          />
        </label>
      </div>
    </Modal>
  );
}

/* ---------- Compartir ---------- */

interface CompartirProps {
  cliente: Cliente;
  usuarios: Usuario[];
  alCerrar: () => void;
}

/* El dueño elige con quién comparte la ficha. Compartir da acceso de
   lectura y edición, pero no traspasa la propiedad: el cliente sigue
   contando para las cifras de quien lo registró. */
function ModalCompartir({ cliente, usuarios, alCerrar }: CompartirProps) {
  const { avisar } = useAvisos();
  const { perfil } = useSesion();
  const [seleccion, setSeleccion] = useState<string[]>(cliente.compartidoCon ?? []);
  const [guardando, setGuardando] = useState(false);

  const candidatos = usuarios.filter((u) => u.id !== cliente.uid && u.activo);

  const alternar = (uid: string) =>
    setSeleccion((previos) =>
      previos.includes(uid) ? previos.filter((p) => p !== uid) : [...previos, uid]
    );

  const guardar = async () => {
    setGuardando(true);
    try {
      await editarCliente(cliente.id, {
        compartidoCon: seleccion,
        updatedAt: new Date().toISOString(),
      });
      avisar(
        seleccion.length === 0
          ? 'La ficha volvió a ser privada.'
          : `Compartida con ${seleccion.length} ${seleccion.length === 1 ? 'persona' : 'personas'}.`
      );
      alCerrar();
    } catch {
      avisar('No se pudo cambiar el acceso.', 'error');
    }
    setGuardando(false);
  };

  return (
    <Modal
      titulo={`Compartir a ${cliente.nombre} ${cliente.apellido}`}
      descripcion="Quien lo reciba podrá ver y editar la ficha. El cliente sigue contando para tus cifras."
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
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar acceso'}
          </button>
        </>
      }
    >
      {candidatos.length === 0 ? (
        <p className="text-sm muted">
          No hay nadie más en el equipo todavía. Da de alta a otros vendedores desde Equipo.
        </p>
      ) : (
        <ul className="compartir-lista">
          {candidatos.map((u) => (
            <li key={u.id}>
              <label className="permiso">
                <input
                  type="checkbox"
                  checked={seleccion.includes(u.id)}
                  onChange={() => alternar(u.id)}
                />
                <span className="permiso-texto">
                  <span className="permiso-titulo">
                    {u.nombre}
                    {u.id === perfil?.id ? ' (tú)' : ''}
                  </span>
                  <span className="text-sm muted-soft">{u.email}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
