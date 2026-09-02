import { CalendarDays, LogOut, Moon, Sun, Unlock, WifiOff } from 'lucide-react';
import { fechaLarga } from '../utils/fecha';
import type { Tema } from '../hooks/useTema';
import './BarraSuperior.css';

interface Props {
  titulo: string;
  vendedor: string;
  rol: string;
  tema: Tema;
  alAlternarTema: () => void;
  sinConexion: boolean;
  esInvitado: boolean;
  alSalir: () => void;
}

export default function BarraSuperior({
  titulo,
  vendedor,
  rol,
  tema,
  alAlternarTema,
  sinConexion,
  esInvitado,
  alSalir,
}: Props) {
  const iniciales = vendedor
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'TÚ';

  return (
    <header className="superior">
      <div className="superior-izq">
        <h1 className="title-page">{titulo}</h1>
        <p className="fecha-chip">
          <CalendarDays size={14} />
          <span className="fecha-texto">{fechaLarga()}</span>
        </p>
      </div>

      <div className="superior-der">
        {esInvitado && (
          <span className="badge amber">
            <Unlock size={12} />
            Sin sesión
          </span>
        )}

        {sinConexion && (
          <span className="badge amber">
            <WifiOff size={12} />
            Sin conexión
          </span>
        )}

        <button
          type="button"
          className="tema-toggle"
          onClick={alAlternarTema}
          aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          <Sun size={14} className="tema-sol" />
          <span className={`tema-riel${tema === 'dark' ? ' oscuro' : ''}`}>
            <span className="tema-perilla" />
          </span>
          <Moon size={14} className="tema-luna" />
        </button>

        <div className="perfil">
          <span className="avatar">{iniciales}</span>
          <span className="perfil-datos">
            <span className="perfil-nombre truncate">{vendedor || 'Configura tu nombre'}</span>
            <span className="perfil-rol truncate">{rol}</span>
          </span>
          <button type="button" className="icon-btn" onClick={alSalir} title="Cerrar sesión">
            <LogOut size={16} />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
