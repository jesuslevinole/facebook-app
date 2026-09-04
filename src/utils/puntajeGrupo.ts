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
   que ya conoce.

   Todo se calcula con las publicaciones de UN vendedor. Dos personas del
   mismo equipo pueden tener rutas distintas para los mismos grupos, porque
   un grupo puede responderle a uno y no al otro: distinto horario, distinta
   forma de escribir, distinta antigüedad dentro del grupo. */

import type { Grupo, Jornada, Publicacion } from '../types';
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
  /** Hora del día en que este grupo le rindió mejor a este vendedor. */
  mejorHora: number | null;
  /** El grupo rinde en la franja horaria en que se está publicando ahora. */
  enSuHora: boolean;
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
  fecha: string,
  /** Franja de trabajo del vendedor y hora actual. Opcional: sin esto el
      puntaje ignora el horario y ordena solo por rendimiento. */
  jornada?: Jornada,
  horaActual?: number
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

    /* Interacciones acumuladas por hora de publicación: revela a qué hora
       este grupo le responde a este vendedor. */
    const porHora = new Map<number, number>();
    for (const pub of pubs) {
      const h = pub.hora ?? -1;
      if (h < 0) continue;
      const suyas = (pub.likes ?? 0) + (pub.comentarios ?? 0) + (pub.factibles ?? 0);
      porHora.set(h, (porHora.get(h) ?? 0) + suyas);
    }
    let mejorHora: number | null = null;
    let mejorValor = 0;
    for (const [h, valor] of porHora) {
      if (valor > mejorValor) {
        mejorValor = valor;
        mejorHora = h;
      }
    }

    /* Se considera "su hora" una ventana de dos horas alrededor del mejor
       registro. Más estrecho sería ruido: nadie publica siempre al minuto. */
    const dentroDeJornada =
      !jornada || horaActual === undefined
        ? true
        : jornada.horaInicio <= jornada.horaFin
          ? horaActual >= jornada.horaInicio && horaActual <= jornada.horaFin
          : horaActual >= jornada.horaInicio || horaActual <= jornada.horaFin;

    const enSuHora =
      dentroDeJornada && mejorHora !== null && horaActual !== undefined
        ? Math.abs(mejorHora - horaActual) <= 2
        : false;

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
      mejorHora,
      enSuHora,
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
    /* Publicar en la hora en que el grupo históricamente responde vale tanto
       como una diferencia grande de tamaño: es el ajuste por vendedor. */
    const porHorario = f.enSuHora ? 12 : 0;

    f.puntaje = porFactibles + porIntensidad + porTamano + porDescanso + porHorario;

    if (f.enSuHora && f.mejorHora !== null)
      f.motivo = `Responde cerca de las ${String(f.mejorHora).padStart(2, '0')}:00`;
    else if (f.ratioFactible >= 0.6)
      f.motivo = `${Math.round(f.ratioFactible * 100)}% de contactos útiles`;
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
  tope: number,
  jornada?: Jornada,
  horaActual?: number
): string[] {
  return puntuarGrupos(grupos, publicaciones, fecha, jornada, horaActual)
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
