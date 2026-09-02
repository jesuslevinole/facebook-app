import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { escucharRoles, leerUsuario } from '../services/datos';
import { observarSesion, salir } from '../services/auth';
import type { Identidad, Permiso, Rol, Usuario } from '../types';

interface Sesion {
  cargando: boolean;
  /** null = no hay nadie autenticado. */
  perfil: Usuario | null;
  rol: Rol | null;
  roles: Rol[];
  /** Motivo por el que se rechazó una sesión válida de Auth (cuenta sin perfil o desactivada). */
  rechazo: string;
  puede: (permiso: Permiso) => boolean;
  identidad: Identidad;
  cerrarSesion: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rechazo, setRechazo] = useState('');
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const baja = escucharRoles(setRoles, () => setRoles([]));
    return baja;
  }, []);

  useEffect(() => {
    return observarSesion(async (usuarioAuth) => {
      if (!usuarioAuth) {
        setUid(null);
        setPerfil(null);
        setCargando(false);
        return;
      }

      setUid(usuarioAuth.uid);
      try {
        const encontrado = await leerUsuario(usuarioAuth.uid);

        /* Existir en Auth no basta: el perfil en Firestore es el que dice
           qué rol tiene y si sigue habilitado. Sin él, se cierra la sesión. */
        if (!encontrado) {
          setRechazo('Tu cuenta existe pero no tiene perfil asignado. Pídele a un administrador que la active.');
          await salir();
          setPerfil(null);
        } else if (!encontrado.activo) {
          setRechazo('Tu cuenta está desactivada. Contacta a un administrador.');
          await salir();
          setPerfil(null);
        } else {
          setRechazo('');
          setPerfil(encontrado);
        }
      } catch {
        setRechazo('No se pudo leer tu perfil. Revisa tu conexión e intenta de nuevo.');
        await salir();
        setPerfil(null);
      }
      setCargando(false);
    });
  }, []);

  const rol = useMemo(
    () => (perfil ? roles.find((r) => r.id === perfil.rolId) ?? null : null),
    [perfil, roles]
  );

  const puede = useCallback(
    (permiso: Permiso) => Boolean(rol?.permisos.includes(permiso)),
    [rol]
  );

  const refrescarPerfil = useCallback(async () => {
    if (!uid) return;
    const encontrado = await leerUsuario(uid);
    if (encontrado) setPerfil(encontrado);
  }, [uid]);

  const cerrarSesion = useCallback(async () => {
    await salir();
    setPerfil(null);
    setRechazo('');
  }, []);

  const valor = useMemo<Sesion>(
    () => ({
      cargando,
      perfil,
      rol,
      roles,
      rechazo,
      puede,
      identidad: { vendedor: perfil?.nombre ?? '', telefono: perfil?.telefono ?? '' },
      cerrarSesion,
      refrescarPerfil,
    }),
    [cargando, perfil, rol, roles, rechazo, puede, cerrarSesion, refrescarPerfil]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return ctx;
}
