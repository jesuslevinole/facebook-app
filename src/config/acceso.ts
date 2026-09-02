/* Modo invitado: entrar sin autenticarse, con todos los permisos.

   ───────────────────────────────────────────────────────────────
   LEE ESTO ANTES DE PONERLO EN `true` PARA PRODUCCIÓN
   ───────────────────────────────────────────────────────────────
   La app está publicada en una URL pública. Con el modo invitado activo,
   cualquiera que llegue a esa dirección entra con permisos de
   administrador: ve los RUT, direcciones y teléfonos de todos los
   clientes, y puede modificarlos o borrarlos.

   Por eso viene activo SOLO en desarrollo (`npm run dev`), donde la app
   corre en tu máquina y nadie más la alcanza.

   Además, el modo invitado no autentica contra Firebase: si ya cerraste
   las reglas de Firestore (bloque de PRODUCCIÓN en `firestore.rules`),
   el servidor rechazará todas las lecturas y la app se verá vacía. Solo
   funciona mientras las reglas estén abiertas.
   ─────────────────────────────────────────────────────────────── */

/** Cambiar a `true` habilita el botón también en la app publicada. */
const FORZAR_EN_PRODUCCION = true;

export const ACCESO_INVITADO = import.meta.env.DEV || FORZAR_EN_PRODUCCION;
