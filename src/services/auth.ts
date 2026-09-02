/* Acceso con correo y clave (Firebase Auth).

   Crear una cuenta desde el cliente tiene una trampa conocida:
   `createUserWithEmailAndPassword` deja la sesión en el usuario recién creado,
   o sea que el administrador quedaría deslogueado cada vez que da de alta a
   alguien. Para evitarlo se usa una *app secundaria* de Firebase, con su
   propia instancia de Auth: el usuario se crea ahí y la sesión principal ni se
   entera.

   Todas las funciones piden la instancia de Auth en el momento de usarse
   (`obtenerAuth()`), nunca al importar el módulo. Ver el comentario en
   `firebase.ts`. */

import { initializeApp, deleteApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { obtenerAuth } from '../firebase';
import { configFirebase } from '../config/entorno';

export type UsuarioAuth = User;

export const observarSesion = (alCambiar: (usuario: User | null) => void) =>
  onAuthStateChanged(obtenerAuth(), alCambiar);

export const entrar = (email: string, clave: string) =>
  signInWithEmailAndPassword(obtenerAuth(), email.trim(), clave);

export const salir = () => signOut(obtenerAuth());

/* Acceso sin credenciales. Firebase entrega un UID real y temporal, así que
   `request.auth` deja de ser nulo y las reglas de Firestore pueden autorizar
   la escritura. Sin esto, el modo invitado puede leer (si las reglas están
   abiertas) pero nunca guardar.

   Requiere activar "Anónimo" en la consola: Authentication → Sign-in method. */
export const entrarComoAnonimo = () => signInAnonymously(obtenerAuth());

export const recuperarClave = (email: string) =>
  sendPasswordResetEmail(obtenerAuth(), email.trim());

/** Crea la cuenta en Auth sin tocar la sesión activa. Devuelve el UID nuevo. */
export async function crearCuentaSinCambiarSesion(email: string, clave: string): Promise<string> {
  const secundaria = initializeApp(configFirebase, `alta-${Date.now()}`);
  try {
    const credencial = await createUserWithEmailAndPassword(
      getAuth(secundaria),
      email.trim(),
      clave
    );
    return credencial.user.uid;
  } finally {
    await deleteApp(secundaria);
  }
}

/** Traduce los códigos de Firebase a algo que un vendedor pueda entender. */
export function mensajeDeError(error: unknown): string {
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const mapa: Record<string, string> = {
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/user-disabled': 'Esta cuenta está desactivada.',
    'auth/user-not-found': 'No hay una cuenta con ese correo.',
    'auth/wrong-password': 'La clave no es correcta.',
    'auth/invalid-credential': 'El correo o la clave no coinciden.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La clave debe tener al menos 6 caracteres.',
    'auth/network-request-failed': 'Sin conexión con el servidor.',
    'auth/operation-not-allowed':
      'Falta activar este método de acceso en la consola de Firebase (Authentication → Sign-in method).',
    'auth/admin-restricted-operation':
      'El acceso anónimo está desactivado. Actívalo en Authentication → Sign-in method → Anónimo.',
  };

  return mapa[codigo] ?? 'No se pudo completar la operación. Intenta de nuevo.';
}
