import { useEffect, useState } from 'react';
import { Camera, MapPin, X } from 'lucide-react';
import { NOMBRES_ACTOR, NOMBRES_CATEGORIA } from '../utils/resumen';
import type { ReporteCalculado, ViasMap } from '../types/monitoring';

interface DetalleReporteModalProps {
  reporte: ReporteCalculado | null;
  vias: ViasMap;
  onCerrar: () => void;
}

export function DetalleReporteModal({
  reporte,
  vias,
  onCerrar,
}: DetalleReporteModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [reporte?.id]);

  if (!reporte) return null;

  const via = vias[reporte.cuadra];
  const nivel = reporte.criticidad.nivel;
  const nivelClase =
    nivel === 'Alto'
      ? 'text-red-700'
      : nivel === 'Medio'
      ? 'text-amber-700'
      : 'text-emerald-700';

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-titulo"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="font-mono-tabular text-xs font-medium text-slate-500">
              Registro {reporte.id} · Origen {reporte.origen}
            </p>
            <h3
              id="detalle-titulo"
              className="mt-0.5 text-base font-semibold text-slate-900"
            >
              {via?.nombre || reporte.cuadra}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ficha"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs text-slate-500">Sector y vía</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {via?.sector || 'Sin sector'} · Vía {reporte.criticidad.tipoVia}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Fecha y hora</span>
              <p className="font-mono-tabular mt-0.5 font-medium text-slate-900">
                {reporte.fecha_hora.replace('T', ' ')} ({reporte.criticidad.franja})
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Categoría</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {NOMBRES_CATEGORIA[reporte.categoria]}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Tipo de actor</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {NOMBRES_ACTOR[reporte.actor]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3">
            <div>
              <span className="text-xs text-slate-500">Cálculo de criticidad</span>
              <p className="font-mono-tabular mt-0.5 text-xs text-slate-700">
                Categoría ({reporte.criticidad.desglose.categoria}) + Vía (
                {reporte.criticidad.desglose.via}) + Franja (
                {reporte.criticidad.desglose.franja})
              </p>
            </div>
            <div className="text-right">
              <span className={`font-mono-tabular text-base font-bold ${nivelClase}`}>
                {reporte.criticidad.puntaje} pts · {nivel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono-tabular text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            Coordenadas: {reporte.lat.toFixed(6)}, {reporte.lng.toFixed(6)} · Cuadra{' '}
            {reporte.cuadra}
          </div>

          {reporte.foto && !imgError ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={reporte.foto}
                alt={`Evidencia fotográfica ${reporte.id}`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="max-h-60 w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs text-slate-600">
              <Camera className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-slate-800">
                  {reporte.foto
                    ? `Archivo local esperado en ${reporte.foto}`
                    : 'Registro sin fotografía adjunta'}
                </p>
                {reporte.foto && (
                  <p className="mt-0.5 text-slate-500">
                    Para verla aquí, guarda la foto anonimizada en{' '}
                    <code className="font-mono">public/{reporte.foto}</code>.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
