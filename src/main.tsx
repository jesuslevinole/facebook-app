import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProveedorAvisos } from './components/Avisos';
import { ProveedorSesion } from './context/Sesion';
import './index.css';

/* El service worker solo se registra en producción. En desarrollo interfiere
   con el hot-reload de Vite y hace que se sirvan versiones viejas del código,
   que es justo lo que uno no quiere mientras programa. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registro) => {
        /* Si hay una versión nueva publicada, se activa sin esperar a que el
           usuario cierre todas las pestañas. */
        registro.addEventListener('updatefound', () => {
          const nuevo = registro.installing;
          if (!nuevo) return;
          nuevo.addEventListener('statechange', () => {
            if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        /* Sin service worker la app funciona igual, solo pierde el modo offline. */
      });
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ProveedorAvisos>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </ProveedorAvisos>
  </StrictMode>
);
