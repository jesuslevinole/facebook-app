import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import './PanelFiltros.css';

interface Props {
  /** Campo de búsqueda: en móvil queda siempre visible, es lo más usado. */
  busqueda: ReactNode;
  /** Selectores y chips: en móvil se pliegan detrás del botón «Filtros». */
  children: ReactNode;
  /** Cuántos filtros hay puestos, para avisarlo sin tener que abrir. */
  activos: number;
  /** Acción principal de la vista (Nuevo cliente, Nuevo grupo…). */
  accion?: ReactNode;
}

/* En escritorio todo va en una fila. En móvil los selectores apilados comían
   media pantalla antes de mostrar un solo dato, así que se pliegan: queda la
   búsqueda, un botón que dice cuántos filtros hay puestos, y la acción. */
export default function PanelFiltros({ busqueda, children, activos, accion }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="panel-filtros">
      <div className="pf-linea">
        <div className="pf-busqueda">{busqueda}</div>

        <button
          type="button"
          className={`pf-toggle${activos > 0 ? ' con-filtros' : ''}`}
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
        >
          {abierto ? <X size={16} /> : <SlidersHorizontal size={16} />}
          Filtros
          {activos > 0 && <span className="pf-conteo">{activos}</span>}
        </button>

        {accion && <div className="pf-accion">{accion}</div>}
      </div>

      <div className={`pf-campos${abierto ? ' abierto' : ''}`}>{children}</div>
    </div>
  );
}
