/* Mensajes de arranque. Cada bloque {a|b|c} se resuelve distinto según grupo
   y día, así que dos publicaciones nunca salen idénticas aunque usen la misma
   plantilla. Se cargan una sola vez desde Ajustes y después se editan libre. */

import type { Plantilla } from '../types';

export const PLANTILLAS_BASE: Omit<Plantilla, 'id' | 'createdAt'>[] = [
  {
    titulo: 'Oferta directa · fibra',
    tono: 'oferta',
    activo: true,
    cuerpo:
      '{Hola|Buenas|Qué tal} vecinos {de {comuna}|del grupo|por acá} 👋\n\n' +
      '{Estoy instalando|Tengo disponible|Estoy trabajando con} planes de {fibra óptica|internet fibra} de Claro y VTR {en el sector|en la zona|por el barrio}.\n\n' +
      '• {600 megas simétricos|Fibra 600 megas|600 megas reales}\n' +
      '• {Instalación sin costo|Instalación gratis|Sin costo de instalación}\n' +
      '• {Router WiFi 6 incluido|WiFi 6 incluido|Equipo WiFi 6 incluido}\n\n' +
      '{Escríbeme por interno|Mándame un mensaje al privado|Comenta y te escribo} y te paso los valores {actualizados|de este mes|vigentes}. ' +
      'Menciona el código {codigo} para ubicarte al tiro.\n\n{vendedor} · {telefono}',
  },
  {
    titulo: 'Pregunta abierta · dolor de conexión',
    tono: 'pregunta',
    activo: true,
    cuerpo:
      '¿A alguien más {se le cae el internet|le anda lento el internet|se le corta el WiFi} {en las tardes|cuando todos están en casa|a la hora peak}? 🤔\n\n' +
      '{Trabajo con|Manejo} los planes de fibra de Claro y VTR y {en {comuna} ya hay cobertura|la cobertura por acá está buena|en el sector hay disponibilidad}.\n\n' +
      '{Si quieres que revise tu dirección|Si quieres saber si llega a tu casa|Para revisar factibilidad}, {escríbeme|comenta acá|mándame un privado} con el código {codigo} y te digo altiro.\n\n{vendedor}',
  },
  {
    titulo: 'Comparación Claro / VTR',
    tono: 'directo',
    activo: true,
    cuerpo:
      '{Claro o VTR|VTR o Claro}: {cuál conviene|cuál sale mejor} depende de tu dirección, no del precio de la publicidad.\n\n' +
      '{Reviso las dos|Trabajo con las dos compañías|Cotizo ambas} y te digo {cuál llega mejor a tu casa|cuál tiene mejor señal en tu calle}, {sin compromiso|sin costo}.\n\n' +
      '{Mándame|Envíame|Pásame} tu {dirección|calle y número} por interno y {te respondo hoy|te contesto en el día}. Código {codigo}.\n\n{vendedor} · {telefono}',
  },
  {
    titulo: 'Testimonio de instalación',
    tono: 'testimonio',
    activo: true,
    cuerpo:
      '{Instalación lista|Otra instalación lista|Cliente feliz} {en {comuna}|por el sector} {esta semana|estos días} ✅\n\n' +
      '{Fibra de 600 megas|600 megas de fibra}, {instalada en 48 horas|con visita técnica en 2 días|instalada al tiro}.\n\n' +
      '{Si andas buscando cambiarte|Si estás pensando en cambiar de compañía|Si te quieres cambiar}, {escríbeme|mándame un mensaje} y {vemos qué plan te sirve|revisamos qué te conviene}. Código {codigo}.\n\n{vendedor}',
  },
  {
    titulo: 'Cierre de mes',
    tono: 'urgencia',
    activo: true,
    cuerpo:
      '{Aviso rápido|Dato para {comuna}|Atención vecinos} 📢\n\n' +
      'Las {promociones|ofertas} de fibra {se cierran a fin de mes|cambian el día 1|van hasta que termine el mes} y {la instalación va sin costo|la instalación queda gratis} en los contratos de {esta semana|estos días}.\n\n' +
      '{Si te interesa|Si lo estabas pensando}, {escríbeme por interno|mándame un privado} con tu dirección y {te confirmo factibilidad hoy|reviso si llega a tu casa}. Código {codigo}.\n\n{vendedor} · {telefono}',
  },
];
