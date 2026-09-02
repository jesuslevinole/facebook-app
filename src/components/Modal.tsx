import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Ancho = 'sm' | 'md' | 'lg';

interface ModalProps {
  titulo: string;
  descripcion?: string;
  ancho?: Ancho;
  alCerrar: () => void;
  pie?: ReactNode;
  children: ReactNode;
}

export default function Modal({
  titulo,
  descripcion,
  ancho = 'md',
  alCerrar,
  pie,
  children,
}: ModalProps) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    document.body.classList.add('sin-scroll');
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.classList.remove('sin-scroll');
    };
  }, [alCerrar]);

  const claseAncho = ancho === 'md' ? '' : ` modal-${ancho}`;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className={`modal${claseAncho}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal-head">
          <div className="stack-sm">
            <h2 className="title-card">{titulo}</h2>
            {descripcion && <p className="text-sm muted">{descripcion}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={alCerrar}>
            <X size={18} />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {pie && <footer className="modal-foot">{pie}</footer>}
      </div>
    </div>
  );
}
