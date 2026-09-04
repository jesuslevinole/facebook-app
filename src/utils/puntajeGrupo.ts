/* Puntaje de cada grupo y armado automático de la ruta.

   Criterios, en el orden de peso que pidió el negocio:

   1. Proporción de contactos aprovechables. Un grupo que trae diez consultas
      que no se pueden cerrar vale menos que uno que trae dos que sí. Este es
      el criterio dominante.
   2. Interacción por publicación: likes, comentarios y contactos sumados,
      divididos por las veces que se publicó ahí.
   3. Tamaño del grupo. Pesa poco a propósito: un grupo enorme donde nadie
      responde no sirve, y sin este freno los grandes taparían a los buenos.

   Y una regla de descarte: diez publicaciones sin una sola interacción
   significa que ese grupo no funciona para nosotros. Sale de la ruta.

   Los grupos sin historial no se castigan por no tener datos — reciben un
   puntaje de exploración para que entren y se puedan evaluar. Si no, un
   grupo nuevo nunca se probaría y el sistema se quedaría encerrado en los
   que ya conoce. */

import type { Grupo, Publicacion } from '../types';
import { diasEntreClaves } from './fecha';

/** Publicaciones sin interacción tras las cuales el grupo se descarta. */
export const UMBRAL_DESCARTE = 10;

export interface PuntajeGrupo {
  grupo: Grupo;
  publicaciones: number;
  likes: number;
  comentarios: number;
  factibles: number;
  noFactibles: number;
  interacciones: number;
  /** Interacciones por publicación. */
  intensidad: number;
  /** Aprovechables sobre el total de contactos. 0 si nunca hubo contactos. */
  ratioFactible: number;
  diasSinPublicar: number | null;
  /** Grupo agotado: mucho publicado, ninguna respuesta. */
  descartado: boolean;
  /** Sin datos suficientes para juzgarlo todavía. */
  porProbar: boolean;
  puntaje: number;
  motivo: string;
}

export function puntuarGrupos(
  grupos: Grupo[],
  publicaciones: Publicacion[],
  fecha: string
): PuntajeGrupo[] {
  const topeMiembros = Math.max(1, ...grupos.map((g) => g.miembros || 0));

  const filas = grupos.map((grupo) => {
    const pubs = publicaciones.filter((p) => p.grupoId === grupo.id);

    const likes = suma(pubs, (p) => p.likes);
    const comentarios = suma(pubs, (p) => p.comentarios);
    const factibles = suma(pubs, (p) => p.factibles);
    const noFactibles = suma(pubs, (p) => p.noFactibles);
    const contactos = factibles + noFactibles;
    const interacciones = likes + comentarios + contactos;

    const intensidad = pubs.length > 0 ? interacciones / pubs.length : 0;
    const ratioFactible = contactos > 0 ? factibles / contactos : 0;

    const ultima = pubs.map((p) => p.fecha).sort().pop() ?? null;
    const diasSinPublicar = ultima ? diasEntreClaves(ultima, fecha) : null;

    const descartado = pubs.length >= UMBRAL_DESCARTE && interacciones === 0;
    const porProbar = pubs.length < 3;

    return {
      grupo,
      publicaciones: pubs.length,
      likes,
      comentarios,
      factibles,
      noFactibles,
      interacciones,
      intensidad,
      ratioFactible,
      diasSinPublicar,
      descartado,
      porProbar,
      puntaje: 0,
      motivo: '',
    };
  });

  const topeIntensidad = Math.max(0.001, ...filas.map((f) => f.intensidad));

  for (const f of filas) {
    if (f.descartado) {
      f.puntaje = -1;
      f.motivo = `${f.publicaciones} publicaciones sin ninguna interacción`;
      continue;
    }

    if (f.porProbar) {
      /* Puntaje intermedio: entra a la ruta para poder medirlo, pero no le
         gana a un grupo que ya demostró que responde. */
      f.puntaje = 45 + normalizar(f.grupo.miembros || 0, topeMiembros) * 10;
      f.motivo = f.publicaciones === 0 ? 'Sin estrenar' : 'En evaluación';
      continue;
    }

    const porFactibles = f.ratioFactible * 55;
    const porIntensidad = normalizar(f.intensidad, topeIntensidad) * 30;
    const porTamano = normalizar(f.grupo.miembros || 0, topeMiembros) * 10;
    /* Un empujón pequeño a los que llevan días sin recibir nada, para que la
       ruta no se reduzca siempre a los mismos cinco grupos. */
    const porDescanso = Math.min(f.diasSinPublicar ?? 0, 14) * 0.4;

    f.puntaje = porFactibles + porIntensidad + porTamano + porDescanso;

    if (f.ratioFactible >= 0.6) f.motivo = `${Math.round(f.ratioFactible * 100)}% de contactos útiles`;
    else if (f.intensidad >= 1) f.motivo = `${f.intensidad.toFixed(1)} interacciones por publicación`;
    else if (f.interacciones === 0) f.motivo = 'Todavía sin interacciones';
    else f.motivo = `${f.interacciones} interacciones acumuladas`;
  }

  return filas.sort((a, b) => b.puntaje - a.puntaje);
}

/** Ids de los grupos que entran en la ruta de hoy, ya ordenados. */
export function armarRutaAutomatica(
  grupos: Grupo[],
  publicaciones: Publicacion[],
  fecha: string,
  tope: number
): string[] {
  return puntuarGrupos(grupos, publicaciones, fecha)
    .filter((f) => !f.descartado && f.grupo.activo)
    .slice(0, tope)
    .map((f) => f.grupo.id);
}

function suma(pubs: Publicacion[], leer: (p: Publicacion) => number | undefined): number {
  return pubs.reduce((total, p) => total + (leer(p) ?? 0), 0);
}

function normalizar(valor: number, tope: number): number {
  if (tope <= 0) return 0;
  return Math.min(1, valor / tope);
}
