import { obtenerFranja } from './criticidad';
import type {
  CategoriaObstruccion,
  Criterios,
  EstadisticasReportes,
  FiltrosActivos,
  ReporteCalculado,
  ViasMap,
} from '../types/monitoring';

export const FILTROS_INICIALES: FiltrosActivos = {
  sector: 'todos',
  cuadra: 'todas',
  franja: 'todas',
  horaInicio: '',
  horaFin: '',
  categoria: 'todas',
  actor: 'todos',
  busqueda: '',
};

/**
 * Filtra la lista de reportes aplicando todas las condiciones activas.
 */
export function filtrarReportes(
  reportes: ReporteCalculado[],
  filtros: FiltrosActivos,
  vias: ViasMap,
  criterios: Criterios
): ReporteCalculado[] {
  const query = filtros.busqueda.trim().toLowerCase();

  return reportes.filter((reporte) => {
    const infoVia = vias[reporte.cuadra];

    if (filtros.sector && filtros.sector !== 'todos') {
      const sectorReporte = infoVia ? infoVia.sector : 'Otro';
      if (sectorReporte !== filtros.sector) return false;
    }

    if (filtros.cuadra && filtros.cuadra !== 'todas') {
      if (reporte.cuadra !== filtros.cuadra) return false;
    }

    if (filtros.franja && filtros.franja !== 'todas') {
      const franjaReporte =
        reporte.criticidad?.franja ||
        obtenerFranja(reporte.fecha_hora, criterios.horas_pico);
      if (franjaReporte !== filtros.franja) return false;
    }

    if (filtros.horaInicio || filtros.horaFin) {
      const hora = (reporte.fecha_hora || '').split('T')[1]?.slice(0, 5) || '00:00';
      if (filtros.horaInicio && hora < filtros.horaInicio) return false;
      if (filtros.horaFin && hora > filtros.horaFin) return false;
    }

    if (filtros.categoria && filtros.categoria !== 'todas') {
      if (reporte.categoria !== filtros.categoria) return false;
    }

    if (filtros.actor && filtros.actor !== 'todos') {
      if (reporte.actor !== filtros.actor) return false;
    }

    if (query) {
      const nombreVia = (infoVia?.nombre || '').toLowerCase();
      const sectorVia = (infoVia?.sector || '').toLowerCase();
      const id = reporte.id.toLowerCase();
      const cuadra = reporte.cuadra.toLowerCase();
      if (
        !id.includes(query) &&
        !cuadra.includes(query) &&
        !nombreVia.includes(query) &&
        !sectorVia.includes(query)
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calcula conteos totales, por nivel, puntaje promedio y porcentajes por categoría.
 */
export function calcularEstadisticas(
  reportes: ReporteCalculado[]
): EstadisticasReportes {
  const total = reportes.length;
  const porNivel = { Alto: 0, Medio: 0, Bajo: 0 };
  const porCategoria: Record<CategoriaObstruccion, number> = {
    doble_fila: 0,
    bloqueo_rampa_cebra_paradero: 0,
    invasion_anden: 0,
  };

  let sumaPuntaje = 0;

  for (const r of reportes) {
    const nivel = r.criticidad?.nivel || 'Bajo';
    porNivel[nivel] += 1;
    sumaPuntaje += r.criticidad?.puntaje ?? 0;

    if (porCategoria[r.categoria] !== undefined) {
      porCategoria[r.categoria] += 1;
    }
  }

  const porcentajesCategoria: Record<CategoriaObstruccion, number> = {
    doble_fila:
      total > 0 ? Math.round((porCategoria.doble_fila / total) * 100) : 0,
    bloqueo_rampa_cebra_paradero:
      total > 0
        ? Math.round((porCategoria.bloqueo_rampa_cebra_paradero / total) * 100)
        : 0,
    invasion_anden:
      total > 0 ? Math.round((porCategoria.invasion_anden / total) * 100) : 0,
  };

  return {
    total,
    porNivel,
    porCategoria,
    porcentajesCategoria,
    puntajePromedio: total > 0 ? Number((sumaPuntaje / total).toFixed(1)) : 0,
  };
}
