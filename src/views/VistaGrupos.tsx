import { useMemo, useState, type CSSProperties } from 'react';
import { ExternalLink, Pause, Pencil, Play, Plus, Trash2, UsersRound } from 'lucide-react';
import Modal from '../components/Modal';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { COMUNAS } from '../data/comunas';
import { borrarGrupo, crearGrupo, editarGrupo } from '../services/datos';
import type { Ajustes, Cliente, Grupo, Publicacion } from '../types';
import { claveMenos, diaMes, hoy } from '../utils/fecha';
import { sugerirCodigo } from '../utils/rotacion';
import './VistaGrupos.css';

interface Props {
  clientes: Cliente[];
  grupos: Grupo[];
  /** Publicaciones de todo el equipo: el rendimiento del grupo es colectivo. */
  publicaciones: Publicacion[];
  ajustes: Ajustes;
}

interface Rendimiento {
  grupo: Grupo;
  publicaciones30: number;
  clientesTotal: number;
  instalados: number;
  ultimaFecha: string | null;
  publicadoHoy: boolean;
  conversion: number;
  porcentaje: number;
}

const VACIO: Omit<Grupo, 'id'> = {
  nombre: '',
  url: '',
  codigo: '',
  comuna: '',
  miembros: 0,
  activo: true,
  cooldownHoras: 20,
  createdAt: '',
};

