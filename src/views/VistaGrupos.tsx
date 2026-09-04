import { useMemo, useState, type CSSProperties } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  ListPlus,
  LogOut,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react';
import Modal from '../components/Modal';
import Buscador from '../components/Buscador';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { COMUNAS } from '../data/comunas';
import {
  borrarGrupo,
  crearGrupo,
  editarGrupo,
  salirDeGrupo,
  unirseAGrupo,
} from '../services/datos';
import type {
  Ajustes,
  Cliente,
  Grupo,
  Membresia,
  Plantilla,
  Publicacion,
} from '../types';
import { MAX_RUTA } from '../types';
import { claveMenos, diaMes, hoy } from '../utils/fecha';
import { construirMensaje } from '../utils/mensaje';
import { abrirEnPestana, copiar } from '../utils/portapapeles';
import { elegirPlantilla, sugerirCodigo } from '../utils/rotacion';
import './VistaGrupos.css';

interface Props {
  clientes: Cliente[];
  grupos: Grupo[];
  /** Publicaciones de todo el equipo: el rendimiento del grupo es colectivo. */
  publicaciones: Publicacion[];
  membresias: Membresia[];
  plantillas: Plantilla[];
  ajustes: Ajustes;
  /** Ids de los grupos que ya están en la ruta de hoy. */
  ruta: string[];
  alCambiarRuta: (grupoIds: string[]) => Promise<void>;
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
  vendedoresDentro: number;
}

type Pestana = 'todos' | 'mios';

const VACIO: Omit<Grupo, 'id'> = {
  uid: '',
  nombre: '',
  url: '',
  codigo: '',
  comuna: '',
  miembros: 0,
  activo: true,
  cooldownHoras: 20,
  createdAt: '',
};

