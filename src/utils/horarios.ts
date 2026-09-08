/* A qué horas responde la gente.

   Cada publicación guarda la hora en que se hizo. Cruzando eso con las
   interacciones que dejó se obtiene el perfil horario del vendedor: no la
   hora en que más publica, sino aquella en que lo que publica rinde.

   Son cosas distintas y conviene no confundirlas. Alguien puede publicar
   veinte veces a las 8 de la mañana por costumbre y recibir todas sus
   respuestas a las 9 de la noche; el promedio por publicación lo revela,
   el conteo bruto lo esconde. */

import type { Publicacion } from '../types';

export interface FranjaHoraria {
  hora: number;
  publicaciones: number;
  interacciones: number;
  /** Interacciones por publicación en esa hora. Es lo comparable. */
  promedio: number;
}

export function resumenHorario(publicaciones: Publicacion[]): FranjaHoraria[] {
  const franjas: FranjaHoraria[] = Array.from({ length: 24 }, (_, hora) => ({
    hora,
    publicaciones: 0,
    interacciones: 0,
    promedio: 0,
  }));

  for (const p of publicaciones) {
    const h = p.hora;
    if (h === undefined || h < 0 || h > 23) continue;
    const franja = franjas[h];
    franja.publicaciones += 1;
    franja.interacciones += (p.likes ?? 0) + (p.comentarios ?? 0) + (p.factibles ?? 0);
  }

  for (const franja of franjas) {
    franja.promedio = franja.publicaciones > 0 ? franja.interacciones / franja.publicaciones : 0;
  }

  return franjas;
}

/** Las horas que mejor rinden, de más a menos. Solo con datos suficientes. */
export function mejoresHoras(publicaciones: Publicacion[], cuantas = 3): FranjaHoraria[] {
  return resumenHorario(publicaciones)
    .filter((f) => f.publicaciones >= 2 && f.interacciones > 0)
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, cuantas);
}

export function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}
