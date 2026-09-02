import { useMemo, useRef, useState } from 'react';
import { Copy, Eye, MessagesSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { borrarPlantilla, crearPlantilla, editarPlantilla } from '../services/datos';
import type { Grupo, Identidad, Plantilla, Publicacion, TonoPlantilla } from '../types';
import { hoy } from '../utils/fecha';
import { combinaciones, construirMensaje } from '../utils/mensaje';
import { copiar } from '../utils/portapapeles';
import './VistaMensajes.css';

interface Props {
  grupos: Grupo[];
  plantillas: Plantilla[];
  publicaciones: Publicacion[];
}

const TONOS: { id: TonoPlantilla; etiqueta: string; clase: string }[] = [
  { id: 'directo', etiqueta: 'Directo', clase: 'blue' },
  { id: 'pregunta', etiqueta: 'Pregunta', clase: 'violet' },
  { id: 'oferta', etiqueta: 'Oferta', clase: 'green' },
  { id: 'testimonio', etiqueta: 'Testimonio', clase: 'amber' },
  { id: 'urgencia', etiqueta: 'Urgencia', clase: 'red' },
];

const VARIABLES = [
  { clave: '{codigo}', ayuda: 'Código del grupo' },
  { clave: '{comuna}', ayuda: 'Comuna del grupo' },
  { clave: '{grupo}', ayuda: 'Nombre del grupo' },
  { clave: '{vendedor}', ayuda: 'Tu nombre' },
  { clave: '{telefono}', ayuda: 'Tu teléfono' },
];

const GRUPO_EJEMPLO: Grupo = {
  id: 'ejemplo',
  nombre: 'Compra y venta Maipú',
  url: '',
  codigo: 'CVM',
  comuna: 'Maipú',
  miembros: 0,
  activo: true,
  cooldownHoras: 20,
  createdAt: '',
};

const VACIA: Omit<Plantilla, 'id' | 'createdAt'> = {
  titulo: '',
  cuerpo: '',
  tono: 'directo',
  activo: true,
};

export default function VistaMensajes({ grupos, plantillas, publicaciones }: Props) {
  const { avisar } = useAvisos();
  const { identidad, puede } = useSesion();
  const puedeEditar = puede('mensajes.editar');
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [creando, setCreando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Plantilla | null>(null);
  const [previa, setPrevia] = useState<Plantilla | null>(null);

  const usosPorPlantilla = useMemo(() => {
    const mapa = new Map<string, number>();
    publicaciones.forEach((p) => mapa.set(p.plantillaId, (mapa.get(p.plantillaId) ?? 0) + 1));
    return mapa;
  }, [publicaciones]);

  const guardar = async (datos: Omit<Plantilla, 'id' | 'createdAt'>, id?: string) => {
    try {
      if (id) {
        await editarPlantilla(id, datos);
        avisar('Mensaje actualizado.');
      } else {
        await crearPlantilla({ ...datos, createdAt: new Date().toISOString() });
        avisar('Mensaje creado.');
      }
      setCreando(false);
      setEditando(null);
    } catch {
      avisar('No se pudo guardar el mensaje.', 'error');
    }
  };

  const confirmarBorrado = async (plantilla: Plantilla) => {
    try {
      await borrarPlantilla(plantilla.id);
      avisar('Mensaje eliminado.');
    } catch {
      avisar('No se pudo eliminar el mensaje.', 'error');
    }
    setPorBorrar(null);
  };

  const alternarActivo = async (plantilla: Plantilla) => {
    try {
      await editarPlantilla(plantilla.id, { activo: !plantilla.activo });
    } catch {
      avisar('No se pudo cambiar el estado del mensaje.', 'error');
    }
  };

  const grupoMuestra = grupos[0] ?? GRUPO_EJEMPLO;
  const activas = plantillas.filter((p) => p.activo).length;

  return (
    <section className="stack">
      <div className="seccion-head">
        <p className="text-sm muted">
          {activas} mensajes activos rotando. Las variantes entre llaves hacen que el texto salga
          distinto en cada grupo.
        </p>
        {puedeEditar && (
          <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
            <Plus size={16} />
            Nuevo mensaje
          </button>
        )}
      </div>

      {plantillas.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="empty-icon">
              <MessagesSquare size={22} />
            </span>
            <p className="empty-title">Sin mensajes todavía</p>
            <p className="text-sm muted">
              Crea el primero o carga los de ejemplo desde Ajustes y edítalos a tu manera.
            </p>
            {puedeEditar && (
              <button type="button" className="btn btn-primary" onClick={() => setCreando(true)}>
                <Plus size={16} />
                Nuevo mensaje
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="mensajes">
          {plantillas.map((p) => {
            const tono = TONOS.find((t) => t.id === p.tono) ?? TONOS[0];
            const variantes = combinaciones(p.cuerpo);
            return (
              <li key={p.id} className={`mensaje card${p.activo ? '' : ' pausado'}`}>
                <header className="mensaje-head">
                  <div className="mensaje-titulo">
                    <h3 className="title-card truncate">{p.titulo}</h3>
                    <div className="row row-wrap mensaje-meta">
                      <span className={`badge ${tono.clase}`}>{tono.etiqueta}</span>
                      <span className="badge">{variantes.toLocaleString('es-CL')} variantes</span>
                      <span className="text-sm muted-soft">
                        {usosPorPlantilla.get(p.id) ?? 0} usos en 45 días
                      </span>
                      {!p.activo && <span className="badge amber">En pausa</span>}
                    </div>
                  </div>

                  <div className="grupo-botones">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setPrevia(p)}
                      aria-label={`Ver ${p.titulo}`}
                    >
                      <Eye size={16} />
                    </button>
                    {puedeEditar && (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setEditando(p)}
                          aria-label={`Editar ${p.titulo}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setPorBorrar(p)}
                          aria-label={`Eliminar ${p.titulo}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </header>

                <p className="mensaje-cuerpo">{p.cuerpo}</p>

                {puedeEditar && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void alternarActivo(p)}
                  >
                    {p.activo ? 'Pausar mensaje' : 'Activar mensaje'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(creando || editando) && (
        <EditorMensaje
          plantilla={editando}
          grupoMuestra={grupoMuestra}
          identidad={identidad}
          alCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          alGuardar={guardar}
        />
      )}

      {previa && (
        <Modal
          titulo={previa.titulo}
          descripcion={`Así se ve hoy para ${grupoMuestra.nombre}.`}
          alCerrar={() => setPrevia(null)}
          pie={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                copiar(
                  construirMensaje(
                    previa,
                    grupoMuestra,
                    identidad,
                    hoy()
                  )
                );
                avisar('Mensaje copiado.');
              }}
            >
              <Copy size={15} />
              Copiar
            </button>
          }
        >
          <p className="previa-texto">
            {construirMensaje(
              previa,
              grupoMuestra,
              identidad,
              hoy()
            )}
          </p>
        </Modal>
      )}

      {porBorrar && (
        <Modal
          titulo="Eliminar mensaje"
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
            Se elimina «{porBorrar.titulo}» de la rotación. El historial de publicaciones que ya lo
            usaron se mantiene.
          </p>
        </Modal>
      )}
    </section>
  );
}

/* ---------- Editor ---------- */

interface EditorProps {
  plantilla: Plantilla | null;
  grupoMuestra: Grupo;
  identidad: Identidad;
  alCerrar: () => void;
  alGuardar: (datos: Omit<Plantilla, 'id' | 'createdAt'>, id?: string) => Promise<void>;
}

function EditorMensaje({ plantilla, grupoMuestra, identidad, alCerrar, alGuardar }: EditorProps) {
  const [datos, setDatos] = useState<Omit<Plantilla, 'id' | 'createdAt'>>(() =>
    plantilla
      ? { titulo: plantilla.titulo, cuerpo: plantilla.cuerpo, tono: plantilla.tono, activo: plantilla.activo }
      : { ...VACIA }
  );
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const errores = { titulo: !datos.titulo.trim(), cuerpo: datos.cuerpo.trim().length < 20 };
  const hayErrores = Object.values(errores).some(Boolean);
  const variantes = combinaciones(datos.cuerpo);

  const insertar = (texto: string) => {
    const area = areaRef.current;
    if (!area) {
      setDatos((previos) => ({ ...previos, cuerpo: `${previos.cuerpo}${texto}` }));
      return;
    }
    const inicio = area.selectionStart;
    const fin = area.selectionEnd;
    const nuevo = `${datos.cuerpo.slice(0, inicio)}${texto}${datos.cuerpo.slice(fin)}`;
    setDatos((previos) => ({ ...previos, cuerpo: nuevo }));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(inicio + texto.length, inicio + texto.length);
    });
  };

  const vistaPrevia = construirMensaje(
    { ...datos, id: plantilla?.id ?? 'previa', createdAt: '' },
    grupoMuestra,
    identidad,
    hoy()
  );

  const enviar = async () => {
    setTocado(true);
    if (hayErrores) return;
    setGuardando(true);
    await alGuardar(datos, plantilla?.id);
    setGuardando(false);
  };

  return (
    <Modal
      titulo={plantilla ? 'Editar mensaje' : 'Nuevo mensaje'}
      descripcion="Escribe alternativas entre llaves separadas por | y la app elige una distinta cada vez."
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
            onClick={() => void enviar()}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : plantilla ? 'Guardar cambios' : 'Crear mensaje'}
          </button>
        </>
      }
    >
      <div className="editor">
        <div className="editor-campos">
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Título interno</span>
              <input
                className={`input${tocado && errores.titulo ? ' invalid' : ''}`}
                value={datos.titulo}
                onChange={(e) => setDatos((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Oferta directa · fibra"
              />
              {tocado && errores.titulo && <span className="field-error">Ponle un título.</span>}
            </label>

            <label className="field">
              <span className="field-label">Tono</span>
              <select
                className="select"
                value={datos.tono}
                onChange={(e) => setDatos((p) => ({ ...p, tono: e.target.value as TonoPlantilla }))}
              >
                {TONOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">Cuerpo del mensaje</span>
            <textarea
              ref={areaRef}
              className={`textarea editor-area${tocado && errores.cuerpo ? ' invalid' : ''}`}
              value={datos.cuerpo}
              onChange={(e) => setDatos((p) => ({ ...p, cuerpo: e.target.value }))}
              placeholder="{Hola|Buenas} vecinos de {comuna}…"
            />
            {tocado && errores.cuerpo && (
              <span className="field-error">El mensaje es muy corto para publicar.</span>
            )}
          </div>

          <div className="editor-herramientas">
            <p className="eyebrow">Insertar</p>
            <ul className="editor-chips">
              {VARIABLES.map((v) => (
                <li key={v.clave}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => insertar(v.clave)}
                    title={v.ayuda}
                  >
                    {v.clave}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="chip" onClick={() => insertar('{opción A|opción B}')}>
                  variante
                </button>
              </li>
            </ul>
          </div>
        </div>

        <aside className="editor-previa">
          <div className="row row-between">
            <p className="eyebrow">Vista previa</p>
            <span className="badge blue">{variantes.toLocaleString('es-CL')} variantes</span>
          </div>
          <p className="previa-texto">{vistaPrevia || 'Escribe el mensaje para verlo acá.'}</p>
          <p className="field-hint">
            Ejemplo con {grupoMuestra.nombre}. Cambia según el grupo y el día.
          </p>
        </aside>
      </div>
    </Modal>
  );
}
