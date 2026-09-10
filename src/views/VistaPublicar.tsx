import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  ChevronDown,
  Copy,
  ExternalLink,
  Heart,
  Megaphone,
  MessageCircle,
  RefreshCcw,
  Shuffle,
  Undo2,
  UserCheck,
  UserX,
  Clock,
  Timer,
  Wand2,
} from 'lucide-react';
import Modal from '../components/Modal';
import CampoBusqueda from '../components/CampoBusqueda';
import PanelFiltros from '../components/PanelFiltros';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import type { Vista } from '../components/Navegacion';
import type { Ajustes, Cliente, Grupo, Parada, Plantilla, Publicacion } from '../types';
import {
  borrarPublicacion,
  editarPublicacion,
  registrarPublicacion,
  type ImagenGuardada,
} from '../services/datos';
import { faltaParaReinicio, horaCorta, horaDeChile, hoy } from '../utils/fecha';
import { etiquetaHora, mejoresHoras } from '../utils/horarios';
import { coincide } from '../utils/texto';
import { copiarImagen, descargarImagen } from '../utils/imagen';
import { construirMensaje } from '../utils/mensaje';
import { abrirEnPestana, copiar } from '../utils/portapapeles';
import { construirRuta } from '../utils/rotacion';
import './VistaPublicar.css';

interface Props {
  clientes: Cliente[];
  grupos: Grupo[];
  plantillas: Plantilla[];
  /** Todos los grupos donde el vendedor es miembro (para el mensaje vacío). */
  misGrupos: Grupo[];
  /** Ya viene filtrado a las publicaciones del vendedor en sesión. */
  publicaciones: Publicacion[];
  ajustes: Ajustes;
  imagenes: ImagenGuardada[];
  alIrA: (vista: Vista) => void;
  alRegenerarRuta: () => Promise<number>;
}

type Filtro = 'sinPublicar' | 'publicados';

