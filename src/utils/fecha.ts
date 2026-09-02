/* Todos los cortes diarios de la app usan la fecha local de Chile,
   no la del dispositivo ni UTC. Un teléfono en roaming no debe cambiar
   qué cuenta como "hoy". */

const ZONA = 'America/Santiago';

/** YYYY-MM-DD en hora de Chile. */
export function fechaClave(fecha: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
  return partes;
}

export function hoy(): string {
  return fechaClave();
}

export function claveMenos(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return fechaClave(d);
}

/** Clave YYYY-MM de hoy en Chile. */
export function mesActual(): string {
  return hoy().slice(0, 7);
}

/** "lunes, 3 de agosto" */
export function fechaLarga(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fecha);
}

/** "14:32" */
export function horaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "03/08" para ejes de gráficos. */
export function diaMes(clave: string): string {
  const [, m, d] = clave.split('-');
  return `${d}/${m}`;
}

export function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

export function diasEntreClaves(desde: string, hasta: string): number {
  const a = new Date(`${desde}T12:00:00`);
  const b = new Date(`${hasta}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 864e5);
}

/** Últimas N claves de día, de la más antigua a hoy. */
export function ultimosDias(n: number): string[] {
  return Array.from({ length: n }, (_, i) => claveMenos(n - 1 - i));
}
