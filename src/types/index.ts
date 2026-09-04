/* Única fuente de tipos del proyecto. No crear src/types.ts paralelo. */

export type Compania = 'Claro' | 'VTR';

export type EstadoCliente = 'nuevo' | 'contactado' | 'agendado' | 'instalado' | 'perdido';

/* ---------- Acceso ---------- */

export type Permiso =
  | 'publicar'
  | 'clientes.ver'
  | 'clientes.editar'
  | 'clientes.verTodos'
  | 'grupos.ver'
  | 'grupos.editar'
  | 'mensajes.ver'
  | 'mensajes.editar'
  | 'panel.verEquipo'
  | 'ajustes.editar'
  | 'usuarios.gestionar';

export const PERMISOS: { id: Permiso; etiqueta: string; ayuda: string; grupo: string }[] = [
  { id: 'publicar', etiqueta: 'Publicar en grupos', ayuda: 'Ver la ruta diaria y registrar publicaciones.', grupo: 'Trabajo diario' },
  { id: 'clientes.ver', etiqueta: 'Ver clientes', ayuda: 'Acceder al listado de clientes.', grupo: 'Clientes' },
  { id: 'clientes.editar', etiqueta: 'Registrar y editar clientes', ayuda: 'Crear, modificar y eliminar clientes.', grupo: 'Clientes' },
  { id: 'clientes.verTodos', etiqueta: 'Ver clientes de todo el equipo', ayuda: 'Sin este permiso solo ve los suyos.', grupo: 'Clientes' },
  { id: 'grupos.ver', etiqueta: 'Ver grupos', ayuda: 'Acceder al listado de grupos y su rendimiento.', grupo: 'Grupos y mensajes' },
  { id: 'grupos.editar', etiqueta: 'Administrar grupos', ayuda: 'Agregar, editar, pausar y eliminar grupos.', grupo: 'Grupos y mensajes' },
  { id: 'mensajes.ver', etiqueta: 'Ver mensajes', ayuda: 'Acceder a las plantillas de publicación.', grupo: 'Grupos y mensajes' },
  { id: 'mensajes.editar', etiqueta: 'Administrar mensajes', ayuda: 'Crear, editar y pausar plantillas.', grupo: 'Grupos y mensajes' },
  { id: 'panel.verEquipo', etiqueta: 'Ver cifras del equipo', ayuda: 'El panel muestra a todos, no solo lo propio.', grupo: 'Panel' },
  { id: 'ajustes.editar', etiqueta: 'Cambiar reglas de publicación', ayuda: 'Meta diaria, descansos y repetición de mensajes.', grupo: 'Configuración' },
  { id: 'usuarios.gestionar', etiqueta: 'Administrar usuarios y roles', ayuda: 'Crear cuentas, asignar roles y definir permisos.', grupo: 'Configuración' },
];

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
  /** Los roles protegidos no se pueden eliminar (dejarían al equipo sin acceso). */
  protegido: boolean;
  createdAt: string;
}

export interface Usuario {
  /** Coincide con el UID de Firebase Auth. */
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rolId: string;
  activo: boolean;
  createdAt: string;
}

/* ---------- Datos del negocio ---------- */

export interface Cliente {
  id: string;
  /** UID del vendedor que lo registró. Es el dueño del cliente. */
  uid: string;
  /** UIDs con los que el dueño compartió la ficha. Vacío = privado. */
  compartidoCon: string[];
  nombre: string;
  apellido: string;
  rut: string;
  comuna: string;
  direccion: string;
  facebookUrl: string;
  telefono: string;
  compania: Compania;
  plan: string;
  estado: EstadoCliente;
  grupoId: string | null;
  notas: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grupo {
  id: string;
  /* Dueño del grupo. Cada vendedor arma su propio catálogo: lo que uno
     agrega no le aparece a los demás.

     Cadena vacía = grupo heredado de cuando el catálogo era compartido.
     Esos siguen visibles para todo el equipo hasta que alguien los edite. */
  uid: string;
  nombre: string;
  url: string;
  /** Código corto que se inserta en el mensaje para atribuir clientes al grupo. */
  codigo: string;
  comuna: string;
  miembros: number;
  activo: boolean;
  /** Horas mínimas entre dos publicaciones del mismo vendedor en este grupo. */
  cooldownHoras: number;
  createdAt: string;
}

export type TonoPlantilla = 'directo' | 'pregunta' | 'oferta' | 'testimonio' | 'urgencia';

export interface Plantilla {
  id: string;
  /** Dueño del mensaje. Vacío = heredado, visible para todos. Ver `Grupo.uid`. */
  uid: string;
  titulo: string;
  /** Admite variables {codigo} {comuna} {grupo} {vendedor} {telefono} y spintax {hola|buenas}. */
  cuerpo: string;
  tono: TonoPlantilla;
  activo: boolean;
  createdAt: string;
}

export interface Publicacion {
  id: string;
  /** UID del vendedor que publicó. La rotación es individual, no compartida. */
  uid: string;
  grupoId: string;
  grupoNombre: string;
  plantillaId: string;
  plantillaTitulo: string;
  /** Fecha local de Chile en formato YYYY-MM-DD. Clave de todos los cortes diarios. */
  fecha: string;
  ts: string;
  textoUsado: string;
}

/** Reglas de ritmo comunes a todo el equipo. */
export interface Ajustes {
  metaDiaria: number;
  diasSinRepetir: number;
  cooldownHorasDefault: number;
}

/** Nombre y teléfono que se insertan en el mensaje del vendedor. */
export interface Identidad {
  vendedor: string;
  telefono: string;
}

/* Membresía de un vendedor en un grupo.

   Estar en la app no significa estar dentro del grupo de Facebook: cada
   vendedor tiene que unirse por su cuenta y esperar aprobación. Solo los
   grupos donde ya es miembro entran en su ruta de publicación.

   El id del documento es `uid_grupoId`, así unirse dos veces no crea
   duplicados. */
export interface Membresia {
  id: string;
  uid: string;
  grupoId: string;
  createdAt: string;
}

/* Ruta del día: los grupos que el vendedor se propuso recorrer hoy.

   El id del documento es `uid_fecha`, con la fecha en hora de Venezuela.
   Por eso la ruta se vacía sola al pasar la medianoche de Caracas: al día
   siguiente el id ya no coincide y la app busca un documento que no existe.
   No hace falta un proceso que borre nada. */
export interface RutaDia {
  id: string;
  uid: string;
  fecha: string;
  grupoIds: string[];
}

/** Tope de grupos por ruta. Más que esto no se alcanza a recorrer en un día. */
export const MAX_RUTA = 100;

/** Una parada de la ruta de publicación del día. */
export interface Parada {
  grupo: Grupo;
  plantilla: Plantilla | null;
  texto: string;
  publicadoHoy: boolean;
  horasParaHabilitar: number;
  diasSinPublicar: number | null;
  motivo: string;
}
