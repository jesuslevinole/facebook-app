import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import {
  ChevronDown,
  Copy,
  ExternalLink,
  Megaphone,
  RefreshCcw,
  Shuffle,
  Undo2,
} from 'lucide-react';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import type { Vista } from '../components/Navegacion';
import type { Ajustes, Cliente, Grupo, Parada, Plantilla, Publicacion } from '../types';
import { borrarPublicacion, registrarPublicacion } from '../services/datos';
import { horaCorta, hoy } from '../utils/fecha';
import { construirMensaje } from '../utils/mensaje';
import { abrirEnPestana, copiar } from '../utils/portapapeles';
import { construirRuta } from '../utils/rotacion';
import './VistaPublicar.css';

interface Props {
  clientes: Cliente[];
  grupos: Grupo[];
  plantillas: Plantilla[];
  /** Ya viene filtrado a las publicaciones del vendedor en sesión. */
  publicaciones: Publicacion[];
  ajustes: Ajustes;
  alIrA: (vista: Vista) => void;
}

type Filtro = 'porPublicar' | 'publicados' | 'todos';

export default function VistaPublicar({
  clientes,
  grupos,
  plantillas,
  publicaciones,
  ajustes,
  alIrA,
}: Props) {
  const { avisar } = useAvisos();
  const { perfil, identidad, puede } = useSesion();
  const [filtro, setFiltro] = useState<Filtro>('porPublicar');
  const [alternativas, setAlternativas] = useState<Record<string, string>>({});
  const [abierta, setAbierta] = useState<string | null>(null);

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
  const pendientes = rutaFinal.filter((p) => !p.publicadoHoy).length;
  const clientesHoy = clientes.filter((c) => c.createdAt.slice(0, 10) === fecha).length;

  const visibles = rutaFinal.filter((p) => {
    if (filtro === 'porPublicar') return !p.publicadoHoy;
    if (filtro === 'publicados') return p.publicadoHoy;
    return true;
  });

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
    if (!parada.plantilla) {
      avisar('Este grupo no tiene mensaje disponible. Crea uno en Mensajes.', 'error');
      return;
    }
    copiar(parada.texto);
    abrirEnPestana(parada.grupo.url);
    avisar(`Mensaje copiado. Pega en ${parada.grupo.nombre} y publica.`);
    void registrar(parada);
  };

  const soloCopiar = (parada: Parada) => {
    copiar(parada.texto);
    avisar('Mensaje copiado.');
  };

  const deshacer = async (publicacion: Publicacion) => {
    try {
      await borrarPublicacion(publicacion.id);
      avisar('Registro eliminado. El grupo vuelve a la ruta.', 'info');
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
    const faltanGrupos = grupos.length === 0;
    const puedeArreglar = faltanGrupos ? puede('grupos.editar') : puede('mensajes.editar');
    return (
      <section className="card">
        <div className="empty">
          <span className="empty-icon">
            <Megaphone size={22} />
          </span>
          <p className="empty-title">Falta un paso para armar tu ruta</p>
          <p className="text-sm muted">
            {faltanGrupos
              ? 'Todavía no has marcado ningún grupo como tuyo. Ve a Grupos → Todos los grupos y marca en cuáles ya eres miembro.'
              : 'No hay ningún mensaje activo para publicar.'}
          </p>
          {faltanGrupos ? (
            <button type="button" className="btn btn-primary" onClick={() => alIrA('grupos')}>
              Ver todos los grupos
            </button>
          ) : puedeArreglar ? (
            <button type="button" className="btn btn-primary" onClick={() => alIrA('mensajes')}>
              Crear mensaje
            </button>
          ) : (
            <p className="text-sm muted-soft">Pídele a un administrador que cree los mensajes.</p>
          )}
        </div>
      </section>
    );
  }

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
            Sigue la tabla de arriba hacia abajo. El orden se recalcula solo cada día y el mensaje
            rota por grupo.
          </p>
        </div>
      </article>

      <div className="barra-filtros">
        {(['porPublicar', 'publicados', 'todos'] as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${filtro === f ? ' active' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'porPublicar' && `Grupos para publicar (${pendientes})`}
            {f === 'publicados' && `Publicados (${publicadasHoy.length})`}
            {f === 'todos' && `Todos (${rutaFinal.length})`}
          </button>
        ))}
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setAlternativas({})}
          disabled={Object.keys(alternativas).length === 0}
        >
          <RefreshCcw size={14} />
          Restaurar sugerencias
        </button>
      </div>

      {visibles.length === 0 ? (
        <div className="card">
          <div className="empty">
            <p className="empty-title">
              {filtro === 'porPublicar' ? 'Recorriste toda la ruta' : 'Nada por acá'}
            </p>
            <p className="text-sm muted">
              {filtro === 'porPublicar'
                ? 'Ya publicaste en todos tus grupos disponibles hoy.'
                : 'Cambia el filtro para ver el resto de los grupos.'}
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
                          className="btn btn-ghost btn-sm"
                          onClick={() => void deshacer(registro)}
                        >
                          <Undo2 size={14} />
                          Deshacer
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => copiarYAbrir(parada)}
                        >
                          <ExternalLink size={14} />
                          Copiar y abrir
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
    </section>
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
            {parada.publicadoHoy && registro ? `Publicado ${horaCorta(registro.ts)}` : parada.motivo}
          </span>
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
              <button type="button" className="icon-btn" onClick={alDeshacer} title="Deshacer registro">
                <Undo2 size={16} />
              </button>
            </div>
          ) : (
            <div className="row acciones-fila">
              <button type="button" className="btn btn-primary btn-sm" onClick={alPublicar}>
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
          </td>
        </tr>
      )}
    </>
  );
}
