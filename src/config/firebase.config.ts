/* Credenciales del proyecto Firebase.

   Sí, van en el código a propósito. La configuración web de Firebase no es
   secreta: viaja igual al navegador de cualquiera que abra la app, se puede
   leer con Ctrl+U. Lo que protege los datos son las reglas de Firestore
   (`firestore.rules`), no esconder estos valores.

   Tenerlas acá evita que la app deje de funcionar porque el `.env` se llamó
   `.env.txt` o quedó en la carpeta equivocada.

   El `.env` sigue teniendo prioridad si existe (ver `entorno.ts`), así que
   apuntar a otro proyecto —uno de pruebas, por ejemplo— es solo crearlo. */

import type { ConfigFirebase } from './entorno';

export const CONFIG_POR_DEFECTO: ConfigFirebase = {
  apiKey: 'AIzaSyC4gPWg5iQELTBuaMq7hHnAov8g54-qmVg',
  authDomain: 'facebook-app-33478.firebaseapp.com',
  projectId: 'facebook-app-33478',
  storageBucket: 'facebook-app-33478.firebasestorage.app',
  messagingSenderId: '710123958688',
  appId: '1:710123958688:web:23dac86ab7c2167c0a74c5',
};
