import { Search, X } from 'lucide-react';

interface Props {
  valor: string;
  alCambiar: (valor: string) => void;
  marcador: string;
}

/** Campo de búsqueda de texto. Mismo aspecto en todos los módulos. */
export default function CampoBusqueda({ valor, alCambiar, marcador }: Props) {
  return (
    <div className="search-wrap">
      <span className="search-icon">
        <Search size={16} />
      </span>
      <input
        className="input"
        type="search"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={marcador}
      />
      {valor && (
        <button
          type="button"
          className="search-limpiar"
          onClick={() => alCambiar('')}
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
