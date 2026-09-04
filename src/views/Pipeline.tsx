import { useMemo, useState, type DragEvent } from 'react';
import { ChevronRight, Facebook, GripVertical, MapPin, Pencil } from 'lucide-react';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { editarCliente } from '../services/datos';
import type { Cliente, EstadoCliente, Grupo, Usuario } from '../types';
import { ETAPAS, etapaDe, normalizarEstado } from '../utils/estados';
import './Pipeline.css';

interface Props {
  clientes: Cliente[];
  grupos: Grupo[];
  usuarios: Usuario[];
  alEditar: (cliente: Cliente) => void;
}

/* Tablero por etapas, con arrastrar y soltar en escritorio.

   En móvil arrastrar entre columnas horizontales no funciona: no hay dónde
   soltar sin scrollear. Por eso cada tarjeta tiene además un botón que la
   avanza a la etapa siguiente, y el modal de edición permite saltar a
   cualquiera. El arrastre es un atajo, nunca la única vía. */
export default function Pipeline({ clientes, grupos, usuarios, alEditar }: Props) {
  const { avisar } = useAvisos();
  const { perfil } = useSesion();
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<EstadoCliente | null>(null);

  const nombreGrupo = useMemo(() => {
    const mapa = new Map(grupos.map((g) => [g.id, g.nombre]));
    return (id: string | null) => (id ? mapa.get(id) ?? 'Grupo eliminado' : 'Sin grupo');
  }, [grupos]);

  const nombreVendedor = useMemo(() => {
    const mapa = new Map(usuarios.map((u) => [u.id, u.nombre]));
    return (uid: string) => mapa.get(uid) ?? '—';
  }, [usuarios]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<EstadoCliente, Cliente[]>();
    ETAPAS.forEach((e) => mapa.set(e.id, []));
    clientes.forEach((c) => {
      const etapa = normalizarEstado(c.estado);
      mapa.get(etapa)?.push(c);
    });
    return mapa;
  }, [clientes]);

  const mover = async (cliente: Cliente, destino: EstadoCliente) => {
    if (normalizarEstado(cliente.estado) === destino) return;
    try {
      await editarCliente(cliente.id, { estado: destino, updatedAt: new Date().toISOString() });
      avisar(`${cliente.nombre} pasó a «${etapaDe(destino).etiqueta}».`);
    } catch {
      avisar('No se pudo mover el cliente.', 'error');
    }
  };

  const alSoltar = (e: DragEvent, destino: EstadoCliente) => {
    e.preventDefault();
    setEncima(null);
    setArrastrando(null);
    const id = e.dataTransfer.getData('text/plain');
    const cliente = clientes.find((c) => c.id === id);
    if (cliente) void mover(cliente, destino);
  };

  const siguienteEtapa = (actual: EstadoCliente): EstadoCliente | null => {
    const i = ETAPAS.findIndex((e) => e.id === actual);
    const siguiente = ETAPAS[i + 1];
    return siguiente ? siguiente.id : null;
  };

  return (
    <div className="pipeline">
      {ETAPAS.map((etapa) => {
        const fila = porEtapa.get(etapa.id) ?? [];
        return (
          <section
            key={etapa.id}
            className={`columna${encima === etapa.id ? ' encima' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setEncima(etapa.id);
            }}
            onDragLeave={() => setEncima((previa) => (previa === etapa.id ? null : previa))}
            onDrop={(e) => alSoltar(e, etapa.id)}
          >
            <header className="columna-head">
              <span className={`dot dot-${etapa.clase}`} />
              <h3 className="columna-titulo truncate">{etapa.etiqueta}</h3>
              <span className="columna-conteo num">{fila.length}</span>
            </header>

            <p className="columna-ayuda">{etapa.ayuda}</p>

            <ul className="columna-lista">
              {fila.length === 0 ? (
                <li className="columna-vacia">Arrastra una tarjeta acá</li>
              ) : (
                fila.map((c) => {
                  const proxima = siguienteEtapa(etapa.id);
                  const esMio = c.uid === perfil?.id;
                  return (
                    <li
                      key={c.id}
                      className={`tarjeta${arrastrando === c.id ? ' arrastrando' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', c.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setArrastrando(c.id);
                      }}
                      onDragEnd={() => setArrastrando(null)}
                    >
                      <div className="tarjeta-head">
                        <GripVertical size={14} className="tarjeta-asa" />
                        <span className="tarjeta-nombre truncate">
                          {c.nombre} {c.apellido}
                        </span>
                        <button
                          type="button"
                          className="icon-btn tarjeta-editar"
                          onClick={() => alEditar(c)}
                          aria-label={`Editar ${c.nombre}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>

                      <p className="tarjeta-dato truncate">
                        <MapPin size={11} /> {c.comuna || 'Sin comuna'}
                      </p>
                      <p className="tarjeta-dato truncate">{nombreGrupo(c.grupoId)}</p>

                      <div className="tarjeta-pie">
                        <span className={`badge ${c.compania === 'Claro' ? 'red' : 'violet'}`}>
                          {c.compania}
                        </span>
                        {!esMio && (
                          <span className="text-sm muted-soft truncate">
                            {nombreVendedor(c.uid)}
                          </span>
                        )}
                        {c.facebookUrl && (
                          <a
                            className="icon-btn tarjeta-fb"
                            href={c.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Facebook de ${c.nombre}`}
                          >
                            <Facebook size={13} />
                          </a>
                        )}
                      </div>

                      {proxima && (
                        <button
                          type="button"
                          className="tarjeta-avanzar"
                          onClick={() => void mover(c, proxima)}
                        >
                          <ChevronRight size={12} />
                          {etapaDe(proxima).etiqueta}
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
