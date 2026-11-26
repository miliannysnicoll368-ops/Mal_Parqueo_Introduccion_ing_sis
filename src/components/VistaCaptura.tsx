import { useEffect, useMemo, useRef, useState } from 'react';
import type LType from 'leaflet';
import { Check, Crosshair, Eraser, MapPin, ShieldAlert, Upload } from 'lucide-react';
import { L } from '../utils/leafletInit';
import { calcularCriticidad } from '../utils/criticidad';
import {
  comprimirImagen,
  detectarCuadraCercana,
  pixelarZonaImagen,
} from '../utils/captura';
import type {
  CategoriaObstruccion,
  Criterios,
  OrigenReporte,
  ReporteCalculado,
  TipoActor,
  ViasMap,
} from '../types/monitoring';

interface VistaCapturaProps {
  vias: ViasMap;
  criterios: Criterios;
  onGuardarReporte: (nuevo: ReporteCalculado) => void;
  onIrATablero: () => void;
}

const OPCIONES_CATEGORIA: {
  value: CategoriaObstruccion;
  titulo: string;
  detalle: string;
}[] = [
  {
    value: 'doble_fila',
    titulo: 'Vía prohibida o doble fila',
    detalle: 'Obstrucción directa de carril vehicular',
  },
  {
    value: 'bloqueo_rampa_cebra_paradero',
    titulo: 'Bloqueo de rampa, cebra o paradero',
    detalle: 'Afectación a accesibilidad y cruces seguros',
  },
  {
    value: 'invasion_anden',
    titulo: 'Invasión de andén',
    detalle: 'Motos, mercancía o mobiliario sobre paso peatonal',
  },
];

const OPCIONES_ACTOR: { value: TipoActor; titulo: string }[] = [
  { value: 'vehiculo_particular', titulo: 'Vehículo particular' },
  { value: 'motocicleta', titulo: 'Motocicleta' },
  { value: 'vehiculo_carga', titulo: 'Vehículo de carga' },
  { value: 'mobiliario_comercial', titulo: 'Mobiliario comercial' },
];

