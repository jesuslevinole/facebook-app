# RedLink Ventas

PWA para vender planes de internet de Claro y VTR en Chile: registro de clientes,
rotación diaria de grupos de Facebook y atribución de cada cliente al grupo del
que llegó.

React 19 + TypeScript + Vite 6 + Firebase/Firestore. CSS puro, sin Tailwind,
sin estilos inline y sin `!important`.

---

> **¿Vas a publicar la app?** Los pasos están en
> [`DESPLIEGUE.md`](DESPLIEGUE.md) — incluye el cierre de las reglas de
> Firestore, que es obligatorio antes de exponer la URL.

## 1. Poner a andar el proyecto

```bash
npm install
cp .env.example .env      # y completa con las credenciales de tu proyecto Firebase
npm run dev
```

Las credenciales salen de la consola de Firebase → *Configuración del proyecto*
→ *Tus apps* → *Web*.

### Firestore

1. Crea la base en modo nativo.
2. Publica `firestore.rules`. **Léelo antes**: está en modo de prueba porque la
   app todavía no tiene pantalla de acceso.
3. No se necesitan índices compuestos. La única consulta con filtro
   (`publicaciones` por `fecha >=`) usa un solo campo.

### Compilar y publicar

```bash
npm run check    # tsc --noEmit
npm run build    # dist/ listo para Cloudflare Pages, Firebase Hosting, etc.
```

---

## 2. Cómo funciona la rotación anti-spam

Son cuatro capas que trabajan juntas (`src/utils/rotacion.ts` y
`src/utils/mensaje.ts`):

1. **Orden de grupos por descanso.** Cada día la ruta se reordena sola: primero
   los grupos que llevan más tiempo sin recibir una publicación. Un pequeño
   desorden sembrado con la fecha rompe los empates, así el recorrido no es
   idéntico día a día pero sí estable dentro del mismo día.
2. **Cooldown por grupo.** Cada grupo define sus horas mínimas de descanso. Los
   que están dentro del cooldown caen al final de la lista.
3. **Rotación de mensajes.** Se descarta toda plantilla usada en ese grupo en
   los últimos N días (configurable) y nunca se repite la plantilla que se acaba
   de publicar en otro grupo.
4. **Variantes dentro del mensaje.** El cuerpo admite `{hola|buenas|qué tal}`:
   cada bloque se resuelve distinto según grupo y día. Una plantilla con seis
   bloques de tres opciones da 729 textos diferentes.

La elección es **determinista** (semilla `grupo + fecha + plantilla`): lo que se
ve en pantalla es exactamente lo que se copia, y recargar la app no cambia el
texto a mitad de jornada.

## 3. Cómo se atribuyen los clientes a un grupo

Cada grupo tiene un **código corto** (ej. `CVM`). La variable `{codigo}` lo
inserta en el mensaje —"menciona el código CVM para ubicarte al tiro"—. Cuando
el cliente escribe, el vendedor lo elige en el campo *Grupo de origen* del
formulario. Con eso la vista **Grupos** calcula clientes totales, instalados,
publicaciones de los últimos 30 días y clientes por publicación.

## 4. Estructura

```
src/
  index.css              Sistema visual completo: tokens, temas, botones, inputs,
                         tarjetas, tablas, modales. Todo lo reutilizable vive acá.
  App.tsx / App.css      Shell, listeners globales de Firestore, enrutado de vistas.
  firebase.ts            Init + caché persistente (la app funciona sin señal).
  types/index.ts         Única fuente de tipos.
  services/datos.ts      Única capa de acceso a Firestore.
  utils/
    rut.ts               RUT chileno: formato y dígito verificador.
    fecha.ts             Cortes diarios anclados a hora de Chile.
    mensaje.ts           Spintax + variables + semilla determinista.
    rotacion.ts          Motor de la ruta diaria.
    portapapeles.ts      Copiar con respaldo para móviles.
  components/            Navegación, barra superior, tarjetas, modal, avisos.
  views/                 Panel, Publicar, Clientes, Grupos, Mensajes, Ajustes.
```

