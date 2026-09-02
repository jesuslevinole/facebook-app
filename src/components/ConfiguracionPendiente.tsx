import { KeyRound } from 'lucide-react';
import { variablesFaltantes } from '../config/entorno';
import './ConfiguracionPendiente.css';

/* Se muestra en vez de la app cuando faltan credenciales de Firebase.
   Sin esto el usuario solo ve tarjetas grises cargando para siempre. */
export default function ConfiguracionPendiente() {
  const plantilla = [
    'VITE_FB_API_KEY=',
    'VITE_FB_AUTH_DOMAIN=tu-proyecto.firebaseapp.com',
    'VITE_FB_PROJECT_ID=tu-proyecto',
    'VITE_FB_STORAGE_BUCKET=tu-proyecto.firebasestorage.app',
    'VITE_FB_MESSAGING_SENDER_ID=',
    'VITE_FB_APP_ID=',
  ].join('\n');

  return (
    <main className="config-pendiente">
      <article className="card config-caja">
        <span className="empty-icon">
          <KeyRound size={22} />
        </span>

        <h1 className="title-page">Falta conectar Firebase</h1>
        <p className="text-sm muted">
          La app no encuentra las credenciales del proyecto, así que no puede leer ni guardar
          datos.
        </p>

        <section className="config-bloque">
          <p className="eyebrow">Variables sin valor</p>
          <ul className="config-faltantes">
            {variablesFaltantes.map((v) => (
              <li key={v} className="code-tag">
                {v}
              </li>
            ))}
          </ul>
        </section>

        <section className="config-bloque">
          <p className="eyebrow">Qué hacer</p>
          <ol className="config-pasos">
            <li className="text-sm">
              Crea un archivo llamado <span className="code-tag">.env</span> en la raíz del
              proyecto, al lado de <span className="code-tag">package.json</span> — no dentro de{' '}
              <span className="code-tag">src</span>.
            </li>
            <li className="text-sm">
              Copia el bloque de abajo y completa los valores desde la consola de Firebase:
              Configuración del proyecto → Tus apps → Web.
            </li>
            <li className="text-sm">
              Detén el servidor y vuelve a correr <span className="code-tag">npm run dev</span>.
              Vite lee el <span className="code-tag">.env</span> solo al arrancar.
            </li>
          </ol>
        </section>

        <pre className="config-codigo">{plantilla}</pre>
      </article>
    </main>
  );
}
