/* Avisos que ve todo el equipo.

   Se escriben cuando alguien agrega un grupo, un cliente o un mensaje, y
   también para anunciar cambios del sistema. Son de solo lectura: nadie los
   edita, solo se acumulan.

   Lo leído se guarda por usuario en el propio dispositivo, no en Firestore:
   marcar como leído en cada apertura sería una escritura por vista, y en el
   plan Spark las escrituras son el recurso escaso. */

export type TipoNovedad = 'grupo' | 'cliente' | 'mensaje' | 'sistema' | 'publicacion';

export interface Novedad {
  id: string;
  tipo: TipoNovedad;
  titulo: string;
  detalle: string;
  /** Quién la generó. Vacío en los avisos del sistema. */
  uid: string;
  autorNombre: string;
  ts: string;
}
