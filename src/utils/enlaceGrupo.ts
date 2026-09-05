/* Comparación de enlaces de grupos de Facebook.

   El mismo grupo llega escrito de muchas formas según de dónde se copie el
   enlace: con o sin `www`, desde `m.facebook.com` o `web.facebook.com`, con
   barra final, y casi siempre con parámetros de seguimiento
   (`?ref=share&mibextid=…`) que cambian en cada copiado.

   Para saber si dos enlaces son el mismo grupo se extrae su identificador
   —lo que va después de `/groups/`— y se compara solo eso. Si el enlace no
   tiene esa forma, se cae a una normalización genérica. */

export function claveEnlace(url: string): string {
  const limpio = url.trim().toLowerCase();
  if (!limpio) return '';

  const porGrupo = limpio.match(/\/groups\/([^/?#]+)/);
  if (porGrupo) return `grupo:${porGrupo[1]}`;

  return limpio
    .replace(/^https?:\/\//, '')
    .replace(/^(www|m|web|mbasic)\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

/** Devuelve el grupo que ya usa ese enlace, si existe. */
export function grupoConMismoEnlace<T extends { id: string; url: string; nombre: string }>(
  url: string,
  grupos: T[],
  excluirId?: string
): T | undefined {
  const clave = claveEnlace(url);
  if (!clave) return undefined;
  return grupos.find((g) => g.id !== excluirId && claveEnlace(g.url) === clave);
}
