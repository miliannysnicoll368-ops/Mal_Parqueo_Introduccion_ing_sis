/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calcularCriticidad } from './utils/criticidad';
import {
  calcularEstadisticas,
  FILTROS_INICIALES,
  filtrarReportes,
} from './utils/filtros';
import { generarResumenOperativo } from './utils/resumen';
import { VistaTablero } from './components/VistaTablero';
import { VistaCaptura } from './components/VistaCaptura';
import { VistaRegistros } from './components/VistaRegistros';
import { VistaCriterios } from './components/VistaCriterios';
import type {
  Criterios,
  FiltrosActivos,
  Reporte,
  ReporteCalculado,
  ViasMap,
} from './types/monitoring';

type VistaActiva = 'tablero' | 'captura' | 'registros' | 'criterios';

const STORAGE_KEY = 'santa_marta_reportes_locales_v1';

function leerLocales(): Reporte[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function guardarLocales(lista: Reporte[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch {
    // Silenciar si el almacenamiento local está lleno
  }
}

export default function App() {
  const [vista, setVista] = useState<VistaActiva>('tablero');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string>('');

  const [vias, setVias] = useState<ViasMap>({});
  const [criteriosBase, setCriteriosBase] = useState<Criterios | null>(null);
  const [criterios, setCriterios] = useState<Criterios | null>(null);
  const [reportesBase, setReportesBase] = useState<Reporte[]>([]);
  const [reportesLocales, setReportesLocales] = useState<Reporte[]>(() =>
    leerLocales()
  );
  const [filtros, setFiltros] = useState<FiltrosActivos>(FILTROS_INICIALES);

  const cargarDatosBase = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const [resVias, resCriterios, resReportes] = await Promise.all([
        fetch('./datos/vias.json'),
        fetch('./datos/criterios.json'),
        fetch('./datos/reportes.json'),
      ]);

      if (!resVias.ok || !resCriterios.ok || !resReportes.ok) {
        throw new Error('No se pudieron cargar los archivos de datos JSON.');
      }

      const [dataVias, dataCriterios, dataReportes] = await Promise.all([
        resVias.json() as Promise<ViasMap>,
        resCriterios.json() as Promise<Criterios>,
        resReportes.json() as Promise<Reporte[]>,
      ]);

      setVias(dataVias);
      setCriteriosBase(dataCriterios);
      setCriterios(dataCriterios);
      setReportesBase(Array.isArray(dataReportes) ? dataReportes : []);
    } catch (err) {
      setErrorCarga(
        err instanceof Error
          ? err.message
          : 'Error inesperado al cargar los datos.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosBase();
  }, [cargarDatosBase]);

  // Une reportes base y locales sin duplicados por ID y recalcula criticidad en vivo
  const todosReportes: ReporteCalculado[] = useMemo(() => {
    if (!criterios) return [];
    const mapa = new Map<string, ReporteCalculado>();

    for (const r of [...reportesBase, ...reportesLocales]) {
      if (!r || !r.id) continue;
      const crit = calcularCriticidad(r, vias, criterios);
      mapa.set(r.id, {
        ...r,
        criticidad: crit,
      });
    }

    return Array.from(mapa.values());
  }, [reportesBase, reportesLocales, vias, criterios]);

  const reportesFiltrados = useMemo(() => {
    if (!criterios) return [];
    return filtrarReportes(todosReportes, filtros, vias, criterios);
  }, [todosReportes, filtros, vias, criterios]);

  const estadisticas = useMemo(
    () => calcularEstadisticas(reportesFiltrados),
    [reportesFiltrados]
  );

  const resumenTop5 = useMemo(() => {
    if (!criterios) return [];
    return generarResumenOperativo(reportesFiltrados, vias, criterios);
  }, [reportesFiltrados, vias, criterios]);

  const agregarReporte = (nuevo: ReporteCalculado) => {
    setReportesLocales((prev) => {
      const siguiente = [...prev, nuevo];
      guardarLocales(siguiente);
      return siguiente;
    });
  };

  const importarJson = (
    importados: Reporte[]
  ): { agregados: number; duplicados: number } => {
    const idsExistentes = new Set(todosReportes.map((r) => r.id));
    const nuevos: Reporte[] = [];
    let duplicados = 0;

    for (const r of importados) {
      if (
        !r ||
        !r.id ||
        typeof r.lat !== 'number' ||
        typeof r.lng !== 'number'
      ) {
        continue;
      }
      if (idsExistentes.has(r.id)) {
        duplicados += 1;
      } else {
        idsExistentes.add(r.id);
        nuevos.push(r);
      }
    }

    if (nuevos.length > 0) {
      setReportesLocales((prev) => {
        const siguiente = [...prev, ...nuevos];
        guardarLocales(siguiente);
        return siguiente;
      });
    }

    return { agregados: nuevos.length, duplicados };
  };

  const limpiarLocales = () => {
    setReportesLocales([]);
    guardarLocales([]);
  };

  const criteriosModificados = useMemo(() => {
    if (!criterios || !criteriosBase) return false;
    return JSON.stringify(criterios) !== JSON.stringify(criteriosBase);
  }, [criterios, criteriosBase]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top Bar Contract: 3 zonas en una sola línea */}
      <header className="no-print sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
          <a
            href="#tablero"
            onClick={(e) => {
              e.preventDefault();
              setVista('tablero');
            }}
            className="font-display shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-slate-900 sm:text-lg"
          >
            Monitoreo Vial Santa Marta
          </a>

          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-5 overflow-x-auto text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => setVista('tablero')}
              className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
                vista === 'tablero'
                  ? 'border-[#0f4c81] font-semibold text-slate-950'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Tablero
            </button>
            <button
              type="button"
              onClick={() => setVista('captura')}
              className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
                vista === 'captura'
                  ? 'border-[#0f4c81] font-semibold text-slate-950'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Reportar
            </button>
            <button
              type="button"
              onClick={() => setVista('registros')}
              className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
                vista === 'registros'
                  ? 'border-[#0f4c81] font-semibold text-slate-950'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Registros
            </button>
            <button
              type="button"
              onClick={() => setVista('criterios')}
              className={`shrink-0 whitespace-nowrap border-b-2 py-1 transition-colors ${
                vista === 'criterios'
                  ? 'border-[#0f4c81] font-semibold text-slate-950'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Criterios
            </button>
          </nav>

          <div className="hidden shrink-0 sm:block">
            <button
              type="button"
              onClick={() =>
                setVista(vista === 'captura' ? 'tablero' : 'captura')
              }
              className="shrink-0 whitespace-nowrap rounded-lg bg-[#0f4c81] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a355c]"
            >
              {vista === 'captura' ? 'Ver tablero' : 'Nuevo reporte'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {cargando && (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="h-[440px] animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-8" />
              <div className="h-[440px] animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-4" />
            </div>
          </div>
        )}

        {!cargando && errorCarga && (
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold text-slate-900">
              No fue posible iniciar el tablero
            </h1>
            <p className="mt-1 text-sm text-slate-600">{errorCarga}</p>
            <button
              type="button"
              onClick={cargarDatosBase}
              className="mt-4 rounded-lg bg-[#0f4c81] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a355c]"
            >
              Reintentar carga
            </button>
          </div>
        )}

        {!cargando && !errorCarga && criterios && (
          <>
            {vista === 'tablero' && (
              <VistaTablero
                vias={vias}
                criterios={criterios}
                filtros={filtros}
                onCambiarFiltros={setFiltros}
                reportesFiltrados={reportesFiltrados}
                todosReportes={todosReportes}
                estadisticas={estadisticas}
                resumenTop5={resumenTop5}
                cantidadLocales={reportesLocales.length}
                onImportarJson={importarJson}
                onLimpiarLocales={limpiarLocales}
              />
            )}

            {vista === 'captura' && (
              <VistaCaptura
                vias={vias}
                criterios={criterios}
                onGuardarReporte={agregarReporte}
                onIrATablero={() => setVista('tablero')}
              />
            )}

            {vista === 'registros' && (
              <VistaRegistros
                reportesFiltrados={reportesFiltrados}
                vias={vias}
                filtros={filtros}
                onCambiarFiltros={setFiltros}
              />
            )}

            {vista === 'criterios' && (
              <VistaCriterios
                criterios={criterios}
                criteriosModificados={criteriosModificados}
                vias={vias}
                onActualizarCriterios={setCriterios}
                onRestaurarCriterios={() => {
                  if (criteriosBase) setCriterios(criteriosBase);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
