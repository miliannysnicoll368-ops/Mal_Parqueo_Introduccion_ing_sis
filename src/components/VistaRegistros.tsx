import { useState } from 'react';
import { Search } from 'lucide-react';
import { DetalleReporteModal } from './DetalleReporteModal';
import {
  NOMBRES_ACTOR,
  NOMBRES_CORTOS_CATEGORIA,
} from '../utils/resumen';
import type {
  FiltrosActivos,
  ReporteCalculado,
  ViasMap,
} from '../types/monitoring';

interface VistaRegistrosProps {
  reportesFiltrados: ReporteCalculado[];
  vias: ViasMap;
  filtros: FiltrosActivos;
  onCambiarFiltros: (nuevos: FiltrosActivos) => void;
}

export function VistaRegistros({
  reportesFiltrados,
  vias,
  filtros,
  onCambiarFiltros,
}: VistaRegistrosProps) {
  const [seleccionado, setSeleccionado] = useState<ReporteCalculado | null>(
    null
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Registro de incidentes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Listado completo de reportes georreferenciados con cálculo individual de criticidad
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) =>
              onCambiarFiltros({ ...filtros, busqueda: e.target.value })
            }
            placeholder="Buscar por ID, cuadra o sector..."
            className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0f4c81] focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Cuadra y sector</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3 text-right">Desglose</th>
                <th className="px-4 py-3 text-right">Criticidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No hay registros que coincidan con la búsqueda o filtros activos.
                  </td>
                </tr>
              ) : (
                reportesFiltrados.map((r) => {
                  const via = vias[r.cuadra];
                  const nivel = r.criticidad.nivel;
                  const colorNivel =
                    nivel === 'Alto'
                      ? 'text-red-700'
                      : nivel === 'Medio'
                      ? 'text-amber-700'
                      : 'text-emerald-700';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSeleccionado(r)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="font-mono-tabular px-4 py-3 text-xs font-semibold text-slate-900">
                        {r.id}
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-xs text-slate-700">
                        <div>{r.fecha_hora.replace('T', ' ')}</div>
                        <div className="text-slate-500">
                          Franja {r.criticidad.franja}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {via?.nombre || r.cuadra}
                        </div>
                        <div className="text-xs text-slate-500">
                          {via?.sector || 'Sin sector'} · Vía{' '}
                          {r.criticidad.tipoVia}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {NOMBRES_CORTOS_CATEGORIA[r.categoria]}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {NOMBRES_ACTOR[r.actor]}
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-right text-xs text-slate-500">
                        {r.criticidad.desglose.categoria} +{' '}
                        {r.criticidad.desglose.via} +{' '}
                        {r.criticidad.desglose.franja}
                      </td>
                      <td
                        className={`font-mono-tabular px-4 py-3 text-right text-xs font-semibold ${colorNivel}`}
                      >
                        {r.criticidad.puntaje} pts · {nivel}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetalleReporteModal
        reporte={seleccionado}
        vias={vias}
        onCerrar={() => setSeleccionado(null)}
      />
    </div>
  );
}