export default function VistaPublicar({
  clientes,
  grupos,
  misGrupos,
  plantillas,
  publicaciones,
  ajustes,
  imagenes,
  alIrA,
  alRegenerarRuta,
}: Props) {
  const { avisar } = useAvisos();
  const { perfil, identidad, puede } = useSesion();
  const [filtro, setFiltro] = useState<Filtro>('sinPublicar');
  const [alternativas, setAlternativas] = useState<Record<string, string>>({});
  const [abierta, setAbierta] = useState<string | null>(null);
  const [midiendo, setMidiendo] = useState<Publicacion | null>(null);
  const [regenerando, setRegenerando] = useState(false);
  /* Segundos que faltan para poder publicar de nuevo. Se recalcula cada
     segundo contra la última publicación registrada, no con un temporizador
     propio: si se recarga la página el bloqueo sigue en pie. */
  const [esperaRestante, setEsperaRestante] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  const fecha = hoy();
  const activas = useMemo(() => plantillas.filter((p) => p.activo), [plantillas]);

  const ruta = useMemo(
    () => construirRuta(grupos, plantillas, publicaciones, ajustes, fecha, identidad),
    [grupos, plantillas, publicaciones, ajustes, fecha, identidad]
  );

  const rutaFinal: Parada[] = useMemo(
    () =>
      ruta.map((parada) => {
        const idElegida = alternativas[parada.grupo.id];
        if (!idElegida) return parada;
        const plantilla = activas.find((p) => p.id === idElegida);
        if (!plantilla) return parada;
        return {
          ...parada,
          plantilla,
          texto: construirMensaje(plantilla, parada.grupo, identidad, fecha),
        };
      }),
    [ruta, alternativas, activas, identidad, fecha]
  );

  const publicadasHoy = publicaciones.filter((p) => p.fecha === fecha);

  const ultimaPublicacion = useMemo(
    () => [...publicaciones].sort((a, b) => b.ts.localeCompare(a.ts))[0],
    [publicaciones]
  );

  const esperaSegundos = Math.max(0, (ajustes.minutosEntrePublicaciones ?? 2) * 60);

  useEffect(() => {
    if (!ultimaPublicacion || esperaSegundos === 0) {
      setEsperaRestante(0);
      return;
    }
    const calcular = () => {
      const pasados = (Date.now() - new Date(ultimaPublicacion.ts).getTime()) / 1000;
      setEsperaRestante(Math.max(0, Math.ceil(esperaSegundos - pasados)));
    };
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [ultimaPublicacion, esperaSegundos]);

  const enEspera = esperaRestante > 0;

  const imagenPorId = useMemo(() => new Map(imagenes.map((i) => [i.id, i])), [imagenes]);

  /* Perfil horario del vendedor, calculado sobre todo su historial. */
  const franjasBuenas = useMemo(() => mejoresHoras(publicaciones, 3), [publicaciones]);
  const horaActual = horaDeChile();
  const pendientes = rutaFinal.filter((p) => !p.publicadoHoy).length;
  const clientesHoy = clientes.filter((c) => c.createdAt.slice(0, 10) === fecha).length;

  /* Dos listas excluyentes: al registrar una publicación el grupo sale de
     «Sin publicar» y aparece en «Publicados» sin que haya que recargar.

     «Publicados» va del más reciente al más antiguo, que es el orden en que
     se revisan las interacciones: lo último publicado es lo que todavía no
     se midió. «Sin publicar» conserva el orden de la ruta. */
  const visibles = useMemo(() => {
    const lista = rutaFinal.filter((p) =>
      filtro === 'sinPublicar' ? !p.publicadoHoy : p.publicadoHoy
    );
    const filtrada = busqueda
      ? lista.filter((p) =>
          coincide(
            `${p.grupo.nombre} ${p.grupo.codigo} ${p.grupo.comuna} ${p.plantilla?.titulo ?? ''}`,
            busqueda
          )
        )
      : lista;

    if (filtro !== 'publicados') return filtrada;

    const horaDe = new Map(publicadasHoy.map((p) => [p.grupoId, p.ts]));
    return [...filtrada].sort((a, b) =>
      (horaDe.get(b.grupo.id) ?? '').localeCompare(horaDe.get(a.grupo.id) ?? '')
    );
  }, [rutaFinal, filtro, publicadasHoy, busqueda]);

  const publicacionDelGrupo = useCallback(
    (grupoId: string) => publicadasHoy.find((p) => p.grupoId === grupoId),
    [publicadasHoy]
  );

  const registrar = useCallback(
    async (parada: Parada) => {
      if (!parada.plantilla || !perfil) return;
      try {
        await registrarPublicacion({
          uid: perfil.id,
          enlace: '',
          hora: horaDeChile(),
          likes: 0,
          comentarios: 0,
          factibles: 0,
          noFactibles: 0,
          grupoId: parada.grupo.id,
          grupoNombre: parada.grupo.nombre,
          plantillaId: parada.plantilla.id,
          plantillaTitulo: parada.plantilla.titulo,
          fecha,
          ts: new Date().toISOString(),
          textoUsado: parada.texto,
        });
      } catch {
        avisar('No se pudo registrar la publicación.', 'error');
      }
    },
    [avisar, fecha, perfil]
  );

  /* Copiar y abrir van en el mismo gesto, sin await entremedio: si se espera
     la promesa del portapapeles, Safari bloquea la ventana nueva. */
  const copiarYAbrir = (parada: Parada) => {
    if (enEspera) {
      avisar(
        `Espera ${formatoEspera(esperaRestante)} antes de la próxima publicación. Publicar seguido es lo que gatilla el filtro de spam.`,
        'info'
      );
      return;
    }
    if (!parada.plantilla) {
      avisar('Este grupo no tiene mensaje disponible. Crea uno en Mensajes.', 'error');
      return;
    }
    copiar(parada.texto);
    abrirEnPestana(parada.grupo.url);
    avisar(`Mensaje copiado. ${parada.grupo.nombre} pasó a «Publicados».`);
    void registrar(parada);
  };

  const soloCopiar = (parada: Parada) => {
    copiar(parada.texto);
    avisar('Mensaje copiado.');
  };

  const deshacer = async (publicacion: Publicacion) => {
    try {
      await borrarPublicacion(publicacion.id);
      avisar(`${publicacion.grupoNombre} volvió a «Sin publicar».`, 'info');
    } catch {
      avisar('No se pudo eliminar el registro.', 'error');
    }
  };

  const otroMensaje = (parada: Parada) => {
    if (activas.length < 2) {
      avisar('Necesitas al menos dos mensajes activos para alternar.', 'info');
      return;
    }
    const indice = activas.findIndex((p) => p.id === parada.plantilla?.id);
    const siguiente = activas[(indice + 1) % activas.length];
    setAlternativas((previas) => ({ ...previas, [parada.grupo.id]: siguiente.id }));
    setAbierta(parada.grupo.id);
  };

  if (grupos.length === 0 || activas.length === 0) {
    const sinMensajes = activas.length === 0;
    const sinMembresias = misGrupos.length === 0;
    return (
      <section className="card">
        <div className="empty">
          <span className="empty-icon">
            <Megaphone size={22} />
          </span>
          <p className="empty-title">
            {sinMensajes ? 'Falta crear un mensaje' : 'Tu ruta de hoy está vacía'}
          </p>
          <p className="text-sm muted">
            {sinMensajes
              ? 'No hay ningún mensaje activo para publicar.'
              : sinMembresias
                ? 'Todavía no marcaste ningún grupo como tuyo. Ve a Grupos y marca en cuáles ya eres miembro.'
                : 'Elige los grupos que vas a recorrer hoy con el botón «Agregar ruta».'}
          </p>
          {sinMensajes ? (
            puede('mensajes.editar') ? (
              <button type="button" className="btn btn-primary" onClick={() => alIrA('mensajes')}>
                Crear mensaje
              </button>
            ) : (
              <p className="text-sm muted-soft">Pídele a un administrador que cree los mensajes.</p>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => alIrA('grupos')}>
              Armar mi ruta
            </button>
          )}
        </div>
      </section>
    );
  }

  const reinicio = faltaParaReinicio();

  const avance = ajustes.metaDiaria
    ? Math.min(100, Math.round((publicadasHoy.length / ajustes.metaDiaria) * 100))
    : 0;

  return (
    <section className="stack">
      <article className="card resumen-ruta">
        <div className="resumen-datos">
          <div className="resumen-dato">
            <p className="eyebrow">Publicadas hoy</p>
            <p className="resumen-cifra num">
              {publicadasHoy.length}
              <span className="resumen-meta">/{ajustes.metaDiaria}</span>
            </p>
          </div>
          <div className="resumen-dato">
            <p className="eyebrow">Pendientes</p>
            <p className="resumen-cifra num">{pendientes}</p>
          </div>
          <div className="resumen-dato">
            <p className="eyebrow">Clientes de hoy</p>
            <p className="resumen-cifra num">{clientesHoy}</p>
          </div>
        </div>

        <div className="resumen-progreso">
          <div className="progress">
            <span
              className={`progress-fill${avance >= 100 ? ' green' : ''}`}
              style={{ '--fill': `${avance}%` } as CSSProperties}
            />
          </div>
          <p className="text-sm muted">
            {filtro === 'publicados'
              ? 'Revisa cada publicación en Facebook y anota sus interacciones: es lo que decide qué grupos entran mañana.'
              : `Sigue la tabla de arriba hacia abajo. La ruta se vacía en ${reinicio.horas} h ${reinicio.minutos} min, a las 11:59 pm de Venezuela.`}
          </p>
        </div>
      </article>

      {franjasBuenas.length > 0 && (
        <div className="horario card">
          <span className="horario-icono">
            <Clock size={16} />
          </span>
          <p className="text-sm">
            <strong>Tus mejores horas:</strong>{' '}
            {franjasBuenas
              .map((f) => `${etiquetaHora(f.hora)} (${f.promedio.toFixed(1)} int./pub.)`)
              .join(' · ')}
          </p>
          <span className="spacer" />
          <span className="badge blue">Ahora son las {etiquetaHora(horaActual)}</span>
        </div>
      )}

      <div className="tabs-linea">
        {(['sinPublicar', 'publicados'] as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${filtro === f ? ' active' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'sinPublicar' && `Sin publicar (${pendientes})`}
            {f === 'publicados' && `Publicados (${publicadasHoy.length})`}
          </button>
        ))}
      </div>

      <PanelFiltros
        activos={busqueda ? 1 : 0}
        busqueda={
          <CampoBusqueda
            valor={busqueda}
            alCambiar={setBusqueda}
            marcador="Buscar grupo o mensaje"
          />
        }
      >
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setAlternativas({})}
          disabled={Object.keys(alternativas).length === 0}
        >
          <RefreshCcw size={15} />
          Restaurar mensajes
        </button>

        <button
          type="button"
          className="btn btn-soft"
          onClick={async () => {
            setRegenerando(true);
            const total = await alRegenerarRuta();
            setRegenerando(false);
            avisar(
              total === 0
                ? 'Ningún grupo califica todavía. Revisa Grupos → Mis grupos.'
                : `Ruta recalculada con ${total} ${total === 1 ? 'grupo' : 'grupos'}.`,
              total === 0 ? 'info' : 'ok'
            );
          }}
          disabled={regenerando}
        >
          <Wand2 size={15} />
          {regenerando ? 'Calculando…' : 'Rearmar ruta'}
        </button>
      </PanelFiltros>

      {enEspera && filtro === 'sinPublicar' && (
        <div className="espera card">
          <span className="espera-icono">
            <Timer size={18} />
          </span>
          <div className="espera-texto">
            <p className="espera-cifra num">{formatoEspera(esperaRestante)}</p>
            <p className="text-sm muted">
              Descanso entre publicaciones. Publicar sin pausa es lo que hace que Facebook marque
              la cuenta como spam.
            </p>
          </div>
          <div className="progress espera-barra">
            <span
              className="progress-fill"
              style={
                {
                  '--fill': `${100 - (esperaRestante / esperaSegundos) * 100}%`,
                } as CSSProperties
              }
            />
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="card">
          <div className="empty">
            <p className="empty-title">
              {filtro === 'sinPublicar' ? 'Recorriste toda la ruta' : 'Todavía no publicas hoy'}
            </p>
            <p className="text-sm muted">
              {filtro === 'sinPublicar'
                ? 'Ya publicaste en todos los grupos de la ruta de hoy. Vuelve mañana o agrega más grupos.'
                : 'Cuando toques «Copiar y abrir», el grupo aparecerá acá para que registres sus interacciones.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card card-flush">
          <div className="table-scroll tabla-ruta">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-orden">#</th>
                  <th>Grupo</th>
                  <th>Mensaje asignado</th>
                  <th>Estado</th>
                  <th className="cell-actions">Publicar</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((parada, indice) => {
                  const registro = publicacionDelGrupo(parada.grupo.id);
                  const expandida = abierta === parada.grupo.id;
                  return (
                    <Fila
                      key={parada.grupo.id}
                      parada={parada}
                      indice={indice}
                      registro={registro}
                      bloqueado={parada.horasParaHabilitar > 0 && !parada.publicadoHoy}
                      expandida={expandida}
                      alExpandir={() => setAbierta(expandida ? null : parada.grupo.id)}
                      alPublicar={() => copiarYAbrir(parada)}
                      alCopiar={() => soloCopiar(parada)}
                      alDeshacer={() => registro && void deshacer(registro)}
                      alRotar={() => otroMensaje(parada)}
                      alMedir={() => registro && setMidiendo(registro)}
                      enEspera={enEspera}
                      imagen={
                        parada.plantilla?.imagenId
                          ? imagenPorId.get(parada.plantilla.imagenId)
                          : undefined
                      }
                      alCopiarImagen={async () => {
                        const img = parada.plantilla?.imagenId
                          ? imagenPorId.get(parada.plantilla.imagenId)
                          : undefined;
                        if (!img) return;
                        const ok = await copiarImagen(img.datos);
                        if (ok) avisar('Imagen copiada. Pégala en Facebook.');
                        else {
                          descargarImagen(img.datos, img.nombre);
                          avisar('Imagen descargada: adjúntala desde la galería.', 'info');
                        }
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* En móvil la tabla se convierte en tarjetas accionables con el pulgar. */}
          <ul className="ruta-tarjetas">
            {visibles.map((parada, indice) => {
              const registro = publicacionDelGrupo(parada.grupo.id);
              const bloqueado = parada.horasParaHabilitar > 0 && !parada.publicadoHoy;
              return (
                <li key={parada.grupo.id} className={`ruta-card${parada.publicadoHoy ? ' hecha' : ''}`}>
                  <div className="row">
                    <span className="parada-orden num">{String(indice + 1).padStart(2, '0')}</span>
                    <div className="celda-nombre">
                      <span className="celda-fuerte truncate">{parada.grupo.nombre}</span>
                      <span className="text-sm muted-soft">
                        {parada.plantilla?.titulo ?? 'Sin mensaje'}
                      </span>
                    </div>
                    <span className="spacer" />
                    <span
                      className={`badge ${parada.publicadoHoy ? 'green' : bloqueado ? 'amber' : 'blue'}`}
                    >
                      {parada.publicadoHoy && registro ? horaCorta(registro.ts) : parada.grupo.codigo}
                    </span>
                  </div>

                  <p className="parada-texto ruta-card-texto">{parada.texto}</p>

                  <div className="ruta-card-acciones">
                    {parada.publicadoHoy && registro ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => abrirEnPestana(parada.grupo.url)}
                        >
                          <ExternalLink size={14} />
                          Abrir
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setMidiendo(registro)}
                        >
                          <BarChart3 size={14} />
                          Medir
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void deshacer(registro)}
                        >
                          <Undo2 size={14} />
                          Devolver
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => copiarYAbrir(parada)}
                          disabled={enEspera}
                        >
                          <ExternalLink size={14} />
                          {enEspera ? formatoEspera(esperaRestante) : 'Copiar y abrir'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => otroMensaje(parada)}
                        >
                          <Shuffle size={14} />
                          Otro
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {midiendo && (
        <ModalInteracciones publicacion={midiendo} alCerrar={() => setMidiendo(null)} />
      )}
    </section>
  );
}

function formatoEspera(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ---------- Registro de interacciones ---------- */

function ModalInteracciones({
  publicacion,
  alCerrar,
}: {
  publicacion: Publicacion;
  alCerrar: () => void;
}) {
  const { avisar } = useAvisos();
  const [likes, setLikes] = useState(publicacion.likes ?? 0);
  const [comentarios, setComentarios] = useState(publicacion.comentarios ?? 0);
  const [factibles, setFactibles] = useState(publicacion.factibles ?? 0);
  const [noFactibles, setNoFactibles] = useState(publicacion.noFactibles ?? 0);
  const [enlace, setEnlace] = useState(publicacion.enlace ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      await editarPublicacion(publicacion.id, {
        likes,
        comentarios,
        factibles,
        noFactibles,
        enlace: enlace.trim(),
      });
      avisar('Interacciones registradas. Cuentan para armar la ruta de mañana.');
      alCerrar();
    } catch {
      avisar('No se pudieron guardar las interacciones.', 'error');
    }
    setGuardando(false);
  };

  return (
    <Modal
      titulo={`Interacciones en ${publicacion.grupoNombre}`}
      descripcion="Revisa la publicación en Facebook y anota lo que dejó. Es el dato con el que se decide qué grupos entran en la ruta."
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
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <label className="field enlace-campo">
        <span className="field-label">Enlace de la publicación</span>
        <span className="row">
          <input
            className="input"
            value={enlace}
            onChange={(e) => setEnlace(e.target.value)}
            placeholder="https://www.facebook.com/groups/…/posts/…"
            inputMode="url"
          />
          {enlace.trim() && (
            <a
              className="btn btn-outline"
              href={enlace.trim()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} />
              Ver
            </a>
          )}
        </span>
        <span className="field-hint">
          En Facebook, toca la fecha de tu publicación y copia la dirección. Guardarla te evita
          buscarla entre todo el muro cada vez que quieras contar sus reacciones.
        </span>
      </label>

      <div className="contadores">
        <Contador
          icono={<Heart size={16} />}
          etiqueta="Me gusta"
          ayuda="Reacciones de cualquier tipo."
          valor={likes}
          alCambiar={setLikes}
        />
        <Contador
          icono={<MessageCircle size={16} />}
          etiqueta="Comentarios"
          ayuda="Sin contar tus propias respuestas."
          valor={comentarios}
          alCambiar={setComentarios}
        />
        <Contador
          icono={<UserCheck size={16} />}
          etiqueta="Contactos aprovechables"
          ayuda="Escribieron y sí se les puede vender."
          valor={factibles}
          alCambiar={setFactibles}
          destacado
        />
        <Contador
          icono={<UserX size={16} />}
          etiqueta="Contactos sin cobertura"
          ayuda="Escribieron pero no se puede concretar."
          valor={noFactibles}
          alCambiar={setNoFactibles}
        />
      </div>

      <p className="field-hint contadores-nota">
        La proporción entre aprovechables y sin cobertura es lo que más pesa: un grupo con dos
        contactos útiles vale más que uno con diez que no dan.
      </p>
    </Modal>
  );
}

function Contador({
  icono,
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  destacado = false,
}: {
  icono: ReactNode;
  etiqueta: string;
  ayuda: string;
  valor: number;
  alCambiar: (v: number) => void;
  destacado?: boolean;
}) {
  return (
    <div className={`contador${destacado ? ' destacado' : ''}`}>
      <span className="contador-icono">{icono}</span>
      <span className="contador-texto">
        <span className="contador-etiqueta">{etiqueta}</span>
        <span className="text-sm muted-soft">{ayuda}</span>
      </span>
      <span className="contador-controles">
        <button
          type="button"
          className="icon-btn"
          onClick={() => alCambiar(Math.max(0, valor - 1))}
          aria-label={`Restar a ${etiqueta}`}
        >
          −
        </button>
        <input
          className="input contador-campo"
          type="number"
          min={0}
          value={valor}
          onChange={(e) => alCambiar(Math.max(0, Number(e.target.value) || 0))}
          inputMode="numeric"
        />
        <button
          type="button"
          className="icon-btn"
          onClick={() => alCambiar(valor + 1)}
          aria-label={`Sumar a ${etiqueta}`}
        >
          +
        </button>
      </span>
    </div>
  );
}

/* ---------- Fila de la tabla ---------- */

interface FilaProps {
  parada: Parada;
  indice: number;
  registro: Publicacion | undefined;
  bloqueado: boolean;
  expandida: boolean;
  alExpandir: () => void;
  alPublicar: () => void;
  alCopiar: () => void;
  alDeshacer: () => void;
  alRotar: () => void;
  alMedir: () => void;
  /** true mientras corre el descanso obligatorio entre publicaciones. */
  enEspera: boolean;
  imagen: ImagenGuardada | undefined;
  alCopiarImagen: () => Promise<void>;
}

function Fila({
  parada,
  indice,
  registro,
  bloqueado,
  expandida,
  alExpandir,
  alPublicar,
  alCopiar,
  alDeshacer,
  alRotar,
  alMedir,
  enEspera,
  imagen,
  alCopiarImagen,
}: FilaProps) {
  return (
    <>
      <tr className={parada.publicadoHoy ? 'fila-hecha' : ''}>
        <td className="col-orden num muted-soft">{String(indice + 1).padStart(2, '0')}</td>

        <td>
          <div className="celda-nombre">
            <span className="celda-fuerte truncate">{parada.grupo.nombre}</span>
            <span className="text-sm muted-soft">
              {parada.grupo.codigo}
              {parada.grupo.comuna ? ` · ${parada.grupo.comuna}` : ''}
            </span>
          </div>
        </td>

        <td>
          <button type="button" className="mensaje-toggle" onClick={alExpandir}>
            <ChevronDown size={14} className={expandida ? 'girado' : ''} />
            <span className="truncate">{parada.plantilla?.titulo ?? 'Sin mensaje'}</span>
          </button>
        </td>

        <td>
          <span className={`badge ${parada.publicadoHoy ? 'green' : bloqueado ? 'amber' : 'blue'}`}>
            {parada.publicadoHoy && registro
              ? `Publicado a las ${horaCorta(registro.ts)}`
              : parada.motivo}
          </span>
          {registro && (registro.likes || registro.comentarios || registro.factibles) ? (
            <span className="row interacciones-mini">
              <span title="Me gusta">
                <Heart size={11} /> {registro.likes ?? 0}
              </span>
              <span title="Comentarios">
                <MessageCircle size={11} /> {registro.comentarios ?? 0}
              </span>
              <span title="Contactos aprovechables">
                <UserCheck size={11} /> {registro.factibles ?? 0}
              </span>
            </span>
          ) : null}
        </td>

        <td className="cell-actions">
          {parada.publicadoHoy && registro ? (
            <div className="row acciones-fila">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => abrirEnPestana(parada.grupo.url)}
              >
                <ExternalLink size={14} />
                Abrir
              </button>
              {registro?.enlace ? (
                <a
                  className="icon-btn"
                  href={registro.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir la publicación en Facebook"
                >
                  <ExternalLink size={16} />
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={alMedir}
                title="Registrar likes, comentarios y contactos"
              >
                <BarChart3 size={14} />
                Interacciones
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={alDeshacer}
                title="Vuelve a «Sin publicar» y borra el registro"
              >
                <Undo2 size={14} />
                Devolver
              </button>
            </div>
          ) : (
            <div className="row acciones-fila">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={alPublicar}
                disabled={enEspera}
              >
                <ExternalLink size={14} />
                Copiar y abrir
              </button>
              <button type="button" className="icon-btn" onClick={alCopiar} title="Solo copiar">
                <Copy size={16} />
              </button>
              <button type="button" className="icon-btn" onClick={alRotar} title="Otro mensaje">
                <Shuffle size={16} />
              </button>
            </div>
          )}
        </td>
      </tr>

      {expandida && (
        <tr className="fila-mensaje">
          <td colSpan={5}>
            <p className="parada-texto">{parada.texto || 'Sin mensaje disponible.'}</p>
            {imagen && (
              <div className="parada-imagen">
                <img src={imagen.datos} alt="" />
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void alCopiarImagen()}
                  >
                    <Copy size={14} />
                    Copiar imagen
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => descargarImagen(imagen.datos, imagen.nombre)}
                  >
                    Descargar
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
