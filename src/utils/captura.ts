import type { ViasMap } from '../types/monitoring';

/**
 * Distancia aproximada en metros entre dos coordenadas geográficas (fórmula de Haversine).
 */
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (g: number) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Encuentra la cuadra más cercana en vias.json a partir de lat y lng.
 */
export function detectarCuadraCercana(
  lat: number,
  lng: number,
  vias: ViasMap
): { cuadra: string | null; distancia: number } {
  let mejorCuadra: string | null = null;
  let menorDist = Infinity;

  for (const [id, info] of Object.entries(vias)) {
    if (typeof info.lat !== 'number' || typeof info.lng !== 'number') continue;
    const d = distanciaMetros(lat, lng, info.lat, info.lng);
    if (d < menorDist) {
      menorDist = d;
      mejorCuadra = id;
    }
  }

  return {
    cuadra: mejorCuadra,
    distancia: Number.isFinite(menorDist) ? Math.round(menorDist) : 0,
  };
}

/**
 * Reduce una imagen seleccionada a un máximo de 800 px de ancho antes de guardarla.
 */
export function comprimirImagen(
  archivo: File,
  maxAncho = 800,
  calidad = 0.74
): Promise<{ dataUrl: string; ancho: number; alto: number; kb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let ancho = img.width;
        let alto = img.height;

        if (ancho > maxAncho) {
          alto = Math.round((alto * maxAncho) / ancho);
          ancho = maxAncho;
        }

        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el contexto de imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, ancho, alto);

        const dataUrl = canvas.toDataURL('image/jpeg', calidad);
        const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, ancho, alto, kb });
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('No se pudo cargar el archivo.'));
    reader.readAsDataURL(archivo);
  });
}

/**
 * Aplica un pixelado localizado sobre un área de una imagen DataURL (protección de placas y rostros).
 */
export function pixelarZonaImagen(
  dataUrl: string,
  normX: number,
  normY: number,
  radioNorm = 0.09
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar el pixelado.'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const boxW = Math.max(24, Math.round(img.width * radioNorm * 1.4));
      const boxH = Math.max(18, Math.round(img.height * radioNorm));
      const startX = Math.max(0, Math.round(normX * img.width - boxW / 2));
      const startY = Math.max(0, Math.round(normY * img.height - boxH / 2));
      const w = Math.min(boxW, img.width - startX);
      const h = Math.min(boxH, img.height - startY);

      if (w > 0 && h > 0) {
        const tempCanvas = document.createElement('canvas');
        const blocksX = Math.max(3, Math.round(w / 10));
        const blocksY = Math.max(3, Math.round(h / 10));
        tempCanvas.width = blocksX;
        tempCanvas.height = blocksY;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, startX, startY, w, h, 0, 0, blocksX, blocksY);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, 0, 0, blocksX, blocksY, startX, startY, w, h);
        }
      }

      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => reject(new Error('Error cargando imagen para pixelar.'));
    img.src = dataUrl;
  });
}
