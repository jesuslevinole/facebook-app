import { useCallback, useEffect, useState } from 'react';

export type Tema = 'light' | 'dark';

const CLAVE = 'redlink-tema';

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE);
  if (guardado === 'light' || guardado === 'dark') return guardado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Aplica el tema al <html data-theme> y lo recuerda entre sesiones. */
export function useTema(): { tema: Tema; alternar: () => void } {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem(CLAVE, tema);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#0f1116' : '#2f6bff');
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }, []);

  return { tema, alternar };
}
