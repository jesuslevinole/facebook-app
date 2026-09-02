import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import './Avisos.css';

type TipoAviso = 'ok' | 'error' | 'info';

interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

interface ContextoAvisos {
  avisar: (texto: string, tipo?: TipoAviso) => void;
}

const Contexto = createContext<ContextoAvisos | null>(null);

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const cerrar = useCallback((id: number) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback(
    (texto: string, tipo: TipoAviso = 'ok') => {
      const id = Date.now() + Math.random();
      setAvisos((previos) => [...previos, { id, tipo, texto }]);
      window.setTimeout(() => cerrar(id), 3600);
    },
    [cerrar]
  );

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <ul className="avisos" aria-live="polite">
        {avisos.map((aviso) => (
          <li key={aviso.id} className={`aviso ${aviso.tipo}`}>
            <span className="aviso-icono">
              {aviso.tipo === 'ok' && <Check size={15} />}
              {aviso.tipo === 'error' && <TriangleAlert size={15} />}
              {aviso.tipo === 'info' && <Info size={15} />}
            </span>
            <span className="aviso-texto">{aviso.texto}</span>
            <button type="button" className="aviso-cerrar" onClick={() => cerrar(aviso.id)}>
              <X size={14} />
              <span className="sr-only">Cerrar aviso</span>
            </button>
          </li>
        ))}
      </ul>
    </Contexto.Provider>
  );
}

export function useAvisos(): ContextoAvisos {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAvisos debe usarse dentro de ProveedorAvisos');
  return ctx;
}
