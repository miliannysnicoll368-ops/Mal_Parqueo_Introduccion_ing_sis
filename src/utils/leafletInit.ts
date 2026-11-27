import L from 'leaflet';
import { HeatLayer } from 'leaflet.heat';

export interface OpcionesCalor {
  radius?: number;
  blur?: number;
  minOpacity?: number;
  maxZoom?: number;
  max?: number;
  gradient?: Record<number, string>;
}

/**
 * Crea una instancia de capa de calor compatible con leaflet.heat v1.0.1 y Leaflet 1.9.x.
 */
export function crearCapaCalor(
  puntos: [number, number, number][],
  opciones: OpcionesCalor = {}
): L.Layer {
  const HeatConstructor = HeatLayer as unknown as new (
    latlngs: [number, number, number][],
    options?: OpcionesCalor
  ) => L.Layer;
  return new HeatConstructor(puntos, opciones);
}

export { L };
