import type { ReactNode } from 'react';
import './BotonFlotante.css';

interface Props {
  alPulsar: () => void;
  etiqueta: string;
  icono: ReactNode;
}

/* Acción principal de cada vista en móvil.

   En pantalla chica el botón «Nuevo …» quedaba enterrado entre los filtros
   y había que scrollear para encontrarlo. Acá está siempre a la vista, sobre
   la barra inferior y al alcance del pulgar. */
export default function BotonFlotante({ alPulsar, etiqueta, icono }: Props) {
  return (
    <button type="button" className="fab" onClick={alPulsar} aria-label={etiqueta}>
      {icono}
      <span className="fab-texto">{etiqueta}</span>
    </button>
  );
}