export default function VistaGrupos({ clientes, grupos, publicaciones, ajustes }: Props) {
  const { avisar } = useAvisos();
  const { puede } = useSesion();
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [creando, setCreando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Grupo | null>(null);

  const puedeEditar = puede('grupos.editar');
  const fecha = hoy();
  const hace30 = claveMenos(30);

  const rendimiento: Rendimiento[] = useMemo(() => {
    const filas = grupos.map((grupo) => {
      const pubs = publicaciones.filter((p) => p.grupoId === grupo.id);
      const pubs30 = pubs.filter((p) => p.fecha >= hace30);
      const suyos = clientes.filter((c) => c.grupoId === grupo.id);
      const suyos30 = suyos.filter((c) => c.createdAt.slice(0, 10) >= hace30);

      return {
        grupo,
        publicaciones30: pubs30.length,
        clientesTotal: suyos.length,
        instalados: suyos.filter((c) => c.estado === 'instalado').length,
        ultimaFecha: pubs.map((p) => p.fecha).sort().pop() ?? null,
        publicadoHoy: pubs.some((p) => p.fecha === fecha),
        conversion: pubs30.length ? suyos30.length / pubs30.length : 0,
        porcentaje: 0,
      };
    });

    const tope = Math.max(1, ...filas.map((f) => f.clientesTotal));
    return filas
      .map((f) => ({ ...f, porcentaje: (f.clientesTotal / tope) * 100 }))
      .sort((a, b) => b.clientesTotal - a.clientesTotal || b.publicaciones30 - a.publicaciones30);
  }, [grupos, publicaciones, clientes, hace30, fecha]);

  const totales = useMemo(
    () => ({
      activos: grupos.filter((g) => g.activo).length,
      clientes: clientes.filter((c) => c.grupoId).length,
      publicaciones: publicaciones.filter((p) => p.fecha >= hace30).length,
    }),
    [grupos, clientes, publicaciones, hace30]
  );

  const guardar = async (datos: Omit<Grupo, 'id'>, id?: string) => {
    try {
      if (id) {
        await editarGrupo(id, datos);
        avisar('Grupo actualizado.');
      } else {
        await crearGrupo({ ...datos, createdAt: new Date().toISOString() });
        avisar('Grupo agregado a la rotación.');
      }
      setCreando(false);
      setEditando(null);
    } catch {
      avisar('No se pudo guardar el grupo.', 'error');
    }
  };

  const confirmarBorrado = async (grupo: Grupo) => {
    try {
      await borrarGrupo(grupo.id);
      avisar('Grupo eliminado.');
    } catch {
      avisar('No se pudo eliminar el grupo.', 'error');
    }
    setPorBorrar(null);
  };

  const alternarActivo = async (grupo: Grupo) => {
    try {
      await editarGrupo(grupo.id, { activo: !grupo.activo });
    } catch {
      avisar('No se pudo cambiar el estado del grupo.', 'error');
    }
  };

  if (grupos.length === 0) {
    return (
      <section className="card">
        <div className="empty">
          <span className="empty-icon">
            <UsersRound size={22} />
          </span>
          <p className="empty-title">Sin grupos todavía</p>
          <p className="text-sm muted">
            Agrega el enlace de cada grupo de Facebook donde publica el equipo. La ruta diaria se
            arma sola.
          </p>
          {puedeEditar && (
            <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
              <Plus size={16} />
              Nuevo grupo
            </button>
          )}
        </div>
        {creando && (
          <FormularioGrupo
            grupo={null}
            codigosUsados={[]}
            cooldownDefault={ajustes.cooldownHorasDefault}
            alCerrar={() => setCreando(false)}
            alGuardar={guardar}
          />
        )}
      </section>
    );
  }

  return (
    <section className="stack">
      <article className="card grupos-resumen">
        <div className="resumen-dato">
          <p className="eyebrow">En rotación</p>
          <p className="resumen-cifra num">
            {totales.activos}
            <span className="resumen-meta">/{grupos.length}</span>
          </p>
        </div>
        <div className="resumen-dato">
          <p className="eyebrow">Clientes atribuidos</p>
          <p className="resumen-cifra num">{totales.clientes}</p>
        </div>
        <div className="resumen-dato">
          <p className="eyebrow">Publicaciones 30 días</p>
          <p className="resumen-cifra num">{totales.publicaciones}</p>
        </div>
        <span className="spacer" />
        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
            <Plus size={16} />
            Nuevo grupo
          </button>
        )}
      </article>

      <div className="card card-flush">
        <div className="table-scroll tabla-grupos">
          <table className="table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Comuna</th>
                <th className="col-num">Miembros</th>
                <th className="col-num">Clientes</th>
                <th className="col-num">Instalados</th>
                <th className="col-num">Pub. 30d</th>
                <th className="col-num">Clientes/pub.</th>
                <th>Última</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rendimiento.map((r) => (
                <tr key={r.grupo.id} className={r.grupo.activo ? '' : 'fila-pausada'}>
                  <td>
                    <div className="celda-nombre">
                      <span className="celda-fuerte truncate">{r.grupo.nombre}</span>
                      <span className="row">
                        <span className="code-tag">{r.grupo.codigo}</span>
                        {r.publicadoHoy && <span className="badge green">Hoy</span>}
                        {!r.grupo.activo && <span className="badge">En pausa</span>}
                      </span>
                    </div>
                  </td>
                  <td className="muted">{r.grupo.comuna || '—'}</td>
                  <td className="col-num muted">
                    {r.grupo.miembros ? r.grupo.miembros.toLocaleString('es-CL') : '—'}
                  </td>
                  <td className="col-num">
                    <span className="barra-mini">
                      <span className="num">{r.clientesTotal}</span>
                      <span className="progress">
                        <span
                          className="progress-fill"
                          style={{ '--fill': `${r.porcentaje}%` } as CSSProperties}
                        />
                      </span>
                    </span>
                  </td>
                  <td className="col-num num">{r.instalados}</td>
                  <td className="col-num num">{r.publicaciones30}</td>
                  <td className="col-num num">{r.conversion.toFixed(2)}</td>
                  <td className="muted">{r.ultimaFecha ? diaMes(r.ultimaFecha) : 'Nunca'}</td>
                  <td className="cell-actions">
                    <a
                      className="icon-btn"
                      href={r.grupo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir ${r.grupo.nombre}`}
                      title="Abrir el grupo"
                    >
                      <ExternalLink size={16} />
                    </a>
                    {puedeEditar && (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => void alternarActivo(r.grupo)}
                          title={r.grupo.activo ? 'Pausar en la rotación' : 'Volver a la rotación'}
                        >
                          {r.grupo.activo ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setEditando(r.grupo)}
                          aria-label={`Editar ${r.grupo.nombre}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setPorBorrar(r.grupo)}
                          aria-label={`Eliminar ${r.grupo.nombre}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="grupos-tarjetas">
          {rendimiento.map((r) => (
            <li key={r.grupo.id} className={`grupo-card${r.grupo.activo ? '' : ' pausada'}`}>
              <div className="row row-between">
                <div className="celda-nombre">
                  <span className="celda-fuerte truncate">{r.grupo.nombre}</span>
                  <span className="row">
                    <span className="code-tag">{r.grupo.codigo}</span>
                    {r.grupo.comuna && <span className="text-sm muted">{r.grupo.comuna}</span>}
                  </span>
                </div>
                {r.publicadoHoy ? (
                  <span className="badge green">Hoy</span>
                ) : (
                  !r.grupo.activo && <span className="badge">Pausa</span>
                )}
              </div>

              <dl className="grupo-card-datos">
                <div>
                  <dt className="eyebrow">Clientes</dt>
                  <dd>{r.clientesTotal}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Instal.</dt>
                  <dd>{r.instalados}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Pub. 30d</dt>
                  <dd>{r.publicaciones30}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Cli./pub.</dt>
                  <dd>{r.conversion.toFixed(2)}</dd>
                </div>
              </dl>

              <div className="grupo-card-acciones">
                <a
                  className="btn btn-outline btn-sm"
                  href={r.grupo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} />
                  Abrir
                </a>
                {puedeEditar && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditando(r.grupo)}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => void alternarActivo(r.grupo)}
                    >
                      {r.grupo.activo ? <Pause size={14} /> : <Play size={14} />}
                      {r.grupo.activo ? 'Pausar' : 'Activar'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {(creando || editando) && (
        <FormularioGrupo
          grupo={editando}
          codigosUsados={grupos.filter((g) => g.id !== editando?.id).map((g) => g.codigo)}
          cooldownDefault={ajustes.cooldownHorasDefault}
          alCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          alGuardar={guardar}
        />
      )}

      {porBorrar && (
        <Modal
          titulo="Eliminar grupo"
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
            Se elimina {porBorrar.nombre} de la rotación de todo el equipo. Los clientes que
            llegaron desde acá quedan sin origen. Si solo quieres dejar de publicar por un tiempo,
            usa «Pausar».
          </p>
        </Modal>
      )}
    </section>
  );
}

/* ---------- Formulario ---------- */

interface FormProps {
  grupo: Grupo | null;
  codigosUsados: string[];
  cooldownDefault: number;
  alCerrar: () => void;
  alGuardar: (datos: Omit<Grupo, 'id'>, id?: string) => Promise<void>;
}

function FormularioGrupo({ grupo, codigosUsados, cooldownDefault, alCerrar, alGuardar }: FormProps) {
  const [datos, setDatos] = useState<Omit<Grupo, 'id'>>(() =>
    grupo ? { ...grupo } : { ...VACIO, cooldownHoras: cooldownDefault }
  );
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = <K extends keyof Omit<Grupo, 'id'>>(campo: K, valor: Omit<Grupo, 'id'>[K]) =>
    setDatos((previos) => ({ ...previos, [campo]: valor }));

  const errores = {
    nombre: !datos.nombre.trim(),
    url: !/^https?:\/\/.+/.test(datos.url.trim()),
    codigo: !datos.codigo.trim() || codigosUsados.includes(datos.codigo.trim().toUpperCase()),
  };
  const hayErrores = Object.values(errores).some(Boolean);

  const enviar = async () => {
    setTocado(true);
    if (hayErrores) return;
    setGuardando(true);
    await alGuardar(
      { ...datos, codigo: datos.codigo.trim().toUpperCase(), url: datos.url.trim() },
      grupo?.id
    );
    setGuardando(false);
  };

  return (
    <Modal
      titulo={grupo ? 'Editar grupo' : 'Nuevo grupo'}
      descripcion="El código aparece en el mensaje y sirve para atribuir los clientes."
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
            {guardando ? 'Guardando…' : grupo ? 'Guardar cambios' : 'Agregar grupo'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field col-span-2">
          <span className="field-label">Nombre del grupo</span>
          <input
            className={`input${tocado && errores.nombre ? ' invalid' : ''}`}
            value={datos.nombre}
            onChange={(e) => {
              const nombre = e.target.value;
              setDatos((previos) => ({
                ...previos,
                nombre,
                codigo: previos.codigo || sugerirCodigo(nombre, codigosUsados),
              }));
            }}
            placeholder="Compra y venta Maipú"
          />
          {tocado && errores.nombre && <span className="field-error">Escribe el nombre.</span>}
        </label>

        <label className="field col-span-2">
          <span className="field-label">Enlace del grupo</span>
          <input
            className={`input${tocado && errores.url ? ' invalid' : ''}`}
            value={datos.url}
            onChange={(e) => cambiar('url', e.target.value)}
            placeholder="https://www.facebook.com/groups/…"
            inputMode="url"
          />
          {tocado && errores.url ? (
            <span className="field-error">Pega el enlace completo, con https://</span>
          ) : (
            <span className="field-hint">Es el enlace que se abre al tocar «Copiar y abrir».</span>
          )}
        </label>

        <label className="field">
          <span className="field-label">Código de atribución</span>
          <input
            className={`input${tocado && errores.codigo ? ' invalid' : ''}`}
            value={datos.codigo}
            onChange={(e) => cambiar('codigo', e.target.value.toUpperCase())}
            placeholder="CVM"
            maxLength={8}
          />
          {tocado && errores.codigo ? (
            <span className="field-error">Usa un código corto y distinto al de otros grupos.</span>
          ) : (
            <span className="field-hint">Se inserta con la variable {'{codigo}'}.</span>
          )}
        </label>

        <label className="field">
          <span className="field-label">Comuna principal</span>
          <select
            className="select"
            value={datos.comuna}
            onChange={(e) => cambiar('comuna', e.target.value)}
          >
            <option value="">Sin comuna específica</option>
            {COMUNAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Miembros aproximados</span>
          <input
            className="input"
            type="number"
            min={0}
            value={datos.miembros || ''}
            onChange={(e) => cambiar('miembros', Number(e.target.value) || 0)}
            placeholder="24000"
            inputMode="numeric"
          />
        </label>

        <label className="field">
          <span className="field-label">Horas de descanso</span>
          <input
            className="input"
            type="number"
            min={0}
            max={168}
            value={datos.cooldownHoras}
            onChange={(e) => cambiar('cooldownHoras', Number(e.target.value) || 0)}
            inputMode="numeric"
          />
          <span className="field-hint">Se cuenta por vendedor, no para todo el equipo.</span>
        </label>

        <label className="field col-span-2 row usuarios-check">
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => cambiar('activo', e.target.checked)}
          />
          <span className="field-label">Incluir en la rotación diaria</span>
        </label>
      </div>
    </Modal>
  );
}
