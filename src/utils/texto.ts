/* Comparación de texto para búsquedas.

   Ignora tildes y mayúsculas porque nadie escribe "Ñuñoa" con la ñ cuando
   está apurado, y un buscador que exige la tilde exacta no sirve de nada.
   Antes esta lógica vivía duplicada dentro de Buscador.tsx. */

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** True si todas las palabras de la búsqueda aparecen en el contenido. */
export function coincide(contenido: string, busqueda: string): boolean {
  const objetivo = normalizar(contenido);
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  return palabras.every((p) => objetivo.includes(p));
}
