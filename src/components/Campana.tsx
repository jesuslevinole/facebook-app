import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  MessagesSquare,
  Megaphone,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { CAMBIOS } from '../data/cambios';
import type { Novedad, TipoNovedad } from '../types';
import './Campana.css';

interface Props {
  novedades: Novedad[];
  /** Uid del usuario, para no avisarle de sus propias acciones. */
  uid: string;
}

interface Aviso {
  id: string;
  tipo: TipoNovedad;
  titulo: string;
  detalle: string;
  autor: string;
  ts: string;
}

const ICONOS: Record<TipoNovedad, typeof Bell> = {
  grupo: UsersRound,
  cliente: UserPlus,
  mensaje: MessagesSquare,
  publicacion: Megaphone,
  sistema: Sparkles,
};

/** Clave de «hasta cuándo leí», por usuario y en este dispositivo. */
const clave = (uid: string) => `redlink-visto-${uid}`;

export default function Campana({ novedades, uid }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [visto, setVisto] = useState(() => localStorage.getItem(clave(uid)) ?? '');
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisto(localStorage.getItem(clave(uid)) ?? '');
  }, [uid]);

  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  /* Las novedades del equipo y los cambios del sistema se mezclan en una
     sola lista ordenada por fecha: para quien lee son lo mismo. */
  const avisos: Aviso[] = useMemo(() => {
    const delEquipo: Aviso[] = novedades
      .filter((n) => n.uid !== uid)
      .map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        detalle: n.detalle,
        autor: n.autorNombre,
        ts: n.ts,
      }));

    const delSistema: Aviso[] = CAMBIOS.map((c) => ({
      id: `cambio-${c.version}`,
      tipo: 'sistema' as TipoNovedad,
      titulo: c.titulo,
      detalle: c.detalle,
      autor: `Versión ${c.version}`,
      ts: c.fecha,
    }));

    return [...delEquipo, ...delSistema]
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 40);
  }, [novedades, uid]);

  const sinLeer = avisos.filter((a) => a.ts > visto).length;

  const abrir = () => {
    setAbierto((a) => !a);
    if (!abierto && avisos.length > 0) {
      /* Se marca al abrir, no al cerrar: si el usuario abre y se va, ya vio
         que había algo nuevo. */
      const masReciente = avisos[0].ts;
      localStorage.setItem(clave(uid), masReciente);
      window.setTimeout(() => setVisto(masReciente), 1200);
    }
  };

  return (
    <div className="campana" ref={contenedor}>
      <button
        type="button"
        className="campana-btn"
        onClick={abrir}
        aria-label={sinLeer > 0 ? `${sinLeer} novedades sin leer` : 'Novedades'}
      >
        <Bell size={19} />
        {sinLeer > 0 && <span className="campana-punto">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>

      {abierto && (
        <div className="campana-panel">
          <header className="campana-head">
            <h3 className="title-card">Novedades</h3>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </header>

          {avisos.length === 0 ? (
            <p className="campana-vacio">Nada nuevo por ahora.</p>
          ) : (
            <ul className="campana-lista">
              {avisos.map((a) => {
                const Icono = ICONOS[a.tipo] ?? Bell;
                const nuevo = a.ts > visto;
                return (
                  <li key={a.id} className={`campana-item${nuevo ? ' nuevo' : ''}`}>
                    <span className={`campana-icono ${a.tipo}`}>
                      <Icono size={15} />
                    </span>
                    <span className="campana-texto">
                      <span className="campana-titulo">{a.titulo}</span>
                      <span className="text-sm muted">{a.detalle}</span>
                      <span className="campana-meta">
                        {a.autor} · {haceCuanto(a.ts)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function haceCuanto(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(
    new Date(iso)
  );
}
