import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  crearRolConId,
  crearUsuario,
  escucharRoles,
  hayUsuarios,
  leerUsuario,
} from '../services/datos';
import { observarSesion, salir } from '../services/auth';
import { ID_ADMIN, ROLES_BASE } from '../data/rolesBase';
import { PERMISOS, type Identidad, type Permiso, type Rol, type Usuario } from '../types';
import { ACCESO_INVITADO } from '../config/acceso';

interface Sesion {
  cargando: boolean;
  /** null = no hay nadie autenticado. */
  perfil: Usuario | null;
  rol: Rol | null;
  roles: Rol[];
  /** Motivo por el que se rechazó una sesión válida de Auth. */
  rechazo: string;
  puede: (permiso: Permiso) => boolean;
  identidad: Identidad;
  /** true cuando se entró sin autenticar (modo invitado). */
  esInvitado: boolean;
  entrarComoInvitado: () => void;
  cerrarSesion: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

/* Perfil ficticio del modo invitado. No existe en Firestore ni en Auth:
   solo vive en memoria mientras dura la pestaña. */
const ROL_INVITADO: Rol = {
  id: 'invitado',
  nombre: 'Invitado (sin sesión)',
  descripcion: 'Acceso completo sin autenticar. Pensado para revisar la app.',
  permisos: PERMISOS.map((p) => p.id),
  protegido: true,
  createdAt: '',
};

const PERFIL_INVITADO: Usuario = {
  id: 'invitado',
  nombre: 'Invitado',
  email: '',
  telefono: '',
  rolId: 'invitado',
  activo: true,
  createdAt: '',
};

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rechazo, setRechazo] = useState('');
  const [uid, setUid] = useState<string | null>(null);
  const [esInvitado, setEsInvitado] = useState(false);

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
        let encontrado = await leerUsuario(usuarioAuth.uid);

        /* Auto-configuración: si la cuenta existe en Auth pero no tiene perfil
           y todavía no hay NADIE en el equipo, esta persona es la primera.
           Se le crea el perfil de administrador y los roles base.

           Esto cubre el caso de crear la cuenta desde la consola de Firebase,
           donde solo se genera el acceso, no el perfil. */
        if (!encontrado && !(await hayUsuarios())) {
          await Promise.all(
            ROLES_BASE.map((r) =>
              crearRolConId(r.id, { ...r.datos, createdAt: new Date().toISOString() })
            )
          );
          await crearUsuario(usuarioAuth.uid, {
            nombre: usuarioAuth.displayName || usuarioAuth.email?.split('@')[0] || 'Administrador',
            email: usuarioAuth.email ?? '',
            telefono: '',
            rolId: ID_ADMIN,
            activo: true,
            createdAt: new Date().toISOString(),
          });
          encontrado = await leerUsuario(usuarioAuth.uid);
        }

        /* Existir en Auth no basta: el perfil en Firestore es el que dice
           qué rol tiene y si sigue habilitado. Sin él, se cierra la sesión. */
        if (!encontrado) {
          setRechazo(
            'Tu cuenta existe pero no tiene perfil asignado. Pídele a un administrador que te dé de alta desde Equipo → Nuevo usuario.'
          );
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
      } catch (error) {
        /* Se muestra el motivo real: casi siempre es que las reglas de
           Firestore bloquean la lectura, y sin el detalle es indistinguible
           de un problema de conexión. */
        const detalle =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : 'desconocido';
        setRechazo(
          detalle.includes('permission-denied')
            ? 'Las reglas de Firestore no permiten leer tu perfil. Revisa que estén publicadas las reglas correctas.'
            : `No se pudo leer tu perfil (${detalle}). Revisa tu conexión e intenta de nuevo.`
        );
        await salir();
        setPerfil(null);
      }
      setCargando(false);
    });
  }, []);

  const rol = useMemo(() => {
    if (esInvitado) return ROL_INVITADO;
    return perfil ? roles.find((r) => r.id === perfil.rolId) ?? null : null;
  }, [perfil, roles, esInvitado]);

  const puede = useCallback(
    (permiso: Permiso) => Boolean(rol?.permisos.includes(permiso)),
    [rol]
  );

  const entrarComoInvitado = useCallback(() => {
    if (!ACCESO_INVITADO) return;
    setEsInvitado(true);
    setPerfil(PERFIL_INVITADO);
    setRechazo('');
    setCargando(false);
  }, []);

  const refrescarPerfil = useCallback(async () => {
    if (!uid || esInvitado) return;
    const encontrado = await leerUsuario(uid);
    if (encontrado) setPerfil(encontrado);
  }, [uid, esInvitado]);

  const cerrarSesion = useCallback(async () => {
    if (esInvitado) {
      setEsInvitado(false);
      setPerfil(null);
      return;
    }
    await salir();
    setPerfil(null);
    setRechazo('');
  }, [esInvitado]);

  const valor = useMemo<Sesion>(
    () => ({
      cargando,
      perfil,
      rol,
      roles: esInvitado ? [ROL_INVITADO, ...roles] : roles,
      rechazo,
      puede,
      identidad: { vendedor: perfil?.nombre ?? '', telefono: perfil?.telefono ?? '' },
      esInvitado,
      entrarComoInvitado,
      cerrarSesion,
      refrescarPerfil,
    }),
    [cargando, perfil, rol, roles, rechazo, puede, esInvitado, entrarComoInvitado, cerrarSesion, refrescarPerfil]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return ctx;
}
