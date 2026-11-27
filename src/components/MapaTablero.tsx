import { useEffect, useRef, useState } from 'react';
import type LType from 'leaflet';
import { crearCapaCalor, L } from '../utils/leafletInit';
import { obtenerPuntajeMaximo } from '../utils/criticidad';
import { NOMBRES_ACTOR, NOMBRES_CATEGORIA } from '../utils/resumen';
import type { Criterios, ReporteCalculado, ViasMap } from '../types/monitoring';

interface MapaTableroProps {
  reportes: ReporteCalculado[];
  vias: ViasMap;
  criterios: Criterios;
  verCalor: boolean;
  verPuntos: boolean;
  focoCoords?: { lat: number; lng: number; zoom?: number; seq: number } | null;
  onSeleccionarReporte?: (reporte: ReporteCalculado) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function colorPorNivel(nivel: string): string {
  if (nivel === 'Alto') return '#dc2626';
  if (nivel === 'Medio') return '#d97706';
  return '#16a34a';
}

export function MapaTablero({
  reportes,
  vias,
  criterios,
  verCalor,
  verPuntos,
  focoCoords,
  onSeleccionarReporte,
}: MapaTableroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const heatRef = useRef<LType.Layer | null>(null);
  const pointsRef = useRef<LType.LayerGroup | null>(null);
  const [mapaListo, setMapaListo] = useState(false);

  // Inicialización única del mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([11.2442, -74.2108], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pointsGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    pointsRef.current = pointsGroup;
    setMapaListo(true);

    return () => {
      map.remove();
      mapRef.current = null;
      pointsRef.current = null;
      heatRef.current = null;
      setMapaListo(false);
    };
  }, []);

  // Reajuste de tamaño ante cambios de contenedor (incluye redibujado de capa de calor)
  useEffect(() => {
    if (!mapaListo || !containerRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize();
      const heatLayer = heatRef.current as { _reset?: () => void } | null;
      heatLayer?._reset?.();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mapaListo]);

  // Centrar el mapa cuando el usuario hace clic en una cuadra del Top 5
  useEffect(() => {
    if (!mapaListo || !mapRef.current || !focoCoords) return;
    mapRef.current.flyTo([focoCoords.lat, focoCoords.lng], focoCoords.zoom ?? 18, {
      duration: 0.5,
    });
  }, [mapaListo, focoCoords]);

  // Actualización de capa de calor y puntos individuales
  useEffect(() => {
    if (!mapaListo || !mapRef.current || !pointsRef.current) return;

    const map = mapRef.current;
    const pointsGroup = pointsRef.current;

    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    pointsGroup.clearLayers();

    const maxPuntaje = obtenerPuntajeMaximo(criterios);

    if (verCalor && reportes.length > 0) {
      const puntosCalor: [number, number, number][] = reportes.map((r) => [
        r.lat,
        r.lng,
        Math.min(1, Math.max(0.25, (r.criticidad?.puntaje ?? 1) / maxPuntaje)),
      ]);

      heatRef.current = crearCapaCalor(puntosCalor, {
        radius: 34,
        blur: 24,
        minOpacity: 0.42,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.2: '#2563eb',
          0.45: '#06b6d4',
          0.65: '#f59e0b',
          0.85: '#ef4444',
          1.0: '#991b1b',
        },
      }).addTo(map);
    }

    if (verPuntos) {
        for (const r of reportes) {
          const nivel = r.criticidad?.nivel || 'Bajo';
          const puntaje = r.criticidad?.puntaje ?? 0;
          const infoVia = vias[r.cuadra];
          const nombreCuadra = infoVia ? infoVia.nombre : r.cuadra;
          const sector = infoVia ? infoVia.sector : '';
          const desglose = r.criticidad?.desglose
            ? `${r.criticidad.desglose.categoria} + ${r.criticidad.desglose.via} + ${r.criticidad.desglose.franja}`
            : '';

          const marcador = L.circleMarker([r.lat, r.lng], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: colorPorNivel(nivel),
            fillOpacity: 0.92,
          });

          const nivelColor = colorPorNivel(nivel);
          const popupEl = document.createElement('div');
          popupEl.style.maxWidth = '240px';
          popupEl.style.fontSize = '12.5px';
          popupEl.style.color = '#0f172a';
          popupEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
              <strong style="font-family:var(--font-mono);font-size:12px;">${escapeHtml(r.id)}</strong>
              <span style="font-weight:700;color:${nivelColor};font-size:12px;">${escapeHtml(nivel)} · ${puntaje} pts</span>
            </div>
            <div style="color:#475569;font-weight:600;margin-bottom:6px;">
              ${escapeHtml(nombreCuadra)}${sector ? ' · ' + escapeHtml(sector) : ''}
            </div>
            <div style="margin-bottom:3px;"><strong>Fecha:</strong> ${escapeHtml(r.fecha_hora.replace('T', ' '))}</div>
            <div style="margin-bottom:3px;"><strong>Categoría:</strong> ${escapeHtml(NOMBRES_CATEGORIA[r.categoria] || r.categoria)}</div>
            <div style="margin-bottom:3px;"><strong>Actor:</strong> ${escapeHtml(NOMBRES_ACTOR[r.actor] || r.actor)}</div>
            <div style="color:#475569;"><strong>Cálculo:</strong> ${puntaje} pts ${desglose ? `(${escapeHtml(desglose)})` : ''}</div>
          `;

          if (onSeleccionarReporte) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Ver ficha completa';
            btn.style.marginTop = '8px';
            btn.style.width = '100%';
            btn.style.padding = '5px 8px';
            btn.style.borderRadius = '6px';
            btn.style.border = '1px solid #cbd5e1';
            btn.style.background = '#f8fafc';
            btn.style.color = '#0f4c81';
            btn.style.fontWeight = '600';
            btn.style.fontSize = '12px';
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => onSeleccionarReporte(r));
            popupEl.appendChild(btn);
          }

          marcador.bindPopup(popupEl);
          pointsGroup.addLayer(marcador);
        }
      }
  }, [mapaListo, reportes, vias, criterios, verCalor, verPuntos, onSeleccionarReporte]);

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />
      {reportes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-900/15 backdrop-blur-[1px]">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">
              Sin incidentes para los filtros activos
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Ajusta o limpia los filtros para visualizar la densidad en el mapa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
