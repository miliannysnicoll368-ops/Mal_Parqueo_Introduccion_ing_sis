export type CategoriaObstruccion =
  | 'doble_fila'
  | 'bloqueo_rampa_cebra_paradero'
  | 'invasion_anden';

export type TipoActor =
  | 'vehiculo_particular'
  | 'motocicleta'
  | 'vehiculo_carga'
  | 'mobiliario_comercial';

export type OrigenReporte = 'ciudadano' | 'campo';

export type TipoVia = 'arterial' | 'secundaria';

export type FranjaHoraria = 'pico' | 'valle';

export type NivelCriticidad = 'Bajo' | 'Medio' | 'Alto';

export interface ViaInfo {
  nombre: string;
  sector: string;
  tipo: TipoVia;
  lat: number;
  lng: number;
}

export type ViasMap = Record<string, ViaInfo>;

export interface Criterios {
  categoria: Record<CategoriaObstruccion, number>;
  via: Record<TipoVia, number>;
  franja: Record<FranjaHoraria, number>;
  horas_pico: string[];
  niveles: Record<NivelCriticidad, [number, number]>;
}

export interface CriticidadResultado {
  puntaje: number;
  nivel: NivelCriticidad;
  franja: FranjaHoraria;
  tipoVia: TipoVia;
  desglose: {
    categoria: number;
    via: number;
    franja: number;
  };
}

export interface Reporte {
  id: string;
  origen: OrigenReporte;
  fecha_hora: string;
  lat: number;
  lng: number;
  cuadra: string;
  categoria: CategoriaObstruccion;
  actor: TipoActor;
  foto?: string;
  criticidad?: Partial<CriticidadResultado> & {
    puntaje: number;
    nivel: NivelCriticidad;
  };
}

export interface ReporteCalculado extends Reporte {
  criticidad: CriticidadResultado;
}

export interface FiltrosActivos {
  sector: string;
  cuadra: string;
  franja: 'todas' | FranjaHoraria;
  horaInicio: string;
  horaFin: string;
  categoria: 'todas' | CategoriaObstruccion;
  actor: 'todos' | TipoActor;
  busqueda: string;
}

export interface EstadisticasReportes {
  total: number;
  porNivel: Record<NivelCriticidad, number>;
  porCategoria: Record<CategoriaObstruccion, number>;
  porcentajesCategoria: Record<CategoriaObstruccion, number>;
  puntajePromedio: number;
}

export interface ResumenCuadra {
  puesto: number;
  cuadra: string;
  nombre: string;
  sector: string;
  tipoVia: TipoVia;
  cantidad: number;
  puntajeTotal: number;
  altoEnPico: number;
  categorias: Partial<Record<CategoriaObstruccion, number>>;
  actores: Partial<Record<TipoActor, number>>;
  recomendacion: string;
  regla: string;
}
