/* Preparación de imágenes para guardarlas en Firestore.

   Cloud Storage exige el plan Blaze desde febrero de 2026, así que en el
   plan gratuito la única vía es guardar la imagen dentro del propio
   documento, en base64.

   Eso impone un límite duro: un documento de Firestore no puede pasar de
   1 MiB, y base64 agrega ~33% al tamaño original. Por eso toda imagen se
   redimensiona y se recomprime antes de guardarla, apuntando a unos 250 KB,
   que es de sobra para una publicación de Facebook. */

/** Tope real de bytes que aceptamos, con margen sobre el límite de Firestore. */
export const MAX_BYTES = 700 * 1024;

const LADO_MAXIMO = 1280;
const OBJETIVO_BYTES = 250 * 1024;

export interface ImagenLista {
  datos: string;
  peso: number;
  ancho: number;
  alto: number;
}

/** Redimensiona y comprime hasta quedar bajo el objetivo. */
export function prepararImagen(archivo: File): Promise<ImagenLista> {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      rechazar(new Error('El archivo no es una imagen.'));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => rechazar(new Error('La imagen está dañada o no se puede abrir.'));
      img.onload = () => {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);

        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        const ctx = lienzo.getContext('2d');
        if (!ctx) {
          rechazar(new Error('El navegador no permitió procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);

        /* Se baja la calidad por pasos hasta entrar en el objetivo. Empezar
           directo en calidad baja arruinaría fotos que cabían bien. */
        let calidad = 0.85;
        let datos = lienzo.toDataURL('image/jpeg', calidad);
        while (pesoDe(datos) > OBJETIVO_BYTES && calidad > 0.4) {
          calidad -= 0.1;
          datos = lienzo.toDataURL('image/jpeg', calidad);
        }

        const peso = pesoDe(datos);
        if (peso > MAX_BYTES) {
          rechazar(new Error('La imagen es demasiado pesada incluso comprimida.'));
          return;
        }

        resolver({ datos, peso, ancho, alto });
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

function pesoDe(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

export function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Copia la imagen al portapapeles para pegarla directo en Facebook. */
export async function copiarImagen(dataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
    /* El portapapeles solo acepta PNG, así que se reconvierte. */
    const img = await cargar(dataUrl);
    const lienzo = document.createElement('canvas');
    lienzo.width = img.width;
    lienzo.height = img.height;
    lienzo.getContext('2d')?.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/png'));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Descarga la imagen: el respaldo cuando el portapapeles no está disponible. */
export function descargarImagen(dataUrl: string, nombre: string): void {
  const enlace = document.createElement('a');
  enlace.href = dataUrl;
  enlace.download = nombre.endsWith('.jpg') ? nombre : `${nombre}.jpg`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
}

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error('No se pudo cargar la imagen.'));
    img.src = src;
  });
}