export default function VistaGrupos({
  clientes,
  grupos,
  publicaciones,
  membresias,
  plantillas,
  ajustes,
  ruta,
  alCambiarRuta,
}: Props) {
  const { avisar } = useAvisos();
  const { perfil, puede, identidad } = useSesion();
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [comunaFiltro, setComunaFiltro] = useState('');
  const [pestana, setPestana] = useState<Pestana>('todos');
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [creando, setCreando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Grupo | null>(null);
  const [porSalir, setPorSalir] = useState<Grupo | null>(null);

  const puedeEditar = puede('grupos.editar');
  const fecha = hoy();
  const hace30 = claveMenos(30);

  /** Ids de los grupos donde el vendedor en sesión ya es miembro. */
  const misGrupos = useMemo(
    () => new Set(membresias.filter((m) => m.uid === perfil?.id).map((m) => m.grupoId)),
    [membresias, perfil]
  );

  const vendedoresPorGrupo = useMemo(() => {
    const mapa = new Map<string, number>();
    membresias.forEach((m) => mapa.set(m.grupoId, (mapa.get(m.grupoId) ?? 0) + 1));
    return mapa;
  }, [membresias]);

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
        publicadoHoy: pubs.some((p) => p.fecha === fecha && p.uid === perfil?.id),
        conversion: pubs30.length ? suyos30.length / pubs30.length : 0,
        porcentaje: 0,
        vendedoresDentro: vendedoresPorGrupo.get(grupo.id) ?? 0,
      };
    });

    const tope = Math.max(1, ...filas.map((f) => f.clientesTotal));
    return filas
      .map((f) => ({ ...f, porcentaje: (f.clientesTotal / tope) * 100 }))
      .sort((a, b) => b.clientesTotal - a.clientesTotal || b.publicaciones30 - a.publicaciones30);
  }, [grupos, publicaciones, clientes, hace30, fecha, perfil, vendedoresPorGrupo]);

  /* «Todos los grupos» muestra solo los que aún no son míos: al marcarse
     como miembro, el grupo desaparece de acá y pasa a «Mis grupos». */
  const disponibles = rendimiento.filter((r) => !misGrupos.has(r.grupo.id));
  const mios = rendimiento.filter((r) => misGrupos.has(r.grupo.id));
  const base = pestana === 'todos' ? disponibles : mios;
  const visibles = comunaFiltro ? base.filter((r) => r.grupo.comuna === comunaFiltro) : base;

  const comunasEnUso = useMemo(() => {
    const set = new Set(grupos.map((g) => g.comuna).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [grupos]);

  const enRuta = useMemo(() => new Set(ruta), [ruta]);

  /* El mensaje que se copia al abrir un grupo es el mismo que la ruta le
     asignaría hoy: así el texto coincide con el de la vista Publicar. */
  const mensajeDe = (grupo: Grupo): string => {
    const misPubs = publicaciones.filter((p) => p.uid === perfil?.id);
    const historial = {
      ultima: misPubs
        .filter((p) => p.grupoId === grupo.id)
        .sort((a, b) => b.ts.localeCompare(a.ts))[0],
      porPlantilla: new Map(
        misPubs
          .filter((p) => p.grupoId === grupo.id)
          .sort((a, b) => b.ts.localeCompare(a.ts))
          .map((p) => [p.plantillaId, p])
      ),
    };
    const ultimaGlobal = [...misPubs].sort((a, b) => b.ts.localeCompare(a.ts))[0];
    const plantilla = elegirPlantilla(grupo, plantillas, historial, ultimaGlobal, ajustes, fecha);
    return plantilla ? construirMensaje(plantilla, grupo, identidad, fecha) : '';
  };

  const copiarYAbrir = (grupo: Grupo) => {
    const texto = mensajeDe(grupo);
    if (!texto) {
      abrirEnPestana(grupo.url);
      avisar('No hay mensajes activos: se abrió el grupo sin copiar nada.', 'info');
      return;
    }
    copiar(texto);
    abrirEnPestana(grupo.url);
    avisar('Mensaje copiado. Pega y publica.');
  };

  const alternarSeleccion = (grupoId: string) =>
    setSeleccion((previos) =>
      previos.includes(grupoId) ? previos.filter((p) => p !== grupoId) : [...previos, grupoId]
    );

  const seleccionarTodos = () => {
    const ids = visibles.map((r) => r.grupo.id);
    const faltantes = ids.filter((id) => !seleccion.includes(id));
    setSeleccion(faltantes.length === 0 ? [] : [...new Set([...seleccion, ...ids])]);
  };

  const agregarARuta = async () => {
    const nuevos = seleccion.filter((id) => !enRuta.has(id));
    if (nuevos.length === 0) {
      avisar('Los grupos elegidos ya están en la ruta.', 'info');
      return;
    }
    const total = [...ruta, ...nuevos];
    if (total.length > MAX_RUTA) {
      avisar(
        `La ruta admite ${MAX_RUTA} grupos y quedarían ${total.length}. Quita algunos o publica primero.`,
        'error'
      );
      return;
    }
    try {
      await alCambiarRuta(total);
      setSeleccion([]);
      avisar(
        `${nuevos.length} ${nuevos.length === 1 ? 'grupo agregado' : 'grupos agregados'} a la ruta de hoy.`
      );
    } catch {
      avisar('No se pudo actualizar la ruta.', 'error');
    }
  };

  const unirse = async (grupo: Grupo) => {
    if (!perfil) return;
    try {
      await unirseAGrupo(perfil.id, grupo.id);
      avisar(`${grupo.nombre} pasó a tus grupos para publicar.`);
    } catch {
      avisar('No se pudo marcar el grupo.', 'error');
    }
  };

  const confirmarSalida = async (grupo: Grupo) => {
    if (!perfil) return;
    try {
      await salirDeGrupo(perfil.id, grupo.id);
      avisar(`${grupo.nombre} vuelve a la lista de todos los grupos.`);
    } catch {
      avisar('No se pudo quitar el grupo.', 'error');
    }
    setPorSalir(null);
  };

  const guardar = async (datos: Omit<Grupo, 'id'>, id?: string) => {
    try {
      if (id) {
        /* Editar un grupo heredado lo pasa a nombre de quien lo edita:
           así el catálogo compartido se va repartiendo solo. */
        const dueno = grupos.find((g) => g.id === id)?.uid;
        await editarGrupo(id, dueno ? datos : { ...datos, uid: perfil?.id ?? '' });
        avisar('Grupo actualizado.');
      } else {
        await crearGrupo({
          ...datos,
          uid: perfil?.id ?? '',
          createdAt: new Date().toISOString(),
        });
        avisar('Grupo agregado al catálogo.');
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
            Agrega el enlace de cada grupo de Facebook donde publica el equipo. Después cada
            vendedor marca en cuáles ya está dentro.
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
      <div className="seccion-head">
        <div className="barra-filtros usuarios-tabs">
          <button
            type="button"
            className={`chip${pestana === 'todos' ? ' active' : ''}`}
            onClick={() => setPestana('todos')}
          >
            Todos los grupos ({disponibles.length})
          </button>
          <button
            type="button"
            className={`chip${pestana === 'mios' ? ' active' : ''}`}
            onClick={() => setPestana('mios')}
          >
            Mis grupos ({mios.length})
          </button>
        </div>

        <span className="spacer" />

        <div className="grupos-comuna">
          <Buscador
            opciones={comunasEnUso.map((c) => ({ valor: c, etiqueta: c }))}
            valor={comunaFiltro}
            alCambiar={setComunaFiltro}
            vacio="Todas las comunas"
          />
        </div>

        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
            <Plus size={16} />
            Nuevo grupo
          </button>
        )}
      </div>

      <div className="ruta-barra card">
        <label className="row ruta-todos">
          <input
            type="checkbox"
            checked={visibles.length > 0 && visibles.every((r) => seleccion.includes(r.grupo.id))}
            onChange={seleccionarTodos}
          />
          <span className="text-sm">
            {seleccion.length > 0
              ? `${seleccion.length} seleccionados`
              : 'Seleccionar todos los visibles'}
          </span>
        </label>

        <span className="spacer" />

        <span className="text-sm muted-soft">
          Ruta de hoy: {ruta.length}/{MAX_RUTA}
        </span>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void agregarARuta()}
          disabled={seleccion.length === 0}
        >
          <ListPlus size={15} />
          Agregar ruta
        </button>
      </div>

      <p className="text-sm muted">
        {pestana === 'todos'
          ? 'Marca «Ya soy miembro» cuando Facebook apruebe tu solicitud. El grupo pasa a tu lista para publicar.'
          : 'Estos son los grupos que entran en tu ruta diaria. Las cifras son de todo el equipo.'}
      </p>

      {visibles.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="empty-icon">
              <UsersRound size={22} />
            </span>
            <p className="empty-title">
              {pestana === 'todos' ? 'Ya estás en todos los grupos' : 'Todavía no tienes grupos'}
            </p>
            <p className="text-sm muted">
              {pestana === 'todos'
                ? 'No queda ninguno por marcar. Si agregan grupos nuevos, aparecerán acá.'
                : 'Ve a «Todos los grupos» y marca en cuáles ya te aceptaron.'}
            </p>
            {pestana === 'mios' && (
              <button type="button" className="btn btn-primary" onClick={() => setPestana('todos')}>
                Ver todos los grupos
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card card-flush">
          <div className="table-scroll tabla-grupos">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-check" />
                  <th>Grupo</th>
                  <th>Comuna</th>
                  <th className="col-num">Miembros</th>
                  <th className="col-num">Vendedores</th>
                  {pestana === 'mios' && (
                    <>
                      <th className="col-num">Clientes</th>
                      <th className="col-num">Pub. 30d</th>
                      <th className="col-num">Cli./pub.</th>
                      <th>Última</th>
                    </>
                  )}
                  <th className="cell-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.grupo.id} className={r.grupo.activo ? '' : 'fila-pausada'}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={seleccion.includes(r.grupo.id)}
                        onChange={() => alternarSeleccion(r.grupo.id)}
                        aria-label={`Seleccionar ${r.grupo.nombre}`}
                      />
                    </td>
                    <td>
                      <div className="celda-nombre">
                        <span className="celda-fuerte truncate">{r.grupo.nombre}</span>
                        <span className="row">
                          <span className="code-tag">{r.grupo.codigo}</span>
                          {enRuta.has(r.grupo.id) && <span className="badge blue">En ruta</span>}
                          {r.publicadoHoy && <span className="badge green">Publicado hoy</span>}
                          {!r.grupo.activo && <span className="badge">En pausa</span>}
                        </span>
                      </div>
                    </td>
                    <td className="muted">{r.grupo.comuna || '—'}</td>
                    <td className="col-num muted">
                      {r.grupo.miembros ? r.grupo.miembros.toLocaleString('es-CL') : '—'}
                    </td>
                    <td className="col-num num">{r.vendedoresDentro}</td>

                    {pestana === 'mios' && (
                      <>
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
                        <td className="col-num num">{r.publicaciones30}</td>
                        <td className="col-num num">{r.conversion.toFixed(2)}</td>
                        <td className="muted">{r.ultimaFecha ? diaMes(r.ultimaFecha) : 'Nunca'}</td>
                      </>
                    )}

                    <td className="cell-actions">
                      <div className="row acciones-fila">
                        {pestana === 'todos' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => copiarYAbrir(r.grupo)}
                              title="Copia el mensaje del día y abre el grupo"
                            >
                              <ExternalLink size={14} />
                              Ir al grupo
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => void unirse(r.grupo)}
                            >
                              <Check size={14} />
                              Ya soy miembro
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => copiarYAbrir(r.grupo)}
                              title="Copia el mensaje del día y abre el grupo"
                            >
                              <Copy size={14} />
                              Copiar y abrir
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setPorSalir(r.grupo)}
                              title="Ya no soy miembro"
                            >
                              <LogOut size={16} />
                            </button>
                          </>
                        )}

                        {puedeEditar && pestana === 'mios' && (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grupos-tarjetas">
            {visibles.map((r) => (
              <li key={r.grupo.id} className={`grupo-card${r.grupo.activo ? '' : ' pausada'}`}>
                <div className="row row-between">
                  <label className="ruta-check">
                    <input
                      type="checkbox"
                      checked={seleccion.includes(r.grupo.id)}
                      onChange={() => alternarSeleccion(r.grupo.id)}
                      aria-label={`Seleccionar ${r.grupo.nombre}`}
                    />
                  </label>
                  <div className="celda-nombre">
                    <span className="celda-fuerte truncate">{r.grupo.nombre}</span>
                    <span className="row">
                      <span className="code-tag">{r.grupo.codigo}</span>
                      {r.grupo.comuna && <span className="text-sm muted">{r.grupo.comuna}</span>}
                    </span>
                  </div>
                  {r.publicadoHoy && <span className="badge green">Hoy</span>}
                </div>

                {pestana === 'mios' ? (
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
                ) : (
                  <p className="text-sm muted">
                    {r.grupo.miembros ? `${r.grupo.miembros.toLocaleString('es-CL')} miembros · ` : ''}
                    {r.vendedoresDentro} vendedor{r.vendedoresDentro === 1 ? '' : 'es'} del equipo
                    dentro
                  </p>
                )}

                <div className="grupo-card-acciones">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => copiarYAbrir(r.grupo)}
                  >
                    <Copy size={14} />
                    Copiar y abrir
                  </button>
                  {pestana === 'todos' ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void unirse(r.grupo)}
                    >
                      <Check size={14} />
                      Ya soy miembro
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setPorSalir(r.grupo)}
                      >
                        <LogOut size={14} />
                        Salir
                      </button>
                      {puedeEditar && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setEditando(r.grupo)}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {porSalir && (
        <Modal
          titulo="Quitar de mis grupos"
          ancho="sm"
          alCerrar={() => setPorSalir(null)}
          pie={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setPorSalir(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmarSalida(porSalir)}
              >
                Quitar
              </button>
            </>
          }
        >
          <p className="text-sm">
            {porSalir.nombre} sale de tu ruta de publicación y vuelve a «Todos los grupos». El
            historial de lo que ya publicaste ahí se conserva.
          </p>
        </Modal>
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
            Se elimina {porBorrar.nombre} del catálogo y de la ruta de todo el equipo. Los clientes
            que llegaron desde acá quedan sin origen. Si solo quieres dejar de publicar tú, usa
            «Salir».
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

        <div className="field">
          <span className="field-label">Comuna principal</span>
          <Buscador
            opciones={COMUNAS.map((c) => ({ valor: c, etiqueta: c }))}
            valor={datos.comuna}
            alCambiar={(v) => cambiar('comuna', v)}
            vacio="Sin comuna específica"
          />
        </div>

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
          <span className="field-label">Disponible para el equipo</span>
        </label>
      </div>
    </Modal>
  );
}
