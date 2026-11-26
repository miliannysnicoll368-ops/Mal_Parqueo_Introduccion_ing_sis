import { obtenerFranja } from './criticidad';
import type {
  CategoriaObstruccion,
  Criterios,
  ReporteCalculado,
  ResumenCuadra,
  TipoActor,
  TipoVia,
  ViasMap,
} from '../types/monitoring';

export const NOMBRES_CATEGORIA: Record<CategoriaObstruccion, string> = {
  doble_fila: 'Estacionamiento en vía prohibida o doble fila',
  bloqueo_rampa_cebra_paradero: 'Bloqueo de rampa peatonal, cebra o paradero',
  invasion_anden: 'Invasión de andén por comercio o mercancía',
};

export const NOMBRES_CORTOS_CATEGORIA: Record<CategoriaObstruccion, string> = {
  doble_fila: 'Doble fila / vía prohibida',
  bloqueo_rampa_cebra_paradero: 'Bloqueo rampa / cebra / paradero',
  invasion_anden: 'Invasión de andén',
};

export const NOMBRES_ACTOR: Record<TipoActor, string> = {
  vehiculo_particular: 'Vehículo particular',
  motocicleta: 'Motocicleta',
  vehiculo_carga: 'Vehículo de carga descargando',
  mobiliario_comercial: 'Mobiliario comercial',
};

interface GrupoCuadra {
  cuadra: string;
  nombre: string;
  sector: string;
  tipoVia: TipoVia;
  cantidad: number;
  puntajeTotal: number;
  altoEnPico: number;
  categorias: Partial<Record<CategoriaObstruccion, number>>;
  actores: Partial<Record<TipoActor, number>>;
}

function aplicarReglaRecomendacion(grupo: GrupoCuadra): {
  recomendacion: string;
  regla: string;
} {
  const total = grupo.cantidad;

  if (grupo.altoEnPico >= 3) {
    return {
      recomendacion: 'Patrullaje prioritario en hora pico',
      regla: `Regla 1: ${grupo.altoEnPico} reportes de nivel Alto en hora pico (≥ 3).`,
    };
  }

  const catOrdenadas = Object.entries(grupo.categorias).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
  ) as [CategoriaObstruccion, number][];
  const [catTop, catCount] = catOrdenadas[0] || ['invasion_anden', 0];

  const actOrdenados = Object.entries(grupo.actores).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
  ) as [TipoActor, number][];
  const [actTop, actCount] = actOrdenados[0] || ['motocicleta', 0];

  if (actTop === 'vehiculo_carga' && actCount > total / 2) {
    return {
      recomendacion: 'Revisar horario de cargue y descargue',
      regla: `Regla 2: Predomina "Vehículo de carga descargando" (${actCount} de ${total} reportes).`,
    };
  }

  if (catTop === 'invasion_anden' && catCount >= total / 2) {
    return {
      recomendacion: 'Operativo de espacio público',
      regla: `Regla 3: Predomina "${NOMBRES_CORTOS_CATEGORIA.invasion_anden}" (${catCount} de ${total} reportes).`,
    };
  }

  if (actTop === 'vehiculo_carga' && actCount >= 2) {
    return {
      recomendacion: 'Revisar horario de cargue y descargue',
      regla: `Regla 4: Alta incidencia de "Vehículo de carga descargando" (${actCount} de ${total} reportes).`,
    };
  }

  if (catTop === 'bloqueo_rampa_cebra_paradero') {
    return {
      recomendacion: 'Control de accesibilidad y despeje de cruces',
      regla: `Regla 5: Predomina "${NOMBRES_CORTOS_CATEGORIA.bloqueo_rampa_cebra_paradero}" (${catCount} de ${total}).`,
    };
  }

  if (catTop === 'doble_fila') {
    return {
      recomendacion: 'Control vial contra parqueo en doble fila',
      regla: `Regla 6: Predomina "${NOMBRES_CORTOS_CATEGORIA.doble_fila}" (${catCount} de ${total}).`,
    };
  }

  return {
    recomendacion: 'Monitoreo preventivo en la cuadra',
    regla: `Regla general: Recurrencia mixta (${total} reportes, ${grupo.puntajeTotal} pts).`,
  };
}

/**
 * Agrupa reportes por cuadra, suma puntajes, ordena descendentemente y devuelve el Top 5
 * con su recomendación y regla explícita (RF-05).
 */
export function generarResumenOperativo(
  reportes: ReporteCalculado[],
  vias: ViasMap,
  criterios: Criterios
): ResumenCuadra[] {
  const grupos: Record<string, GrupoCuadra> = {};

  for (const r of reportes) {
    const idCuadra = r.cuadra || 'SIN-CUADRA';
    if (!grupos[idCuadra]) {
      const infoVia = vias[idCuadra];
      grupos[idCuadra] = {
        cuadra: idCuadra,
        nombre: infoVia?.nombre || idCuadra,
        sector: infoVia?.sector || 'Sin sector',
        tipoVia: infoVia?.tipo || 'secundaria',
        cantidad: 0,
        puntajeTotal: 0,
        altoEnPico: 0,
        categorias: {},
        actores: {},
      };
    }

    const g = grupos[idCuadra];
    const puntaje = r.criticidad?.puntaje ?? 0;
    const nivel = r.criticidad?.nivel || 'Bajo';
    const franja =
      r.criticidad?.franja || obtenerFranja(r.fecha_hora, criterios.horas_pico);

    g.cantidad += 1;
    g.puntajeTotal += puntaje;

    if (nivel === 'Alto' && franja === 'pico') {
      g.altoEnPico += 1;
    }

    g.categorias[r.categoria] = (g.categorias[r.categoria] || 0) + 1;
    g.actores[r.actor] = (g.actores[r.actor] || 0) + 1;
  }

  const listaOrdenada = Object.values(grupos).sort((a, b) => {
    if (b.puntajeTotal !== a.puntajeTotal) return b.puntajeTotal - a.puntajeTotal;
    return b.cantidad - a.cantidad;
  });

  return listaOrdenada.slice(0, 5).map((grupo, idx) => {
    const { recomendacion, regla } = aplicarReglaRecomendacion(grupo);
    return {
      puesto: idx + 1,
      ...grupo,
      recomendacion,
      regla,
    };
  });
}
