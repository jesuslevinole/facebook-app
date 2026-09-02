import type { CSSProperties, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import './Tarjetas.css';

/* ---------- Tarjeta de indicador ---------- */

interface TarjetaKpiProps {
  titulo: string;
  valor: string | number;
  icono: LucideIcon;
  variacion?: number | null;
  pie?: string;
}

export function TarjetaKpi({ titulo, valor, icono: Icono, variacion = null, pie }: TarjetaKpiProps) {
  const sube = (variacion ?? 0) >= 0;
  return (
    <article className="kpi card">
      <header className="kpi-head">
        <h3 className="kpi-title">{titulo}</h3>
        <span className="kpi-icon">
          <Icono size={17} />
        </span>
      </header>
      <p className="kpi-value num">{valor}</p>
      <footer className="kpi-foot">
        {variacion !== null && (
          <span className={`kpi-delta${sube ? ' up' : ' down'}`}>
            {sube ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
        {pie && <span className="kpi-note">{pie}</span>}
      </footer>
    </article>
  );
}

/* ---------- Dona ---------- */

export interface SegmentoDona {
  etiqueta: string;
  valor: number;
  color: string;
}

interface DonaProps {
  titulo: string;
  total: string | number;
  subtitulo?: string;
  segmentos: SegmentoDona[];
}

export function TarjetaDona({ titulo, total, subtitulo, segmentos }: DonaProps) {
  const suma = segmentos.reduce((t, s) => t + s.valor, 0);
  const radio = 46;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <article className="dona card">
      <header className="dona-head">
        <h3 className="kpi-title">{titulo}</h3>
        <p className="dona-total num">{total}</p>
        {subtitulo && <p className="kpi-note">{subtitulo}</p>}
      </header>

      <div className="dona-cuerpo">
        <ul className="dona-leyenda">
          {segmentos.map((s) => (
            <li key={s.etiqueta} className="dona-item">
              <span className="dot" style={{ '--dot-color': s.color } as CSSProperties} />
              <span className="dona-pct num">
                {suma ? Math.round((s.valor / suma) * 100) : 0}%
              </span>
              <span className="dona-etiqueta truncate">{s.etiqueta}</span>
            </li>
          ))}
        </ul>

        <svg className="dona-svg" viewBox="0 0 120 120" role="img" aria-label={titulo}>
          <circle className="dona-pista" cx="60" cy="60" r={radio} />
          {suma > 0 &&
            segmentos.map((s) => {
              const largo = (s.valor / suma) * circunferencia;
              const offset = -acumulado;
              acumulado += largo;
              if (s.valor === 0) return null;
              return (
                <circle
                  key={s.etiqueta}
                  className="dona-arco"
                  cx="60"
                  cy="60"
                  r={radio}
                  stroke={s.color}
                  strokeDasharray={`${largo} ${circunferencia - largo}`}
                  strokeDashoffset={offset}
                />
              );
            })}
        </svg>
      </div>
    </article>
  );
}

/* ---------- Barras ---------- */

export interface BarraDato {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
}

interface BarrasProps {
  titulo: string;
  datos: BarraDato[];
  acciones?: ReactNode;
  sufijo?: string;
}

export function TarjetaBarras({ titulo, datos, acciones, sufijo = '' }: BarrasProps) {
  const tope = Math.max(1, ...datos.map((d) => d.valor));
  const marcas = [tope, Math.round(tope * 0.66), Math.round(tope * 0.33), 0];

  return (
    <article className="barras card">
      <header className="card-head">
        <h3 className="title-card">{titulo}</h3>
        {acciones}
      </header>

      <div className="barras-area">
        <ul className="barras-eje">
          {marcas.map((m, i) => (
            <li key={`${m}-${i}`} className="barras-marca">
              {m}
              {sufijo}
            </li>
          ))}
        </ul>

        <ul className="barras-lista">
          {datos.map((d) => (
            <li key={d.etiqueta} className="barra-col">
              <span className="barra-valor num">{d.valor || ''}</span>
              <span
                className={`barra${d.destacado ? ' hoy' : ''}`}
                style={{ '--altura': `${(d.valor / tope) * 100}%` } as CSSProperties}
              />
              <span className="barra-label">{d.etiqueta}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
