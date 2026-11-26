import L from 'leaflet';

// Asegura que window.L exista antes de cargar el plugin leaflet.heat en Vite
export async function cargarLeafletConHeat(): Promise<typeof L> {
  if (typeof window !== 'undefined') {
    (window as unknown as { L: typeof L }).L = L;
    const lAny = L as unknown as { heatLayer?: unknown };
    if (typeof lAny.heatLayer !== 'function') {
      await import('leaflet.heat');
    }
  }
  return L;
}

export { L };
