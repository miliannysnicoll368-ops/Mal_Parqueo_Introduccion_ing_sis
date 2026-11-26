import type {
  Criterios,
  CriticidadResultado,
  FranjaHoraria,
  NivelCriticidad,
  Reporte,
  ViasMap,
} from '../types/monitoring';

function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Determina si la fecha/hora pertenece a franja pico o valle según criterios.horas_pico.
 * Función pura sin acceso al DOM.
 */
export function obtenerFranja(
  fechaHora: string,
  horasPico: string[] = []
): FranjaHoraria {
  if (!fechaHora || !fechaHora.includes('T')) return 'valle';
  const horaStr = fechaHora.split('T')[1].slice(0, 5);
  const minutos = horaAMinutos(horaStr);

  for (const rango of horasPico) {
    const [inicio, fin] = rango.split('-');
    if (inicio && fin && minutos >= horaAMinutos(inicio) && minutos <= horaAMinutos(fin)) {
      return 'pico';
    }
  }
  return 'valle';
}

/**
 * Calcula puntaje y nivel de criticidad de un reporte usando vias.json y criterios.json.
 * Función pura y determinista, sin acceso al DOM ni al mapa.
 */
export function calcularCriticidad(
  reporte: Pick<Reporte, 'categoria' | 'cuadra' | 'fecha_hora'>,
  vias: ViasMap,
  criterios: Criterios
): CriticidadResultado {
  const ptsCategoria = criterios.categoria?.[reporte.categoria] ?? 0;

  const infoVia = vias?.[reporte.cuadra];
  const tipoVia = infoVia ? infoVia.tipo : 'secundaria';
  const ptsVia = criterios.via?.[tipoVia] ?? 0;

  const franja = obtenerFranja(reporte.fecha_hora, criterios.horas_pico);
  const ptsFranja = criterios.franja?.[franja] ?? 0;

  const puntaje = ptsCategoria + ptsVia + ptsFranja;

  let nivel: NivelCriticidad = 'Bajo';
  for (const [nombreNivel, rango] of Object.entries(criterios.niveles || {})) {
    const [min, max] = rango;
    if (puntaje >= min && puntaje <= max) {
      nivel = nombreNivel as NivelCriticidad;
      break;
    }
  }

  return {
    puntaje,
    nivel,
    franja,
    tipoVia,
    desglose: {
      categoria: ptsCategoria,
      via: ptsVia,
      franja: ptsFranja,
    },
  };
}

/**
 * Calcula el puntaje máximo posible según criterios.json para normalizar el mapa de calor.
 */
export function obtenerPuntajeMaximo(criterios: Criterios): number {
  const maxCat = Math.max(...Object.values(criterios.categoria || { default: 3 }));
  const maxVia = Math.max(...Object.values(criterios.via || { default: 3 }));
  const maxFranja = Math.max(...Object.values(criterios.franja || { default: 3 }));
  return maxCat + maxVia + maxFranja || 9;
}
