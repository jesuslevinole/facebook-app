import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './Buscador.css';

export interface OpcionBuscador {
  valor: string;
  etiqueta: string;
  /** Texto secundario que también entra en la búsqueda (comuna, código, correo). */
  detalle?: string;
}

interface Props {
  opciones: OpcionBuscador[];
  valor: string;
  alCambiar: (valor: string) => void;
  /** Texto cuando no hay nada elegido. También es la opción "sin valor". */
  vacio?: string;
  /** Si es false, no se puede volver a la opción vacía. */
  permiteVacio?: boolean;
  invalido?: boolean;
  deshabilitado?: boolean;
  id?: string;
}

/* Reemplaza a `<select>` en todo el proyecto. Un desplegable nativo con 340
   comunas obliga a scrollear a ciegas; acá se escribe y se filtra.

   La comparación ignora tildes y mayúsculas: escribir "nunoa" encuentra
   "Ñuñoa", que es como la gente escribe cuando va rápido. */
export default function Buscador({
  opciones,
  valor,
  alCambiar,
  vacio = 'Seleccionar',
  permiteVacio = true,
  invalido = false,
  deshabilitado = false,
  id,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resaltada, setResaltada] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const elegida = opciones.find((o) => o.valor === valor);

  const filtradas = useMemo(() => {
    const busqueda = normalizar(texto);
    if (!busqueda) return opciones;
    return opciones.filter((o) =>
      normalizar(`${o.etiqueta} ${o.detalle ?? ''}`).includes(busqueda)
    );
  }, [opciones, texto]);

  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      setTexto('');
      setResaltada(0);
      /* El foco va al campo de búsqueda apenas se abre: así se puede
         escribir de inmediato sin un click extra. */
      requestAnimationFrame(() => entrada.current?.focus());
    }
  }, [abierto]);

  const elegir = (nuevo: string) => {
    alCambiar(nuevo);
    setAbierto(false);
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltada((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltada((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opcion = filtradas[resaltada];
      if (opcion) elegir(opcion.valor);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  return (
    <div className="buscador" ref={contenedor}>
      <button
        type="button"
        id={id}
        className={`buscador-boton${invalido ? ' invalid' : ''}${abierto ? ' abierto' : ''}`}
        onClick={() => setAbierto((a) => !a)}
        disabled={deshabilitado}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span className={`buscador-valor truncate${elegida ? '' : ' vacio'}`}>
          {elegida?.etiqueta ?? vacio}
        </span>
        {elegida && permiteVacio && !deshabilitado && (
          <span
            className="buscador-limpiar"
            role="button"
            tabIndex={-1}
            aria-label="Quitar selección"
            onClick={(e) => {
              e.stopPropagation();
              alCambiar('');
            }}
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={15} className="buscador-flecha" />
      </button>

      {abierto && (
        <div className="buscador-panel">
          <div className="buscador-campo">
            <Search size={14} className="buscador-lupa" />
            <input
              ref={entrada}
              className="buscador-entrada"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setResaltada(0);
              }}
              onKeyDown={alTeclear}
              placeholder="Escribe para buscar…"
            />
          </div>

          <ul className="buscador-lista" role="listbox">
            {permiteVacio && !texto && (
              <li>
                <button
                  type="button"
                  className={`buscador-opcion${valor === '' ? ' elegida' : ''}`}
                  onClick={() => elegir('')}
                >
                  <span className="muted">{vacio}</span>
                  {valor === '' && <Check size={14} />}
                </button>
              </li>
            )}

            {filtradas.length === 0 ? (
              <li className="buscador-nada">Sin resultados para «{texto}»</li>
            ) : (
              filtradas.map((o, i) => (
                <li key={o.valor}>
                  <button
                    type="button"
                    className={`buscador-opcion${o.valor === valor ? ' elegida' : ''}${
                      i === resaltada ? ' resaltada' : ''
                    }`}
                    onClick={() => elegir(o.valor)}
                    onMouseMove={() => setResaltada(i)}
                  >
                    <span className="buscador-texto">
                      <span className="truncate">{o.etiqueta}</span>
                      {o.detalle && <span className="buscador-detalle truncate">{o.detalle}</span>}
                    </span>
                    {o.valor === valor && <Check size={14} />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