export function VistaCaptura({
  vias,
  criterios,
  onGuardarReporte,
  onIrATablero,
}: VistaCapturaProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const markerRef = useRef<LType.CircleMarker | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [cuadra, setCuadra] = useState<string>(() => Object.keys(vias)[0] || '');
  const [distanciaAuto, setDistanciaAuto] = useState<number | null>(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState<string>(
    'Toca cualquier punto del mapa o usa tu GPS.'
  );
  const [cargandoGps, setCargandoGps] = useState(false);

  const [categoria, setCategoria] = useState<CategoriaObstruccion | ''>('');
  const [actor, setActor] = useState<TipoActor | ''>('');
  const [origen, setOrigen] = useState<OrigenReporte>('ciudadano');

  const [fotoDataUrl, setFotoDataUrl] = useState<string>('');
  const [fotoMeta, setFotoMeta] = useState<string>('');
  const [modoPixelar, setModoPixelar] = useState(false);

  const [errorForm, setErrorForm] = useState<string>('');
  const [ultimoGuardado, setUltimoGuardado] = useState<ReporteCalculado | null>(
    null
  );

  // Asegurar cuadra inicial cuando cargan las vías
  useEffect(() => {
    if (!cuadra && Object.keys(vias).length > 0) {
      setCuadra(Object.keys(vias)[0]);
    }
  }, [vias, cuadra]);

  const fijarUbicacion = (
    nuevaLat: number,
    nuevaLng: number,
    mensaje: string
  ) => {
    setLat(nuevaLat);
    setLng(nuevaLng);
    setEstadoUbicacion(mensaje);
    setErrorForm('');

    const { cuadra: detectada, distancia } = detectarCuadraCercana(
      nuevaLat,
      nuevaLng,
      vias
    );
    if (detectada) {
      setCuadra(detectada);
      setDistanciaAuto(distancia);
    }

    if (mapRef.current) {
      if (!markerRef.current) {
        markerRef.current = L.circleMarker([nuevaLat, nuevaLng], {
          radius: 9,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#0f4c81',
          fillOpacity: 1,
        }).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng([nuevaLat, nuevaLng]);
      }
    }
  };

  // Inicializar mini-mapa de captura
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([11.2448, -74.2108], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: LType.LeafletMouseEvent) => {
      fijarUbicacion(
        e.latlng.lat,
        e.latlng.lng,
        'Ubicación marcada en el mapa.'
      );
    });

    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vias]);

  const usarGps = () => {
    if (!navigator.geolocation) {
      setEstadoUbicacion(
        'Tu navegador no admite geolocalización. Marca el punto en el mapa.'
      );
      return;
    }
    setCargandoGps(true);
    setEstadoUbicacion('Obteniendo coordenadas GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCargandoGps(false);
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 17);
        fijarUbicacion(
          latitude,
          longitude,
          'Coordenadas GPS obtenidas correctamente.'
        );
      },
      () => {
        setCargandoGps(false);
        setEstadoUbicacion(
          'No se pudo obtener el GPS. Toca directamente el mapa para ubicar.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const manejarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, ancho, alto, kb } = await comprimirImagen(file, 800, 0.74);
      setFotoDataUrl(dataUrl);
      setFotoMeta(`${ancho} × ${alto} px · ${kb} KB`);
      setModoPixelar(false);
    } catch {
      setErrorForm('No se pudo procesar la fotografía seleccionada.');
    }
  };

  const manejarClickPixelar = async (
    e: React.MouseEvent<HTMLImageElement>
  ) => {
    if (!modoPixelar || !fotoDataUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    try {
      const nuevaUrl = await pixelarZonaImagen(fotoDataUrl, normX, normY);
      setFotoDataUrl(nuevaUrl);
    } catch {
      setErrorForm('No se pudo pixelar la zona seleccionada.');
    }
  };

  // Previsualización en vivo de la criticidad según la hora actual
  const vistaPreviaCriticidad = useMemo(() => {
    if (!categoria || !cuadra) return null;
    const ahora = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fechaHora = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
    return calcularCriticidad({ categoria, cuadra, fecha_hora: fechaHora }, vias, criterios);
  }, [categoria, cuadra, vias, criterios]);

  const enviarReporte = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    if (lat === null || lng === null) {
      setErrorForm(
        'Primero marca la ubicación en el mapa o utiliza el botón de GPS.'
      );
      return;
    }

    if (!categoria || !actor) {
      setErrorForm('Selecciona la categoría de obstrucción y el tipo de actor.');
      return;
    }

    const ahora = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fechaHora = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

    const crit = calcularCriticidad(
      { categoria, cuadra, fecha_hora: fechaHora },
      vias,
      criterios
    );

    const nuevo: ReporteCalculado = {
      id: `MP-${Date.now().toString(36).slice(-5).toUpperCase()}`,
      origen,
      fecha_hora: fechaHora,
      lat,
      lng,
      cuadra,
      categoria,
      actor,
      foto: fotoDataUrl || '',
      criticidad: crit,
    };

    onGuardarReporte(nuevo);
    setUltimoGuardado(nuevo);

    // Reiniciar para siguiente registro rápido
    setLat(null);
    setLng(null);
    setDistanciaAuto(null);
    setCategoria('');
    setActor('');
    setFotoDataUrl('');
    setFotoMeta('');
    setModoPixelar(false);
    setEstadoUbicacion('Toca cualquier punto del mapa o usa tu GPS.');
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Registro rápido de incidente
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Captura georreferenciada en campo en menos de 30 segundos · Santa Marta
          </p>
        </div>
        {vistaPreviaCriticidad && (
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500">
              Estimación de criticidad actual
            </span>
            <p className="font-mono-tabular text-sm font-semibold text-slate-900">
              {vistaPreviaCriticidad.puntaje} pts · Nivel{' '}
              <span
                className={
                  vistaPreviaCriticidad.nivel === 'Alto'
                    ? 'text-red-600'
                    : vistaPreviaCriticidad.nivel === 'Medio'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }
              >
                {vistaPreviaCriticidad.nivel}
              </span>{' '}
              ({vistaPreviaCriticidad.franja})
            </p>
          </div>
        )}
      </div>

      {ultimoGuardado && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          <div className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <span className="font-semibold">
                Reporte <span className="font-mono-tabular">{ultimoGuardado.id}</span> guardado
              </span>
              <span className="text-emerald-800">
                {' '}
                · {vias[ultimoGuardado.cuadra]?.nombre || ultimoGuardado.cuadra} ·{' '}
                {ultimoGuardado.criticidad.puntaje} pts ({ultimoGuardado.criticidad.nivel})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onIrATablero}
            className="whitespace-nowrap rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800"
          >
            Ver en el tablero
          </button>
        </div>
      )}

      <form
        onSubmit={enviarReporte}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        noValidate
      >
        {/* Columna Izquierda: Mapa y Cuadra */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              01. Ubicación del incidente
            </h2>
            <button
              type="button"
              onClick={usarGps}
              disabled={cargandoGps}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <Crosshair className="h-3.5 w-3.5 text-[#0f4c81]" />
              {cargandoGps ? 'Ubicando...' : 'Usar mi GPS'}
            </button>
          </div>

          <p className="text-xs text-slate-600">{estadoUbicacion}</p>

          <div
            ref={mapContainerRef}
            className="h-64 w-full overflow-hidden rounded-lg border border-slate-200"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-mono-tabular">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {lat !== null && lng !== null
                ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                : 'Sin coordenadas seleccionadas'}
            </span>
            {distanciaAuto !== null && (
              <span className="font-mono-tabular text-[#0f4c81]">
                Cuadra más cercana a ~{distanciaAuto} m
              </span>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label
              htmlFor="cap-cuadra"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Cuadra asignada (detección automática ajustable)
            </label>
            <select
              id="cap-cuadra"
              value={cuadra}
              onChange={(e) => {
                setCuadra(e.target.value);
                setDistanciaAuto(null);
              }}
              className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0f4c81] focus:outline-none"
            >
              {Object.entries(vias).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.nombre} · {info.sector} ({info.tipo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Columna Derecha: Categoría, Actor, Foto y Envío */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <div>
            <h2 className="mb-2.5 text-base font-semibold text-slate-900">
              02. Categoría de obstrucción
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {OPCIONES_CATEGORIA.map((op) => {
                const activo = categoria === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => {
                      setCategoria(op.value);
                      setErrorForm('');
                    }}
                    className={`min-h-[48px] w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      activo
                        ? 'border-[#0f4c81] bg-[#eff6ff] text-slate-950'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{op.titulo}</span>
                      <span className="font-mono-tabular text-xs font-medium text-slate-500">
                        {criterios.categoria[op.value]} pts
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{op.detalle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h2 className="mb-2.5 text-base font-semibold text-slate-900">
              03. Tipo de actor y origen
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {OPCIONES_ACTOR.map((op) => {
                const activo = actor === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => {
                      setActor(op.value);
                      setErrorForm('');
                    }}
                    className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      activo
                        ? 'border-[#0f4c81] bg-[#eff6ff] text-slate-950'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {op.titulo}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Origen:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setOrigen('ciudadano')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    origen === 'ciudadano'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ciudadano
                </button>
                <button
                  type="button"
                  onClick={() => setOrigen('campo')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    origen === 'campo'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Equipo en campo
                </button>
              </div>
            </div>
          </div>

          {/* Fotografía opcional con pixelado Ley 1581 */}
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                04. Evidencia fotográfica (opcional · máx. 800 px)
              </h2>
              {fotoMeta && (
                <span className="font-mono-tabular text-xs text-slate-500">
                  {fotoMeta}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                {fotoDataUrl ? 'Cambiar foto' : 'Tomar o subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={manejarFoto}
                  className="hidden"
                />
              </label>

              {fotoDataUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => setModoPixelar((v) => !v)}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      modoPixelar
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    {modoPixelar
                      ? 'Toca la foto para pixelar'
                      : 'Pixelar placas o rostros'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFotoDataUrl('');
                      setFotoMeta('');
                      setModoPixelar(false);
                    }}
                    className="min-h-[40px] px-2 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    Quitar
                  </button>
                </>
              )}
            </div>

            <p className="mt-1.5 text-xs text-slate-500">
              Privacidad (Ley 1581 de 2012): evita encuadrar rostros o placas, o usa
              la herramienta de pixelado antes de guardar.
            </p>

            {fotoDataUrl && (
              <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img
                  src={fotoDataUrl}
                  alt="Vista previa de evidencia"
                  onClick={manejarClickPixelar}
                  className={`max-h-48 w-full object-contain ${
                    modoPixelar ? 'cursor-crosshair' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {errorForm && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorForm}</span>
            </div>
          )}

          <button
            type="submit"
            className="min-h-[46px] w-full rounded-lg bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a355c]"
          >
            Guardar reporte en el sistema
          </button>
        </div>
      </form>
    </div>
  );
}
