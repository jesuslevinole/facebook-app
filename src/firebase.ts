import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { configFirebase, origenConfig } from './config/entorno';

export const app = initializeApp(configFirebase);

if (import.meta.env.DEV) {
  const fuente = origenConfig === 'entorno' ? '.env' : 'src/config/firebase.config.ts';
  console.info(`[RedLink] Firebase conectado a "${configFirebase.projectId}" desde ${fuente}.`);
}

/* Caché persistente: la app sigue mostrando clientes y grupos sin señal,
   que es la mitad del sentido de que sea una PWA. */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/* Auth se resuelve de forma perezosa, no al importar este módulo.

   `getAuth()` exige que `@firebase/auth` ya haya registrado su componente
   dentro de la instancia de `@firebase/app`. Ese registro es un efecto
   secundario de importar `firebase/auth`, y cuando el bundler agrupa los
   subpaquetes en un chunk compartido el orden de evaluación no está
   garantizado: si la línea corre primero, revienta con
   "Component auth has not been registered yet".

   Llamándolo dentro de una función, la primera invocación ocurre ya montada
   la app —desde un efecto o un click—, cuando todos los módulos terminaron
   de evaluarse. Es además la forma en que la documentación de Firebase
   recomienda usar `getAuth`. */
let instanciaAuth: Auth | null = null;

export function obtenerAuth(): Auth {
  if (!instanciaAuth) instanciaAuth = getAuth(app);
  return instanciaAuth;
}
