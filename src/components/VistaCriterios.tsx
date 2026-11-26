import { Download, RotateCcw } from 'lucide-react';
import type { Criterios, ViasMap } from '../types/monitoring';

interface VistaCriteriosProps {
  criterios: Criterios;
  criteriosModificados: boolean;
  vias: ViasMap;
  onActualizarCriterios: (nuevos: Criterios) => void;
  onRestaurarCriterios: () => void;
}

export function VistaCriterios({
  criterios,
  criteriosModificados,
  vias,
  onActualizarCriterios,
  onRestaurarCriterios,
}: VistaCriteriosProps) {
  const cambiarPesoCategoria = (
    clave: keyof Criterios['categoria'],
    valor: number
  ) => {
    onActualizarCriterios({
      ...criterios,
      categoria: { ...criterios.categoria, [clave]: valor },
    });
  };

  const cambiarPesoVia = (clave: keyof Criterios['via'], valor: number) => {
    onActualizarCriterios({
      ...criterios,
      via: { ...criterios.via, [clave]: valor },
    });
  };

  const cambiarPesoFranja = (
    clave: keyof Criterios['franja'],
    valor: number
  ) => {
    onActualizarCriterios({
      ...criterios,
      franja: { ...criterios.franja, [clave]: valor },
    });
  };

  const descargarCriteriosJson = () => {
    const blob = new Blob([JSON.stringify(criterios, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'criterios.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Criterios de criticidad y catálogo vial
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Reglas cargadas desde <code className="font-mono text-xs">datos/criterios.json</code> y{' '}
            <code className="font-mono text-xs">datos/vias.json</code>. Cualquier ajuste recalcula el tablero y mapa en vivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {criteriosModificados && (
            <button
              type="button"
              onClick={onRestaurarCriterios}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar criterios.json
            </button>
          )}
          <button
            type="button"
            onClick={descargarCriteriosJson}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#0f4c81] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0a355c]"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar criterios.json
          </button>
        </div>
      </div>

      {/* Pesos editables para probar cambios en tiempo real */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Peso por categoría de obstrucción
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Doble fila / vía prohibida</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.categoria.doble_fila}
                onChange={(e) =>
                  cambiarPesoCategoria('doble_fila', Number(e.target.value) || 0)
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Bloqueo rampa / cebra / paradero</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.categoria.bloqueo_rampa_cebra_paradero}
                onChange={(e) =>
                  cambiarPesoCategoria(
                    'bloqueo_rampa_cebra_paradero',
                    Number(e.target.value) || 0
                  )
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Invasión de andén</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.categoria.invasion_anden}
                onChange={(e) =>
                  cambiarPesoCategoria(
                    'invasion_anden',
                    Number(e.target.value) || 0
                  )
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Peso por tipo de vía
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Vía arterial</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.via.arterial}
                onChange={(e) =>
                  cambiarPesoVia('arterial', Number(e.target.value) || 0)
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Vía secundaria</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.via.secundaria}
                onChange={(e) =>
                  cambiarPesoVia('secundaria', Number(e.target.value) || 0)
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Peso por franja horaria
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Hora pico</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.franja.pico}
                onChange={(e) =>
                  cambiarPesoFranja('pico', Number(e.target.value) || 0)
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700">Hora valle</span>
              <input
                type="number"
                min={0}
                max={10}
                value={criterios.franja.valle}
                onChange={(e) =>
                  cambiarPesoFranja('valle', Number(e.target.value) || 0)
                }
                className="font-mono-tabular w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-slate-900"
              />
            </label>
            <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
              Horas pico configuradas:{' '}
              <span className="font-mono-tabular text-slate-700">
                {criterios.horas_pico.join(' · ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Catálogo de vías */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Catálogo de cuadras monitoreadas ({Object.keys(vias).length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Tramo vial</th>
                <th className="px-4 py-2.5">Sector</th>
                <th className="px-4 py-2.5">Clasificación</th>
                <th className="px-4 py-2.5 text-right">Coordenadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Object.entries(vias).map(([id, info]) => (
                <tr key={id} className="hover:bg-slate-50">
                  <td className="font-mono-tabular px-4 py-2.5 text-xs font-semibold text-slate-900">
                    {id}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {info.nombre}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{info.sector}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    Vía {info.tipo}
                  </td>
                  <td className="font-mono-tabular px-4 py-2.5 text-right text-xs text-slate-500">
                    {info.lat.toFixed(6)}, {info.lng.toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
