/* Efectividad de cada mensaje.

   Los clientes no guardan qué plantilla vieron: guardan de qué grupo
   llegaron. La atribución se reconstruye así: para cada cliente con grupo
   de origen, se busca la última publicación hecha en ese grupo antes de que
   el cliente se registrara, y se le acredita a esa plantilla.

   Es una aproximación, no una verdad exacta — alguien puede escribir tres
   días después de ver la publicación, o haber visto una anterior. Sirve
   para comparar plantillas entre sí, que es para lo que se usa; no para
   afirmar que un mensaje trajo exactamente N clientes. */

import type { Cliente, Plantilla, Publicacion } from '../types';

export interface Efectividad {
  plantillaId: string;
  usos: number;
  clientes: number;
  instalados: number;
  /** Clientes por publicación. Es la cifra que permite comparar. */
  rendimiento: number;
  /** Fecha de la última vez que se usó. */
  ultimoUso: string | null;
}

export function calcularEfectividad(
  plantillas: Plantilla[],
  publicaciones: Publicacion[],
  clientes: Cliente[]
): Map<string, Efectividad> {
  const mapa = new Map<string, Efectividad>();

  for (const p of plantillas) {
    mapa.set(p.id, {
      plantillaId: p.id,
      usos: 0,
      clientes: 0,
      instalados: 0,
      rendimiento: 0,
      ultimoUso: null,
    });
  }

  /* Publicaciones agrupadas por grupo y ordenadas de la más nueva a la más
     vieja: así el primer elemento anterior a una fecha es el que buscamos. */
  const porGrupo = new Map<string, Publicacion[]>();
  for (const pub of publicaciones) {
    const fila = mapa.get(pub.plantillaId);
    if (fila) {
      fila.usos += 1;
      if (!fila.ultimoUso || pub.fecha > fila.ultimoUso) fila.ultimoUso = pub.fecha;
    }
    const lista = porGrupo.get(pub.grupoId) ?? [];
    lista.push(pub);
    porGrupo.set(pub.grupoId, lista);
  }
  for (const lista of porGrupo.values()) lista.sort((a, b) => b.ts.localeCompare(a.ts));

  for (const cliente of clientes) {
    if (!cliente.grupoId) continue;
    const lista = porGrupo.get(cliente.grupoId);
    if (!lista) continue;

    const anterior = lista.find((p) => p.ts <= cliente.createdAt);
    if (!anterior) continue;

    const fila = mapa.get(anterior.plantillaId);
    if (!fila) continue;
    fila.clientes += 1;
    if (cliente.estado === 'instalado') fila.instalados += 1;
  }

  for (const fila of mapa.values()) {
    fila.rendimiento = fila.usos > 0 ? fila.clientes / fila.usos : 0;
  }

  return mapa;
}

/** Fila vacía, para plantillas que aún no se han usado. */
export const EFECTIVIDAD_VACIA: Omit<Efectividad, 'plantillaId'> = {
  usos: 0,
  clientes: 0,
  instalados: 0,
  rendimiento: 0,
  ultimoUso: null,
};
