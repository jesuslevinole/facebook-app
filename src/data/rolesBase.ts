/* Roles que se crean junto con la primera cuenta. Después se editan desde
   Usuarios → Roles; los protegidos no se pueden eliminar para que el equipo
   nunca quede sin un rol con acceso completo. */

import { PERMISOS, type Permiso, type Rol } from '../types';

export const ID_ADMIN = 'administrador';
export const ID_VENDEDOR = 'vendedor';

const TODOS: Permiso[] = PERMISOS.map((p) => p.id);

export const ROLES_BASE: { id: string; datos: Omit<Rol, 'id' | 'createdAt'> }[] = [
  {
    id: ID_ADMIN,
    datos: {
      nombre: 'Administrador',
      descripcion: 'Acceso completo: equipo, grupos, mensajes y reglas de publicación.',
      permisos: TODOS,
      protegido: true,
    },
  },
  {
    id: ID_VENDEDOR,
    datos: {
      nombre: 'Vendedor',
      descripcion: 'Publica, registra sus clientes y ve sus propias cifras.',
      permisos: [
        'publicar',
        'clientes.ver',
        'clientes.editar',
        'grupos.ver',
        'mensajes.ver',
      ],
      protegido: true,
    },
  },
];
