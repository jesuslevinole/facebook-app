/* Interruptores de acceso.
   Los dos son temporales y están pensados para la puesta en marcha. */

/* ───────────────────────────────────────────────────────────────
   1 · SALTAR EL LOGIN

   Con `true`, la app entra directo con permisos de administrador y no
   muestra la pantalla de acceso. Sirve para la configuración inicial:
   crear los roles, dar de alta al equipo y cargar grupos y mensajes.

   Requiere que las reglas de Firestore estén en la OPCIÓN A (abiertas),
   porque sin sesión el servidor rechaza cualquier lectura o escritura.

   Cuando termines de configurar, vuelve a ponerlo en `false` y publica
   las reglas de la OPCIÓN B o C. Mientras esté en `true`, cualquiera con
   la URL entra como administrador.
   ─────────────────────────────────────────────────────────────── */
export const SALTAR_LOGIN = false;

/* ───────────────────────────────────────────────────────────────
   2 · BOTÓN "ENTRAR SIN SESIÓN"

   Agrega un botón en la pantalla de acceso que entra con sesión anónima
   de Firebase y permisos totales. A diferencia del interruptor de
   arriba, esto sí autentica, así que funciona con las reglas de la
   OPCIÓN B (`request.auth != null`).

   Activo siempre en desarrollo. Para la app publicada, cambia la
   constante de abajo.
   ─────────────────────────────────────────────────────────────── */
const FORZAR_EN_PRODUCCION = true;

export const ACCESO_INVITADO = import.meta.env.DEV || FORZAR_EN_PRODUCCION;
