import { useEffect, type CSSProperties } from 'react';
import {
  LayoutGrid,
  LogOut,
  Megaphone,
  MessagesSquare,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Permiso } from '../types';
import type { Tema } from '../hooks/useTema';
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

/** Vistas visibles para el rol actual, en el orden de la navegación. */
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

/* ---------- Lateral fija (escritorio) ---------- */

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
          <button
            type="button"
            className="btn btn-soft btn-sm btn-block"
            onClick={() => alCambiar('publicar')}
          >
            Ver ruta de hoy
          </button>
        </section>
      )}
    </aside>
  );
}

/* ---------- Barra inferior (móvil) ---------- */

export function BarraInferior({
  vista,
  alCambiar,
  puede,
}: Pick<NavProps, 'vista' | 'alCambiar' | 'puede'>) {
  const items = PRINCIPALES.filter((i) => !i.permiso || puede(i.permiso));
  return (
    <nav className="inferior" aria-label="Secciones principales">
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
                <Icono size={21} />
                <span className="inferior-label">{item.etiqueta}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Menú desplegable a pantalla completa (móvil) ---------- */

interface MenuProps extends NavProps {
  abierto: boolean;
  alCerrar: () => void;
  vendedor: string;
  rol: string;
  tema: Tema;
  alAlternarTema: () => void;
  alSalir: () => void;
}

export function MenuMovil({
  abierto,
  alCerrar,
  vista,
  alCambiar,
  publicadasHoy,
  meta,
  puede,
  vendedor,
  rol,
  tema,
  alAlternarTema,
  alSalir,
}: MenuProps) {
  /* Bloquear el scroll de fondo mientras el menú está abierto: si no, al
     deslizar dentro del menú se mueve la página de atrás. */
  useEffect(() => {
    if (!abierto) return;
    document.body.classList.add('sin-scroll');
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.classList.remove('sin-scroll');
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  const principales = PRINCIPALES.filter((i) => !i.permiso || puede(i.permiso));
  const secundarios = SECUNDARIOS.filter((i) => !i.permiso || puede(i.permiso));
  const avance = meta > 0 ? Math.min(100, Math.round((publicadasHoy / meta) * 100)) : 0;

  const iniciales =
    vendedor
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'TÚ';

  const ir = (destino: Vista) => {
    alCambiar(destino);
    alCerrar();
  };

  return (
    <div className="menu-movil" role="dialog" aria-modal="true" aria-label="Menú">
      <header className="menu-head">
        <div className="marca">
          <span className="marca-signo" aria-hidden="true" />
          <span className="marca-nombre">RedLink</span>
        </div>
        <button type="button" className="icon-btn" onClick={alCerrar} aria-label="Cerrar menú">
          <X size={22} />
        </button>
      </header>

      <div className="menu-perfil">
        <span className="avatar menu-avatar">{iniciales}</span>
        <span className="menu-perfil-datos">
          <span className="menu-perfil-nombre truncate">{vendedor || 'Sin nombre'}</span>
          <span className="text-sm muted-soft truncate">{rol}</span>
        </span>
      </div>

      {puede('publicar') && (
        <section className="menu-meta">
          <div className="row row-between">
            <span className="eyebrow">Meta de hoy</span>
            <span className="num">
              {publicadasHoy}/{meta}
            </span>
          </div>
          <div className="progress">
            <span
              className={`progress-fill${publicadasHoy >= meta ? ' green' : ''}`}
              style={{ '--fill': `${avance}%` } as CSSProperties}
            />
          </div>
        </section>
      )}

      <nav className="menu-nav" aria-label="Todas las secciones">
        <ul className="menu-lista">
          {principales.map((item) => (
            <li key={item.id}>
              <ItemMenu item={item} activo={vista === item.id} alIr={ir} />
            </li>
          ))}
        </ul>

        <hr className="divider" />

        <ul className="menu-lista">
          {secundarios.map((item) => (
            <li key={item.id}>
              <ItemMenu item={item} activo={vista === item.id} alIr={ir} />
            </li>
          ))}
        </ul>
      </nav>

      <footer className="menu-pie">
        <button type="button" className="menu-accion" onClick={alAlternarTema}>
          {tema === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          {tema === 'dark' ? 'Tema claro' : 'Tema oscuro'}
        </button>
        <button type="button" className="menu-accion salir" onClick={alSalir}>
          <LogOut size={19} />
          Cerrar sesión
        </button>
      </footer>
    </div>
  );
}

function ItemMenu({
  item,
  activo,
  alIr,
}: {
  item: ItemNav;
  activo: boolean;
  alIr: (vista: Vista) => void;
}) {
  const Icono = item.icono;
  return (
    <button
      type="button"
      className={`menu-item${activo ? ' activo' : ''}`}
      onClick={() => alIr(item.id)}
      aria-current={activo ? 'page' : undefined}
    >
      <Icono size={20} />
      {item.etiqueta}
    </button>
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
