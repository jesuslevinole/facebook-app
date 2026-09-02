import { useMemo, type CSSProperties } from 'react';
import { CheckCircle2, Megaphone, Target, Users } from 'lucide-react';
import { TarjetaBarras, TarjetaDona, TarjetaKpi, type BarraDato } from '../components/Tarjetas';
import type { Vista } from '../components/Navegacion';
import type { Ajustes, Cliente, Grupo, Publicacion } from '../types';
import { claveMenos, diaMes, hoy, mesActual, ultimosDias } from '../utils/fecha';
import './VistaPanel.css';

interface Props {
  /** Ya filtrados según el alcance del rol. */
  clientes: Cliente[];
  grupos: Grupo[];
  publicaciones: Publicacion[];
  ajustes: Ajustes;
  cargando: boolean;
  /** 'equipo' = el rol ve las cifras de todos; 'propio' = solo las suyas. */
  alcance: 'equipo' | 'propio';
  alIrA: (vista: Vista) => void;
}

const ESTADO_CLASE: Record<string, string> = {
  nuevo: 'blue',
  contactado: 'violet',
  agendado: 'amber',
  instalado: 'green',
  perdido: 'red',
};

function mesAnterior(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function variacion(actual: number, previo: number): number | null {
  if (previo === 0) return actual > 0 ? 100 : null;
  return ((actual - previo) / previo) * 100;
}

export default function VistaPanel({
  clientes,
  grupos,
  publicaciones,
  ajustes,
  cargando,
  alcance,
  alIrA,
}: Props) {
  const fecha = hoy();
  const mes = mesActual();
  const previo = mesAnterior();
  const hace30 = claveMenos(30);

  const metricas = useMemo(() => {
    const delMes = clientes.filter((c) => c.createdAt.startsWith(mes));
    const delMesPrevio = clientes.filter((c) => c.createdAt.startsWith(previo));
    const instaladosMes = delMes.filter((c) => c.estado === 'instalado');
    const instaladosPrevio = delMesPrevio.filter((c) => c.estado === 'instalado');
    const pubsHoy = publicaciones.filter((p) => p.fecha === fecha);
    const pubsAyer = publicaciones.filter((p) => p.fecha === claveMenos(1));
    const pubs30 = publicaciones.filter((p) => p.fecha >= hace30);
    const clientes30 = clientes.filter((c) => c.createdAt.slice(0, 10) >= hace30);

    return {
      delMes: delMes.length,
      varClientes: variacion(delMes.length, delMesPrevio.length),
      instalados: instaladosMes.length,
      varInstalados: variacion(instaladosMes.length, instaladosPrevio.length),
      pubsHoy: pubsHoy.length,
      varPubs: variacion(pubsHoy.length, pubsAyer.length),
      rendimiento: pubs30.length ? clientes30.length / pubs30.length : 0,
      grupos30: new Set(pubs30.map((p) => p.grupoId)).size,
    };
  }, [clientes, publicaciones, mes, previo, fecha, hace30]);

  const porCompania = useMemo(() => {
    const claro = clientes.filter((c) => c.compania === 'Claro').length;
    const vtr = clientes.filter((c) => c.compania === 'VTR').length;
    return [
      { etiqueta: 'Claro', valor: claro, color: 'var(--c2)' },
      { etiqueta: 'VTR', valor: vtr, color: 'var(--c1)' },
    ];
  }, [clientes]);

  const porEstado = useMemo(() => {
    const contar = (estado: string) => clientes.filter((c) => c.estado === estado).length;
    return [
      { etiqueta: 'Instalados', valor: contar('instalado'), color: 'var(--c3)' },
      { etiqueta: 'Agendados', valor: contar('agendado'), color: 'var(--c2)' },
      { etiqueta: 'En conversación', valor: contar('contactado') + contar('nuevo'), color: 'var(--c1)' },
      { etiqueta: 'Perdidos', valor: contar('perdido'), color: 'var(--c5)' },
    ];
  }, [clientes]);

  const barras: BarraDato[] = useMemo(() => {
    const dias = ultimosDias(14);
    return dias.map((clave) => ({
      etiqueta: diaMes(clave),
      valor: publicaciones.filter((p) => p.fecha === clave).length,
      destacado: clave === fecha,
    }));
  }, [publicaciones, fecha]);

  const topGrupos = useMemo(() => {
    const filas = grupos.map((g) => ({
      grupo: g,
      clientes: clientes.filter((c) => c.grupoId === g.id).length,
      publicaciones: publicaciones.filter((p) => p.grupoId === g.id && p.fecha >= hace30).length,
    }));
    const tope = Math.max(1, ...filas.map((f) => f.clientes));
    return filas
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 5)
      .map((f) => ({ ...f, porcentaje: (f.clientes / tope) * 100 }));
  }, [grupos, clientes, publicaciones, hace30]);

  const ultimos = clientes.slice(0, 6);
  const nombreGrupo = (id: string | null) =>
    id ? grupos.find((g) => g.id === id)?.nombre ?? 'Grupo eliminado' : 'Sin grupo';

  if (cargando) {
    return (
      <div className="grid grid-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  const sufijo = alcance === 'equipo' ? 'del equipo' : 'tuyos';

  return (
    <div className="panel">
      <section className="grid grid-4">
        <TarjetaKpi
          titulo={`Clientes del mes ${sufijo}`}
          valor={metricas.delMes}
          icono={Users}
          variacion={metricas.varClientes}
          pie="vs. mes anterior"
        />
        <TarjetaKpi
          titulo="Instalados"
          valor={metricas.instalados}
          icono={CheckCircle2}
          variacion={metricas.varInstalados}
          pie="vs. mes anterior"
        />
        <TarjetaKpi
          titulo="Publicaciones hoy"
          valor={`${metricas.pubsHoy}/${ajustes.metaDiaria}`}
          icono={Megaphone}
          variacion={metricas.varPubs}
          pie="vs. ayer"
        />
        <TarjetaKpi
          titulo="Clientes por publicación"
          valor={metricas.rendimiento.toFixed(2)}
          icono={Target}
          pie={`${metricas.grupos30} grupos activos en 30 días`}
        />
      </section>

      <section className="grid grid-2 panel-donas">
        <TarjetaDona
          titulo="Clientes por compañía"
          total={clientes.length}
          subtitulo="Total registrado"
          segmentos={porCompania}
        />
        <TarjetaDona
          titulo="Estado de la cartera"
          total={porEstado[0].valor}
          subtitulo="Instalados a la fecha"
          segmentos={porEstado}
        />
      </section>

      <section className="panel-medio">
        <TarjetaBarras titulo="Publicaciones por día" datos={barras} />

        <article className="card">
          <header className="card-head">
            <h3 className="title-card">Grupos que más traen</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => alIrA('grupos')}>
              Ver todos
            </button>
          </header>

          {topGrupos.length === 0 ? (
            <p className="text-sm muted">Agrega grupos para medir de dónde llegan tus clientes.</p>
          ) : (
            <ul className="top-grupos">
              {topGrupos.map((f) => (
                <li key={f.grupo.id} className="top-grupo">
                  <div className="row row-between">
                    <span className="text-sm truncate">{f.grupo.nombre}</span>
                    <span className="num text-sm">{f.clientes}</span>
                  </div>
                  <div className="progress">
                    <span
                      className="progress-fill"
                      style={{ '--fill': `${f.porcentaje}%` } as CSSProperties}
                    />
                  </div>
                  <span className="text-sm muted-soft">
                    {f.publicaciones} publicaciones en 30 días · código {f.grupo.codigo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="card card-flush">
        <header className="card-head card-head-flush">
          <h3 className="title-card">Últimos clientes</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => alIrA('clientes')}>
            Ver todos
          </button>
        </header>

        {ultimos.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Sin clientes todavía</p>
            <p className="text-sm muted">Los que registres aparecerán acá.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Comuna</th>
                  <th>Origen</th>
                  <th>Plan</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="row">
                        <span className="avatar">
                          {c.nombre[0]}
                          {c.apellido[0]}
                        </span>
                        <span className="truncate">
                          {c.nombre} {c.apellido}
                        </span>
                      </div>
                    </td>
                    <td className="muted">{c.comuna}</td>
                    <td className="muted truncate">{nombreGrupo(c.grupoId)}</td>
                    <td className="muted">{c.compania}</td>
                    <td>
                      <span className={`badge ${ESTADO_CLASE[c.estado] ?? 'blue'}`}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
