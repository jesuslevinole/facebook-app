import type { CSSProperties } from 'react';
import {
  LayoutGrid,
  Megaphone,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Permiso } from '../types';
import './Navegacion.css';

export type Vista =
  | 'panel'
  | 'publicar'
  | 'clientes'
  | 'grupos'
  | 'mensajes'
  | 'equipo'
  | 'ajustes';

interface ItemNav {
  id: Vista;
  etiqueta: string;
  icono: LucideIcon;
  /** null = visible para cualquiera con sesión iniciada. */
  permiso: Permiso | null;
}

const PRINCIPALES: ItemNav[] = [
  { id: 'panel', etiqueta: 'Panel', icono: LayoutGrid, permiso: null },
  { id: 'publicar', etiqueta: 'Publicar', icono: Megaphone, permiso: 'publicar' },
  { id: 'clientes', etiqueta: 'Clientes', icono: Users, permiso: 'clientes.ver' },
  { id: 'grupos', etiqueta: 'Grupos', icono: UsersRound, permiso: 'grupos.ver' },
  { id: 'mensajes', etiqueta: 'Mensajes', icono: MessagesSquare, permiso: 'mensajes.ver' },
];

const SECUNDARIOS: ItemNav[] = [
  { id: 'equipo', etiqueta: 'Equipo', icono: ShieldCheck, permiso: 'usuarios.gestionar' },
  { id: 'ajustes', etiqueta: 'Ajustes', icono: Settings, permiso: null },
];

/** Vistas visibles para el rol actual. La navegación es la única fuente de
    verdad del orden; App.tsx la usa para elegir a dónde caer si la vista
    actual deja de estar permitida. */
export function vistasPermitidas(puede: (p: Permiso) => boolean): Vista[] {
  return [...PRINCIPALES, ...SECUNDARIOS]
    .filter((item) => !item.permiso || puede(item.permiso))
    .map((item) => item.id);
}

interface NavProps {
  vista: Vista;
  alCambiar: (vista: Vista) => void;
  publicadasHoy: number;
  meta: number;
  puede: (permiso: Permiso) => boolean;
}

export function BarraLateral({ vista, alCambiar, publicadasHoy, meta, puede }: NavProps) {
  const principales = PRINCIPALES.filter((i) => !i.permiso || puede(i.permiso));
  const secundarios = SECUNDARIOS.filter((i) => !i.permiso || puede(i.permiso));
  const avance = meta > 0 ? Math.min(100, Math.round((publicadasHoy / meta) * 100)) : 0;
  const completa = publicadasHoy >= meta && meta > 0;

  return (
    <aside className="lateral">
      <div className="marca">
        <span className="marca-signo" aria-hidden="true" />
        <span className="marca-nombre">RedLink</span>
      </div>

      <nav className="lateral-nav" aria-label="Secciones">
        <ul className="lateral-lista">
          {principales.map((item) => (
            <li key={item.id}>
              <BotonNav item={item} activo={vista === item.id} alCambiar={alCambiar} />
            </li>
          ))}
        </ul>

        <hr className="divider" />

        <ul className="lateral-lista">
          {secundarios.map((item) => (
            <li key={item.id}>
              <BotonNav item={item} activo={vista === item.id} alCambiar={alCambiar} />
            </li>
          ))}
        </ul>
      </nav>

      {puede('publicar') && (
      <section className="meta-card">
        <p className="eyebrow">Meta de hoy</p>
        <p className="meta-cifra num">
          {publicadasHoy}
          <span className="meta-total">/{meta}</span>
        </p>
        <div className="progress">
          <span
            className={`progress-fill${completa ? ' green' : ''}`}
            style={{ '--fill': `${avance}%` } as CSSProperties}
          />
        </div>
        <p className="meta-texto">
          {completa
            ? 'Meta cumplida. Frena acá y retomas mañana.'
            : `Faltan ${meta - publicadasHoy} publicaciones.`}
        </p>
        <button type="button" className="btn btn-soft btn-sm btn-block" onClick={() => alCambiar('publicar')}>
          Ver ruta de hoy
        </button>
      </section>
      )}
    </aside>
  );
}

export function BarraInferior({
  vista,
  alCambiar,
  puede,
}: Pick<NavProps, 'vista' | 'alCambiar' | 'puede'>) {
  const items = PRINCIPALES.filter((i) => !i.permiso || puede(i.permiso));
  return (
    <nav className="inferior" aria-label="Secciones">
      <ul className="inferior-lista">
        {items.map((item) => {
          const Icono = item.icono;
          const activo = vista === item.id;
          return (
            <li key={item.id} className="inferior-item">
              <button
                type="button"
                className={`inferior-btn${activo ? ' activo' : ''}`}
                onClick={() => alCambiar(item.id)}
                aria-current={activo ? 'page' : undefined}
              >
                <Icono size={20} />
                <span className="inferior-label">{item.etiqueta}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BotonNav({
  item,
  activo,
  alCambiar,
}: {
  item: ItemNav;
  activo: boolean;
  alCambiar: (vista: Vista) => void;
}) {
  const Icono = item.icono;
  return (
    <button
      type="button"
      className={`nav-btn${activo ? ' activo' : ''}`}
      onClick={() => alCambiar(item.id)}
      aria-current={activo ? 'page' : undefined}
    >
      <Icono size={18} />
      {item.etiqueta}
    </button>
  );
}
