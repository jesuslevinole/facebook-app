# Publicar en Cloudflare Pages

Guía completa, de un proyecto local a una URL que el equipo pueda usar en el
teléfono. Tiempo estimado: 20 minutos la primera vez.

---

## Antes de empezar: cerrar el acceso a Firestore

**Este paso no es opcional.** Mientras `firestore.rules` esté en modo de
arranque, cualquiera que abra la URL publicada puede leer y escribir en tu
base: clientes, RUT, direcciones, todo.

En `localhost` no importa. Publicado, sí.

1. Abre la app en local y crea tu cuenta de administrador desde la pantalla de
   acceso, si aún no lo has hecho.
2. Abre `firestore.rules`. Comenta el bloque **ETAPA 1 · ARRANQUE** y
   descomenta el bloque **ETAPA 2 · PRODUCCIÓN**.
3. Consola de Firebase → Firestore Database → Rules → pega el archivo →
   **Publicar**.
4. Vuelve a la app y comprueba que sigues pudiendo entrar y ver tus datos. Si
   algo falla, el mensaje de error dirá qué permiso falta.

---

## Paso 1 · Subir el proyecto a GitHub

Cloudflare compila desde un repositorio. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "RedLink Ventas"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/redlink-ventas.git
git push -u origin main
```

Crea el repositorio en github.com antes del `git remote add`. Puede ser
**privado**: Cloudflare igual accede una vez que autorizas la conexión.

El `.gitignore` ya excluye `node_modules`, `dist` y `.env`. Las credenciales de
Firebase viajan igual en `src/config/firebase.config.ts`, que es correcto —
esos valores son públicos por diseño (ver el comentario del archivo).

---

## Paso 2 · Crear el proyecto en Cloudflare

1. Entra a **dash.cloudflare.com** → *Workers & Pages* → **Create** →
   pestaña *Pages* → **Connect to Git**.
2. Autoriza GitHub y elige el repositorio.
3. Configura la compilación:

| Campo | Valor |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(vacío)* |

4. **Save and Deploy**. La primera compilación toma 2–3 minutos.

Al terminar tendrás una URL tipo `redlink-ventas.pages.dev`.

### Variables de entorno (opcional)

No hacen falta: la app trae las credenciales en
`src/config/firebase.config.ts`. Si prefieres manejarlas desde el panel, en
*Settings → Environment variables* agrega las seis `VITE_FB_*` del archivo
`.env` — tienen prioridad sobre el archivo de configuración.

---

## Paso 3 · Autorizar el dominio en Firebase

**Sin esto el login no funciona en la URL publicada** (falla con
`auth/unauthorized-domain`), aunque funcione perfecto en local.

Consola de Firebase → **Authentication** → *Settings* → **Authorized domains**
→ **Add domain** → escribe `redlink-ventas.pages.dev` (tu URL real, sin
`https://`).

Si más adelante conectas un dominio propio, agrégalo también.

---

## Paso 4 · Instalar la app en el teléfono

La URL ya es una PWA instalable. Cada vendedor, desde su teléfono:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** botón compartir → *Añadir a pantalla de inicio*.

Queda con icono propio y a pantalla completa, sin barra del navegador. Es la
forma en que conviene usarla: el flujo de copiar y abrir Facebook funciona
mejor así.

---

## Actualizaciones

Cada `git push` a `main` dispara una compilación nueva y publica sola. Los
vendedores no tienen que hacer nada: el service worker detecta la versión nueva
y recarga la app.

```bash
git add .
git commit -m "Qué cambió"
git push
```

Cloudflare guarda todas las versiones. Si algo sale mal, en *Deployments*
puedes volver a una anterior con **Rollback**.

---

## Dominio propio (opcional)

Si tienes un dominio, en *Custom domains* → **Set up a domain**. Cloudflare
gestiona el certificado HTTPS solo. Recuerda agregar el dominio nuevo a los
dominios autorizados de Firebase (Paso 3).

---

## Si algo falla

**El login dice "unauthorized domain"** → falta el Paso 3.

**La compilación falla en Cloudflare** → revisa el log del deployment. Lo más
común es que `package-lock.json` no esté en el repositorio: sin él, Cloudflare
instala versiones distintas a las tuyas. Confirma que `git status` no lo liste
como ignorado.

**Los vendedores ven una versión vieja** → deberían actualizarse solos. Si uno
se queda pegado: cerrar la app, en el navegador borrar datos del sitio, y
volver a abrir. El archivo `public/_headers` ya evita que el HTML y el service
worker se cacheen, que es la causa habitual.

**Nadie puede leer datos tras cerrar las reglas** → revisa que el documento de
la persona en la colección `usuarios` tenga `activo: true` y un `rolId` que
exista en la colección `roles`.
