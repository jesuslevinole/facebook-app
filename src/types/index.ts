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
  /** UID del vendedor que lo registró. */
  uid: string;
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
