/* Construcción del texto que se copia al portapapeles.
   Dos mecanismos combinados para que nunca se publique dos veces lo mismo:

   1. Variables: {codigo} {grupo} {comuna} {vendedor} {telefono} {fecha}
   2. Spintax:   {Hola|Buenas|Qué tal} -> elige una opción

   La elección es *determinista* con semilla `grupoId + fecha + plantillaId`.
   Eso importa: lo que se ve en pantalla es exactamente lo que se copia,
   y si se recarga la app el texto no cambia a mitad de jornada. */

import type { Grupo, Plantilla } from '../types';

/** Hash estable de string a entero de 32 bits. */
export function hashSemilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinista (mulberry32). */
export function generador(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Resuelve grupos {a|b|c}, incluidos los anidados, de adentro hacia afuera. */
export function resolverSpintax(texto: string, random: () => number): string {
  const bloque = /\{([^{}]*\|[^{}]*)\}/;
  let salida = texto;
  let vueltas = 0;
  while (bloque.test(salida) && vueltas < 40) {
    salida = salida.replace(bloque, (_m, cuerpo: string) => {
      const opciones = cuerpo.split('|');
      return opciones[Math.floor(random() * opciones.length)] ?? '';
    });
    vueltas += 1;
  }
  return salida;
}

export interface VariablesMensaje {
  codigo: string;
  grupo: string;
  comuna: string;
  vendedor: string;
  telefono: string;
}

export function aplicarVariables(texto: string, vars: VariablesMensaje): string {
  const mapa: Record<string, string> = {
    codigo: vars.codigo,
    grupo: vars.grupo,
    comuna: vars.comuna,
    vendedor: vars.vendedor,
    telefono: vars.telefono,
  };
  return texto.replace(/\{(codigo|grupo|comuna|vendedor|telefono)\}/g, (_m, clave: string) =>
    mapa[clave] ?? ''
  );
}

/** Cuenta cuántas combinaciones distintas puede producir una plantilla. */
export function combinaciones(texto: string): number {
  const bloques = texto.match(/\{[^{}]*\|[^{}]*\}/g) ?? [];
  return bloques.reduce((total, b) => total * b.slice(1, -1).split('|').length, 1);
}

/** Texto final listo para pegar en Facebook. */
export function construirMensaje(
  plantilla: Plantilla,
  grupo: Grupo,
  vars: Omit<VariablesMensaje, 'codigo' | 'grupo' | 'comuna'>,
  fecha: string
): string {
  const random = generador(hashSemilla(`${grupo.id}|${fecha}|${plantilla.id}`));
  const conVariantes = resolverSpintax(plantilla.cuerpo, random);
  return aplicarVariables(conVariantes, {
    codigo: grupo.codigo,
    grupo: grupo.nombre,
    comuna: grupo.comuna,
    vendedor: vars.vendedor,
    telefono: vars.telefono,
  }).trim();
}
