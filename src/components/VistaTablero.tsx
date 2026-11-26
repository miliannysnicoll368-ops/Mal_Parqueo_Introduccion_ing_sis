import { useRef, useState } from 'react';
import {
  Download,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { MapaTablero } from './MapaTablero';
import { DetalleReporteModal } from './DetalleReporteModal';
import {
  NOMBRES_CATEGORIA,
  NOMBRES_CORTOS_CATEGORIA,
} from '../utils/resumen';
import { FILTROS_INICIALES } from '../utils/filtros';
import type {
  CategoriaObstruccion,
  Criterios,
  EstadisticasReportes,
  FiltrosActivos,
  Reporte,
  ReporteCalculado,
  ResumenCuadra,
  ViasMap,
} from '../types/monitoring';

interface VistaTableroProps {
  vias: ViasMap;
  criterios: Criterios;
  filtros: FiltrosActivos;
  onCambiarFiltros: (nuevos: FiltrosActivos) => void;
  reportesFiltrados: ReporteCalculado[];
  todosReportes: ReporteCalculado[];
  estadisticas: EstadisticasReportes;
  resumenTop5: ResumenCuadra[];
  cantidadLocales: number;
  onImportarJson: (importados: Reporte[]) => { agregados: number; duplicados: number };
  onLimpiarLocales: () => void;
}

export function VistaTablero({
  vias,
  criterios,
  filtros,
  onCambiarFiltros,
  reportesFiltrados,
  todosReportes,
  estadisticas,
  resumenTop5,
  cantidadLocales,
  onImportarJson,
  onLimpiarLocales,
}: VistaTableroProps) {
  const [verCalor, setVerCalor] = useState(true);
  const [verPuntos, setVerPuntos] = useState(true);
  const [focoCoords, setFocoCoords] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    seq: number;
  } | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] =
    useState<ReporteCalculado | null>(null);
  const [mensajeIo, setMensajeIo] = useState<string>('');
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);
  const inputImportarRef = useRef<HTMLInputElement | null>(null);

  const sectores = Array.from(
    new Set(Object.values(vias).map((v) => v.sector))
  );

  const enfocarCuadra = (cuadraId: string) => {
    const via = vias[cuadraId];
    if (!via) return;
    setFocoCoords({
      lat: via.lat,
      lng: via.lng,
      zoom: 18,
      seq: Date.now(),
    });
  };

  const exportarJson = () => {
    const contenido = JSON.stringify(todosReportes, null, 2);
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reportes-santa-marta-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMensajeIo(`Se exportaron ${todosReportes.length} reportes en formato JSON.`);
  };

  const manejarImportacion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const texto = await file.text();
      const data = JSON.parse(texto);
      if (!Array.isArray(data)) {
        throw new Error('El archivo debe contener un arreglo JSON de reportes.');
      }
      const { agregados, duplicados } = onImportarJson(data);
      setMensajeIo(
        `Importación completada: ${agregados} reportes nuevos añadidos, ${duplicados} duplicados omitidos por ID.`
      );
    } catch {
      setMensajeIo(
        'Error: el archivo seleccionado no tiene un formato JSON válido de reportes.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const categoriasLista: CategoriaObstruccion[] = [
    'invasion_anden',
    'doble_fila',
    'bloqueo_rampa_cebra_paradero',
  ];

  const hayFiltrosActivos =
    filtros.sector !== 'todos' ||
    filtros.cuadra !== 'todas' ||
    filtros.franja !== 'todas' ||
    filtros.horaInicio !== '' ||
    filtros.horaFin !== '' ||
    filtros.categoria !== 'todas' ||
    filtros.actor !== 'todos' ||
    filtros.busqueda !== '';

  return (
    <div className="space-y-6">
      {/* Encabezado exclusivo para impresión */}
      <div className="print-only hidden border-b border-slate-300 pb-3">
        <h1 className="text-xl font-bold text-slate-900">
          Resumen Operativo · Control de Mal Parqueo e Invasión de Andenes (Santa Marta)
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Emitido el {new Date().toLocaleDateString('es-CO')} · Total reportes
          analizados: {estadisticas.total} (Alto: {estadisticas.porNivel.Alto}, Medio:{' '}
          {estadisticas.porNivel.Medio}, Bajo: {estadisticas.porNivel.Bajo})
        </p>
      </div>

      {/* Barra de filtros */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Filtros de análisis espacial y temporal
            </h2>
            <p className="text-xs text-slate-500">
              Los indicadores, mapa de calor y Top 5 se recalculan al instante sin recargar.
            </p>
          </div>
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={() => onCambiarFiltros(FILTROS_INICIALES)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label
              htmlFor="filtro-sector"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Sector
            </label>
            <select
              id="filtro-sector"
              value={filtros.sector}
              onChange={(e) =>
                onCambiarFiltros({ ...filtros, sector: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              <option value="todos">Todos los sectores</option>
              {sectores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-cuadra"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Cuadra
            </label>
            <select
              id="filtro-cuadra"
              value={filtros.cuadra}
              onChange={(e) =>
                onCambiarFiltros({ ...filtros, cuadra: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              <option value="todas">Todas las cuadras</option>
              {Object.entries(vias).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-franja"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Franja horaria
            </label>
            <select
              id="filtro-franja"
              value={filtros.franja}
              onChange={(e) =>
                onCambiarFiltros({
                  ...filtros,
                  franja: e.target.value as FiltrosActivos['franja'],
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              <option value="todas">Todas las franjas</option>
              <option value="pico">Hora pico</option>
              <option value="valle">Hora valle</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-categoria"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Categoría
            </label>
            <select
              id="filtro-categoria"
              value={filtros.categoria}
              onChange={(e) =>
                onCambiarFiltros({
                  ...filtros,
                  categoria: e.target.value as FiltrosActivos['categoria'],
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              <option value="todas">Todas las categorías</option>
              <option value="doble_fila">Vía prohibida o doble fila</option>
              <option value="bloqueo_rampa_cebra_paradero">
                Bloqueo rampa / cebra / paradero
              </option>
              <option value="invasion_anden">Invasión de andén</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-actor"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Tipo de actor
            </label>
            <select
              id="filtro-actor"
              value={filtros.actor}
              onChange={(e) =>
                onCambiarFiltros({
                  ...filtros,
                  actor: e.target.value as FiltrosActivos['actor'],
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              <option value="todos">Todos los actores</option>
              <option value="vehiculo_particular">Vehículo particular</option>
              <option value="motocicleta">Motocicleta</option>
              <option value="vehiculo_carga">Vehículo de carga</option>
              <option value="mobiliario_comercial">Mobiliario comercial</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label
                htmlFor="filtro-hora-inicio"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Desde
              </label>
              <input
                id="filtro-hora-inicio"
                type="time"
                value={filtros.horaInicio}
                onChange={(e) =>
                  onCambiarFiltros({ ...filtros, horaInicio: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="filtro-hora-fin"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Hasta
              </label>
              <input
                id="filtro-hora-fin"
                type="time"
                value={filtros.horaFin}
                onChange={(e) =>
                  onCambiarFiltros({ ...filtros, horaFin: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-[#0f4c81] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Franja KPI de 4 columnas */}
      <section className="no-print grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
        <div className="border-b border-r border-slate-200 px-5 py-4 lg:border-b-0">
          <span className="text-xs font-medium text-slate-500">
            Reportes filtrados
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="font-mono-tabular text-2xl font-semibold text-slate-900">
              {estadisticas.total}
            </strong>
            <span className="font-mono-tabular text-xs text-slate-500">
              de {todosReportes.length} totales
            </span>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-4 lg:border-b-0 lg:border-r">
          <span className="text-xs font-medium text-slate-500">
            Criticidad Alta ({criterios.niveles.Alto[0]}–{criterios.niveles.Alto[1]} pts)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="font-mono-tabular text-2xl font-semibold text-red-600">
              {estadisticas.porNivel.Alto}
            </strong>
            <span className="text-xs text-slate-500">Prioridad inmediata</span>
          </div>
        </div>

        <div className="border-r border-slate-200 px-5 py-4">
          <span className="text-xs font-medium text-slate-500">
            Criticidad Media ({criterios.niveles.Medio[0]}–{criterios.niveles.Medio[1]} pts)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="font-mono-tabular text-2xl font-semibold text-amber-600">
              {estadisticas.porNivel.Medio}
            </strong>
            <span className="text-xs text-slate-500">Control programado</span>
          </div>
        </div>

        <div className="px-5 py-4">
          <span className="text-xs font-medium text-slate-500">
            Criticidad Baja ({criterios.niveles.Bajo[0]}–{criterios.niveles.Bajo[1]} pts)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="font-mono-tabular text-2xl font-semibold text-emerald-600">
              {estadisticas.porNivel.Bajo}
            </strong>
            <span className="font-mono-tabular text-xs text-slate-500">
              Prom. {estadisticas.puntajePromedio} pts
            </span>
          </div>
        </div>
      </section>

      {/* Mapa de Calor + Distribución por Categoría */}
      <section className="no-print grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Mapa de calor e incidentes individuales
              </h2>
              <p className="text-xs text-slate-500">
                Intensidad ponderada por el puntaje de criticidad · Haz clic en un punto para ver su ficha
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={verCalor}
                  onChange={(e) => setVerCalor(e.target.checked)}
                  className="rounded border-slate-300 text-[#0f4c81] focus:ring-[#0f4c81]"
                />
                Mapa de calor
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={verPuntos}
                  onChange={(e) => setVerPuntos(e.target.checked)}
                  className="rounded border-slate-300 text-[#0f4c81] focus:ring-[#0f4c81]"
                />
                Puntos individuales
              </label>
            </div>
          </div>

          <MapaTablero
            reportes={reportesFiltrados}
            vias={vias}
            criterios={criterios}
            verCalor={verCalor}
            verPuntos={verPuntos}
            focoCoords={focoCoords}
            onSeleccionarReporte={(r) => setReporteSeleccionado(r)}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                Alto ({criterios.niveles.Alto[0]}–{criterios.niveles.Alto[1]} pts)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                Medio ({criterios.niveles.Medio[0]}–{criterios.niveles.Medio[1]} pts)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Bajo ({criterios.niveles.Bajo[0]}–{criterios.niveles.Bajo[1]} pts)
              </span>
            </div>
            <span className="text-slate-500">
              Cartografía: OpenStreetMap · Centro Histórico &amp; Av. Campo Serrano
            </span>
          </div>
        </div>

        {/* Distribución por categoría y Portabilidad JSON */}
        <div className="flex flex-col justify-between gap-6 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Distribución por categoría
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Porcentaje sobre los {estadisticas.total} reportes visibles
            </p>

            <div className="mt-4 space-y-4">
              {categoriasLista.map((cat) => {
                const count = estadisticas.porCategoria[cat];
                const pct = estadisticas.porcentajesCategoria[cat];
                return (
                  <div key={cat}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800">
                        {NOMBRES_CATEGORIA[cat]}
                      </span>
                      <span className="font-mono-tabular shrink-0 font-semibold text-slate-900">
                        {pct}% ({count})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-[#0f4c81] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exportar e Importar JSON */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Reunir e intercambiar reportes (JSON)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Exporta los registros o importa archivos de otros integrantes sin duplicar por ID.
            </p>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportarJson}
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0f4c81] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a355c]"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar JSON
              </button>

              <button
                type="button"
                onClick={() => inputImportarRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Importar JSON
              </button>
              <input
                ref={inputImportarRef}
                type="file"
                accept=".json,application/json"
                onChange={manejarImportacion}
                className="hidden"
              />

              {cantidadLocales > 0 && !confirmarLimpiar && (
                <button
                  type="button"
                  onClick={() => setConfirmarLimpiar(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar locales ({cantidadLocales})
                </button>
              )}

              {confirmarLimpiar && (
                <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <span>¿Borrar {cantidadLocales} reportes locales?</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onLimpiarLocales();
                        setConfirmarLimpiar(false);
                        setMensajeIo(
                          'Se eliminaron los reportes guardados localmente; se conservan los registros base.'
                        );
                      }}
                      className="rounded bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarLimpiar(false)}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {mensajeIo && (
              <p className="mt-2.5 text-xs font-medium text-[#0f4c81]">
                {mensajeIo}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Resumen Operativo Imprimible: Top 5 Cuadras Críticas */}
      <section className="print-sheet rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Resumen operativo · Top 5 cuadras más críticas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ordenadas por puntaje acumulado · Haz clic en una cuadra para centrar el mapa
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir resumen
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Cuadra y sector</th>
                <th className="px-3 py-2.5 text-right">Reportes</th>
                <th className="px-3 py-2.5 text-right">Puntaje</th>
                <th className="px-3 py-2.5">Recomendación operativa</th>
                <th className="px-3 py-2.5">Regla que la produjo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {resumenTop5.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No hay reportes disponibles para calcular el Top 5 con los filtros actuales.
                  </td>
                </tr>
              ) : (
                resumenTop5.map((item) => (
                  <tr
                    key={item.cuadra}
                    onClick={() => enfocarCuadra(item.cuadra)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="font-mono-tabular px-3 py-3 font-semibold text-slate-900">
                      {item.puesto}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">
                        {item.nombre}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.sector} · Vía {item.tipoVia} · {item.cuadra}
                      </div>
                    </td>
                    <td className="font-mono-tabular px-3 py-3 text-right text-slate-900">
                      <div>{item.cantidad}</div>
                      <div className="text-xs text-slate-500">
                        {item.altoEnPico} Alto pico
                      </div>
                    </td>
                    <td className="font-mono-tabular px-3 py-3 text-right font-semibold text-[#0f4c81]">
                      {item.puntajeTotal} pts
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {item.recomendacion}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {item.regla}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Nota de categorías activas para versión impresa */}
        <div className="print-only mt-6 hidden border-t border-slate-200 pt-3 text-xs text-slate-600">
          Distribución por categoría:{' '}
          {categoriasLista
            .map(
              (c) =>
                `${NOMBRES_CORTOS_CATEGORIA[c]}: ${estadisticas.porcentajesCategoria[c]}% (${estadisticas.porCategoria[c]})`
            )
            .join(' · ')}
        </div>
      </section>

      <DetalleReporteModal
        reporte={reporteSeleccionado}
        vias={vias}
        onCerrar={() => setReporteSeleccionado(null)}
      />
    </div>
  );
}
