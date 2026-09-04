/* Capa única de acceso a Firestore. Ninguna vista importa `firebase/firestore`
   directamente: si mañana cambia el backend, se cambia acá. */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Ajustes,
  Cliente,
  Grupo,
  Membresia,
  Plantilla,
  Publicacion,
  Rol,
  RutaDia,
  Usuario,
} from '../types';

export const COL = {
  clientes: 'clientes',
  grupos: 'grupos',
  plantillas: 'plantillas',
  publicaciones: 'publicaciones',
  ajustes: 'ajustes',
  usuarios: 'usuarios',
  roles: 'roles',
  membresias: 'membresias',
  rutas: 'rutas',
} as const;

type ConId = { id: string };

function suscribir<T extends ConId>(
  nombre: string,
  restricciones: QueryConstraint[],
  alRecibir: (filas: T[]) => void,
  alFallar: (error: Error) => void
): () => void {
  const q = query(collection(db, nombre), ...restricciones);
  return onSnapshot(
    q,
    (snap) => alRecibir(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as T[]),
    (error) => alFallar(error)
  );
}

export const escucharClientes = (ok: (v: Cliente[]) => void, fail: (e: Error) => void) =>
  suscribir<Cliente>(COL.clientes, [orderBy('createdAt', 'desc')], ok, fail);

export const escucharGrupos = (ok: (v: Grupo[]) => void, fail: (e: Error) => void) =>
  suscribir<Grupo>(COL.grupos, [orderBy('nombre')], ok, fail);

export const escucharPlantillas = (ok: (v: Plantilla[]) => void, fail: (e: Error) => void) =>
  suscribir<Plantilla>(COL.plantillas, [orderBy('createdAt', 'desc')], ok, fail);

/* Filtro de un solo campo: no requiere índice compuesto. El corte por vendedor
   se hace en memoria, que a este volumen es gratis. */
export const escucharPublicaciones = (
  desde: string,
  ok: (v: Publicacion[]) => void,
  fail: (e: Error) => void
) => suscribir<Publicacion>(COL.publicaciones, [where('fecha', '>=', desde)], ok, fail);

export const escucharUsuarios = (ok: (v: Usuario[]) => void, fail: (e: Error) => void) =>
  suscribir<Usuario>(COL.usuarios, [orderBy('nombre')], ok, fail);

export const escucharRoles = (ok: (v: Rol[]) => void, fail: (e: Error) => void) =>
  suscribir<Rol>(COL.roles, [orderBy('nombre')], ok, fail);

/* Se traen las membresías de todo el equipo: son pocas y permiten mostrar
   cuántos vendedores hay dentro de cada grupo. */
export const escucharMembresias = (ok: (v: Membresia[]) => void, fail: (e: Error) => void) =>
  suscribir<Membresia>(COL.membresias, [], ok, fail);

/* ---- Escrituras ---- */

type SinId<T> = Omit<T, 'id'>;

export const crearCliente = (datos: SinId<Cliente>) => addDoc(collection(db, COL.clientes), datos);
export const editarCliente = (id: string, datos: Partial<Cliente>) =>
  updateDoc(doc(db, COL.clientes, id), datos);
export const borrarCliente = (id: string) => deleteDoc(doc(db, COL.clientes, id));

export const crearGrupo = (datos: SinId<Grupo>) => addDoc(collection(db, COL.grupos), datos);
export const editarGrupo = (id: string, datos: Partial<Grupo>) =>
  updateDoc(doc(db, COL.grupos, id), datos);
export const borrarGrupo = (id: string) => deleteDoc(doc(db, COL.grupos, id));

export const crearPlantilla = (datos: SinId<Plantilla>) =>
  addDoc(collection(db, COL.plantillas), datos);
export const editarPlantilla = (id: string, datos: Partial<Plantilla>) =>
  updateDoc(doc(db, COL.plantillas, id), datos);
export const borrarPlantilla = (id: string) => deleteDoc(doc(db, COL.plantillas, id));

