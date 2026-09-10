/* Historial de cambios de la app.

   Cada vez que se publica una versión nueva se agrega una entrada acá. La
   campana los muestra junto a las novedades del equipo, así el vendedor se
   entera de lo que cambió sin que nadie tenga que avisarle por WhatsApp.

   La fecha es lo que decide si un aviso es "nuevo" para cada persona. */

export interface Cambio {
  version: string;
  fecha: string;
  titulo: string;
  detalle: string;
}

export const CAMBIOS: Cambio[] = [
  {
    version: '1.6',
    fecha: '2026-09-10T12:00:00.000Z',
    titulo: 'Notificaciones, imágenes y catálogo compartido',
    detalle:
      'Los grupos que agrega cualquiera ahora los ven todos. Se puede adjuntar imágenes a los mensajes y guardar el enlace de cada publicación para medirla.',
  },
  {
    version: '1.5',
    fecha: '2026-09-08T12:00:00.000Z',
    titulo: 'Interfaz móvil rehecha',
    detalle:
      'Menú completo desde el teléfono, filtros plegables y botón de acción siempre a la vista.',
  },
  {
    version: '1.4',
    fecha: '2026-09-04T12:00:00.000Z',
    titulo: 'Pipeline de clientes',
    detalle: 'Tablero de ocho etapas con arrastrar y soltar, y descanso de dos minutos entre publicaciones.',
  },
];
