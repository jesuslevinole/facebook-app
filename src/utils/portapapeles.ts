/* Copiar + abrir tienen que ocurrir dentro del mismo gesto del usuario.
   Si se hace `await copiar(...)` y recién después `window.open(...)`, Safari
   iOS bloquea la ventana por perder el gesto. Por eso `copiar` no se espera:
   se dispara y de inmediato se abre el grupo. */

export function copiar(texto: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(texto).then(
      () => true,
      () => copiaLegacy(texto)
    );
  }
  return Promise.resolve(copiaLegacy(texto));
}

function copiaLegacy(texto: string): boolean {
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.className = 'sr-only';
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, texto.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

export function abrirEnPestana(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