export const registrarPublicacion = (datos: SinId<Publicacion>) =>
  addDoc(collection(db, COL.publicaciones), datos);
export const borrarPublicacion = (id: string) => deleteDoc(doc(db, COL.publicaciones, id));
export const editarPublicacion = (id: string, datos: Partial<Publicacion>) =>
  updateDoc(doc(db, COL.publicaciones, id), datos);

/* ---- Ruta diaria ---- */

export const idRuta = (uid: string, fecha: string) => `${uid}_${fecha}`;

/* Solo se escucha la ruta de hoy. Las de días anteriores quedan en la base
   pero nadie las lee: son el historial de lo que cada uno se propuso. */
export const escucharRutaDelDia = (
  uid: string,
  fecha: string,
  ok: (v: RutaDia | null) => void,
  fail: (e: Error) => void
) =>
  onSnapshot(
    doc(db, COL.rutas, idRuta(uid, fecha)),
    (snap) =>
      ok(snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as RutaDia) : null),
    (error) => fail(error)
  );

export const guardarRuta = (uid: string, fecha: string, grupoIds: string[]) =>
  setDoc(doc(db, COL.rutas, idRuta(uid, fecha)), { uid, fecha, grupoIds });

/* ---- Membresías ---- */

/** Id compuesto: unirse dos veces al mismo grupo no crea duplicados. */
export const idMembresia = (uid: string, grupoId: string) => `${uid}_${grupoId}`;

export const unirseAGrupo = (uid: string, grupoId: string) =>
  setDoc(doc(db, COL.membresias, idMembresia(uid, grupoId)), {
    uid,
    grupoId,
    createdAt: new Date().toISOString(),
  });

export const salirDeGrupo = (uid: string, grupoId: string) =>
  deleteDoc(doc(db, COL.membresias, idMembresia(uid, grupoId)));

/* ---- Usuarios y roles ---- */

/** El id del documento es el UID de Auth, no uno autogenerado. */
export const crearUsuario = (uid: string, datos: SinId<Usuario>) =>
  setDoc(doc(db, COL.usuarios, uid), datos);
export const editarUsuario = (id: string, datos: Partial<Usuario>) =>
  updateDoc(doc(db, COL.usuarios, id), datos);
export const borrarUsuario = (id: string) => deleteDoc(doc(db, COL.usuarios, id));

export const leerUsuario = async (uid: string): Promise<Usuario | null> => {
  const snap = await getDoc(doc(db, COL.usuarios, uid));
  return snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as Usuario) : null;
};

/** Se usa antes de mostrar el registro inicial: si hay alguien, se oculta. */
export const hayUsuarios = async (): Promise<boolean> => {
  const snap = await getDocs(collection(db, COL.usuarios));
  return !snap.empty;
};

export const crearRol = (datos: SinId<Rol>) => addDoc(collection(db, COL.roles), datos);
export const crearRolConId = (id: string, datos: SinId<Rol>) =>
  setDoc(doc(db, COL.roles, id), datos);
export const editarRol = (id: string, datos: Partial<Rol>) =>
  updateDoc(doc(db, COL.roles, id), datos);
export const borrarRol = (id: string) => deleteDoc(doc(db, COL.roles, id));

/* ---- Ajustes: documento único ---- */

const REF_AJUSTES = 'general';

export const AJUSTES_INICIALES: Ajustes = {
  metaDiaria: 8,
  diasSinRepetir: 7,
  cooldownHorasDefault: 20,
  minutosEntrePublicaciones: 2,
};

export async function leerAjustes(): Promise<Ajustes> {
  const snap = await getDoc(doc(db, COL.ajustes, REF_AJUSTES));
  if (!snap.exists()) return AJUSTES_INICIALES;
  return { ...AJUSTES_INICIALES, ...(snap.data() as Partial<Ajustes>) };
}

export const guardarAjustes = (datos: Ajustes) =>
  setDoc(doc(db, COL.ajustes, REF_AJUSTES), datos, { merge: true });
