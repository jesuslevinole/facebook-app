import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  /* Firebase se reparte en subpaquetes (`app`, `auth`, `firestore`) que
     registran sus componentes sobre una misma instancia interna de
     `@firebase/app`. Si terminan conviviendo dos copias de esa instancia,
     `getAuth()` busca el componente donde nadie lo registró y aparece
     "Component auth has not been registered yet".

     `dedupe` obliga a resolver siempre la misma copia física del paquete;
     `optimizeDeps.include` obliga a Vite a pre-empaquetar los tres en un
     solo lote en vez de descubrirlos por separado. */
  resolve: {
    dedupe: ['firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore'],
  },

  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },

  build: { outDir: 'dist', sourcemap: false },
});
