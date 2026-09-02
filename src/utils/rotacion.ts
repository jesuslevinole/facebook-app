/* Motor que arma la "ruta de hoy": en qué orden conviene publicar y con qué
   mensaje, evitando patrones que Facebook lee como spam.

   Orden de grupos — puntaje, no azar puro:
     · Prioriza los grupos con más días sin publicar (el que más descansó, primero).
     · Un jitter determinista sembrado con la fecha reordena los empates,
       así el recorrido no es idéntico día a día pero sí estable dentro del día.
     · Los grupos ya publicados hoy o dentro de su cooldown caen al final.

   Plantilla por grupo:
     · Se descarta toda plantilla usada en ese grupo en los últimos N días.
     · Si no queda ninguna, gana la usada hace más tiempo en ese grupo.
     · Se evita repetir la plantilla de la publicación inmediatamente anterior,
       aunque haya sido en otro grupo (publicar el mismo texto seguido en
       varios grupos es el patrón que más rápido gatilla el filtro).
*/

import type { Ajustes, Grupo, Identidad, Parada, Plantilla, Publicacion } from '../types';
import { diasEntreClaves, horasDesde } from './fecha';
import { construirMensaje, generador, hashSemilla } from './mensaje';

const SIN_PUBLICAR = 999;

interface HistorialGrupo {
  ultima?: Publicacion;
  porPlantilla: Map<string, Publicacion>;
}

function indexarHistorial(publicaciones: Publicacion[]): Map<string, HistorialGrupo> {
  const orden = [...publicaciones].sort((a, b) => b.ts.localeCompare(a.ts));
  const mapa = new Map<string, HistorialGrupo>();
  for (const pub of orden) {
    let h = mapa.get(pub.grupoId);
    if (!h) {
      h = { porPlantilla: new Map() };
      mapa.set(pub.grupoId, h);
    }
    if (!h.ultima) h.ultima = pub;
    if (!h.porPlantilla.has(pub.plantillaId)) h.porPlantilla.set(pub.plantillaId, pub);
  }
  return mapa;
}

export function elegirPlantilla(
  grupo: Grupo,
  plantillas: Plantilla[],
  historial: HistorialGrupo | undefined,
  ultimaGlobal: Publicacion | undefined,
  ajustes: Ajustes,
  fecha: string
): Plantilla | null {
  const activas = plantillas.filter((p) => p.activo);
  if (activas.length === 0) return null;

  const antiguedad = (p: Plantilla): number => {
    const usada = historial?.porPlantilla.get(p.id);
    return usada ? diasEntreClaves(usada.fecha, fecha) : SIN_PUBLICAR;
  };

  const descansadas = activas.filter((p) => antiguedad(p) >= ajustes.diasSinRepetir);
  let candidatas = descansadas.length > 0 ? descansadas : activas;

  // No repetir la plantilla de la publicación anterior si hay alternativa.
  if (ultimaGlobal && candidatas.length > 1) {
    const sinLaUltima = candidatas.filter((p) => p.id !== ultimaGlobal.plantillaId);
    if (sinLaUltima.length > 0) candidatas = sinLaUltima;
  }

  const random = generador(hashSemilla(`${grupo.id}|${fecha}|plantilla`));
  const ordenadas = [...candidatas].sort((a, b) => {
    const dif = antiguedad(b) - antiguedad(a);
    if (dif !== 0) return dif;
    return hashSemilla(`${a.id}${fecha}`) - hashSemilla(`${b.id}${fecha}`);
  });

  // Entre las más descansadas (mismo puntaje) se elige una al azar sembrado.
  const tope = antiguedad(ordenadas[0]);
  const empatadas = ordenadas.filter((p) => antiguedad(p) === tope);
  return empatadas[Math.floor(random() * empatadas.length)] ?? ordenadas[0];
}

export function construirRuta(
  grupos: Grupo[],
  plantillas: Plantilla[],
  /** Solo las publicaciones del vendedor: la rotación es individual. */
  publicaciones: Publicacion[],
  ajustes: Ajustes,
  fecha: string,
  identidad: Identidad
): Parada[] {
  const historial = indexarHistorial(publicaciones);
  const ultimaGlobal = [...publicaciones].sort((a, b) => b.ts.localeCompare(a.ts))[0];

  const paradas: Parada[] = grupos
    .filter((g) => g.activo)
    .map((grupo) => {
      const h = historial.get(grupo.id);
      const publicadoHoy = h?.ultima?.fecha === fecha;
      const cooldown = grupo.cooldownHoras || ajustes.cooldownHorasDefault;
      const horasPasadas = h?.ultima ? horasDesde(h.ultima.ts) : SIN_PUBLICAR;
      const horasParaHabilitar = Math.max(0, cooldown - horasPasadas);
      const diasSinPublicar = h?.ultima ? diasEntreClaves(h.ultima.fecha, fecha) : null;

      const plantilla = elegirPlantilla(grupo, plantillas, h, ultimaGlobal, ajustes, fecha);
      const texto = plantilla
        ? construirMensaje(plantilla, grupo, identidad, fecha)
        : '';

      let motivo = 'Listo para publicar';
      if (publicadoHoy) motivo = 'Ya publicaste hoy acá';
      else if (horasParaHabilitar > 0) motivo = `Descansando ${Math.ceil(horasParaHabilitar)} h más`;
      else if (diasSinPublicar === null) motivo = 'Nunca has publicado acá';
      else if (diasSinPublicar >= 7) motivo = `${diasSinPublicar} días sin publicar`;

      return {
        grupo,
        plantilla,
        texto,
        publicadoHoy,
        horasParaHabilitar,
        diasSinPublicar,
        motivo,
      };
    });

  const random = generador(hashSemilla(fecha));
  const jitter = new Map(paradas.map((p) => [p.grupo.id, random() * 6]));

  return paradas.sort((a, b) => puntaje(b, jitter) - puntaje(a, jitter));
}

function puntaje(parada: Parada, jitter: Map<string, number>): number {
  if (parada.publicadoHoy) return -1000 + (parada.diasSinPublicar ?? 0);
  if (parada.horasParaHabilitar > 0) return -500 + (24 - parada.horasParaHabilitar);
  const descanso = Math.min(parada.diasSinPublicar ?? 30, 30);
  return descanso * 10 + (jitter.get(parada.grupo.id) ?? 0);
}

/** Código de atribución sugerido a partir del nombre del grupo. */
export function sugerirCodigo(nombre: string, existentes: string[]): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 3) || 'FB';

  let intento = base;
  let n = 2;
  while (existentes.includes(intento)) {
    intento = `${base}${n}`;
    n += 1;
  }
  return intento;
}
