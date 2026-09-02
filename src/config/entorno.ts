/* Credenciales de Firebase en uso.

   Prioridad: variables de entorno (`.env`) si existen; si no, los valores de
   `firebase.config.ts`. El respaldo en archivo garantiza que la app arranque
   aunque no haya `.env`, que es el caso normal en este proyecto. */

import { CONFIG_POR_DEFECTO } from './firebase.config';

export interface ConfigFirebase {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const entorno = import.meta.env;

function resolver(variable: string | undefined, respaldo: string): string {
  const desdeEntorno = (variable ?? '').trim();
  return desdeEntorno || respaldo;
}

export const configFirebase: ConfigFirebase = {
  apiKey: resolver(entorno.VITE_FB_API_KEY, CONFIG_POR_DEFECTO.apiKey),
  authDomain: resolver(entorno.VITE_FB_AUTH_DOMAIN, CONFIG_POR_DEFECTO.authDomain),
  projectId: resolver(entorno.VITE_FB_PROJECT_ID, CONFIG_POR_DEFECTO.projectId),
  storageBucket: resolver(entorno.VITE_FB_STORAGE_BUCKET, CONFIG_POR_DEFECTO.storageBucket),
  messagingSenderId: resolver(
    entorno.VITE_FB_MESSAGING_SENDER_ID,
    CONFIG_POR_DEFECTO.messagingSenderId
  ),
  appId: resolver(entorno.VITE_FB_APP_ID, CONFIG_POR_DEFECTO.appId),
};

/** De dónde salieron las credenciales en uso. Se registra en la consola. */
export const origenConfig: 'entorno' | 'archivo' = (entorno.VITE_FB_PROJECT_ID ?? '').trim()
  ? 'entorno'
  : 'archivo';