Cada componente con estilos propios tiene su `.css` hermano. Los seis
`style={{...}}` que quedan en el proyecto son variables CSS de runtime
(`--fill`, `--altura`, `--dot-color`), el único caso permitido.

## 5. Colecciones de Firestore

| Colección | Para qué |
|---|---|
| `clientes` | Datos del cliente, plan, estado y `grupoId` de origen. |
| `grupos` | Nombre, enlace, código de atribución, comuna, cooldown. |
| `plantillas` | Mensajes con variantes y tono. |
| `publicaciones` | Un registro por publicación: grupo, plantilla, fecha, hora, texto usado. |
| `ajustes/general` | Nombre y teléfono del vendedor, meta diaria y reglas de rotación. |

## 6. Equipo, roles y permisos

El acceso es con correo y clave (Firebase Auth). Existir en Auth no basta:
cada persona necesita además un documento en `usuarios` con su rol y su
estado; sin él la sesión se cierra sola.

**Primera vez:** en la consola de Firebase → Authentication → Sign-in method,
activa *Correo electrónico/contraseña*. Después abre la app: mientras no exista
ningún usuario, la pantalla de acceso ofrece crear la primera cuenta, que queda
como administradora y genera los dos roles base.

**Roles base**

| Rol | Qué puede hacer |
|---|---|
| Administrador | Todo: equipo, grupos, mensajes, reglas y cifras del equipo. |
| Vendedor | Publica, registra sus clientes y ve solo sus propias cifras. |

Los permisos se editan uno por uno desde Equipo → Roles, y se pueden crear
roles nuevos (por ejemplo un supervisor que ve al equipo pero no configura).

**Altas de usuarios.** Se hacen desde Equipo → Nuevo usuario. La cuenta se crea
usando una instancia secundaria de Firebase, así que dar de alta a alguien no
cierra tu sesión. Eliminar un usuario borra su perfil y su acceso a la app; la
cuenta de correo se elimina aparte, desde la consola de Firebase.

**Qué es individual y qué es compartido**

- Individual: la rotación de grupos, el historial de publicaciones y la meta
  diaria de cada persona. Dos vendedores pueden publicar el mismo día en el
  mismo grupo sin estorbarse.
- Compartido: grupos, mensajes y las reglas de ritmo.
- Los clientes tienen dueño (`uid`), y quien no tenga `clientes.verTodos` solo
  ve los suyos.

## 7. Cómo se arma la ruta automática

Cada día, la primera vez que el vendedor abre la app, la ruta se genera sola
puntuando sus grupos (`src/utils/puntajeGrupo.ts`). Una vez creada no se vuelve
a tocar: si se regenerara, cada grupo que el vendedor quita reaparecería al
recargar. El botón «Rearmar automática» la recalcula a mano.

Los criterios, por peso:

| Peso | Criterio |
|---|---|
| 55 | Proporción de contactos aprovechables sobre el total de contactos. |
| 30 | Interacciones por publicación (likes + comentarios + contactos). |
| 10 | Tamaño del grupo, normalizado contra el más grande. |
| ~6 | Días sin publicar, para que la ruta no se reduzca a los mismos cinco. |

**Regla de descarte:** diez publicaciones sin una sola interacción y el grupo
sale de la ruta automática. Sigue en el catálogo y se puede agregar a mano.

**Grupos sin historial** (menos de tres publicaciones) reciben un puntaje
intermedio de exploración. Sin eso, un grupo nuevo nunca se probaría y el
sistema quedaría encerrado en los que ya conoce.

Los datos de interacción no salen de ninguna API: Facebook no los expone. Se
cargan a mano desde el botón «Interacciones» de cada publicación ya hecha.

## 8. Pendiente de decidir

- **Registro automático al publicar.** Hoy la publicación se registra al tocar
  *Copiar y abrir grupo*, asumiendo que la publicación se concreta. Si el
  vendedor se arrepiente, el botón *Deshacer registro* la borra. La alternativa
  —pedir confirmación después— es más exacta pero agrega un toque por grupo.
