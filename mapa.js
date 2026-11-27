let mapaCaptura = null;
let marcadorCaptura = null;
let mapaTablero = null;
let capaCalor = null;
let capaPuntos = null;

const ETIQUETAS_CAT = {
  doble_fila: "Vía prohibida / doble fila",
  bloqueo_rampa_cebra_paradero: "Rampa, cebra o paradero",
  invasion_anden: "Invasión de andén"
};
const ETIQUETAS_ACTOR = {
  vehiculo_particular: "Vehículo particular",
  motocicleta: "Motocicleta",
  vehiculo_carga: "Carga descargando",
  mobiliario_comercial: "Mobiliario comercial"
};

export function iniciarMapas(onClickCaptura) {
  if (typeof L === "undefined") return;

  mapaCaptura = L.map("mapa-captura", { zoomControl: true }).setView([11.2435, -74.2108], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OSM" }).addTo(mapaCaptura);
  mapaCaptura.on("click", (e) => onClickCaptura(e.latlng.lat, e.latlng.lng));

  mapaTablero = L.map("mapa-tablero").setView([11.2435, -74.2108], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OSM", maxZoom: 19 }).addTo(mapaTablero);
  capaPuntos = L.layerGroup().addTo(mapaTablero);
  if (typeof L.heatLayer === "function") {
    capaCalor = L.heatLayer([], { radius: 30, blur: 22, maxZoom: 17 }).addTo(mapaTablero);
  }
}

export function fijarUbicacionEnMapa(lat, lng, centrar = false) {
  if (!mapaCaptura || typeof L === "undefined") return;
  if (centrar) mapaCaptura.setView([lat, lng], 17);
  if (marcadorCaptura) marcadorCaptura.setLatLng([lat, lng]);
  else marcadorCaptura = L.marker([lat, lng]).addTo(mapaCaptura);
}

export function refrescarMapas() {
  mapaCaptura?.invalidateSize();
  mapaTablero?.invalidateSize();
}

export function actualizarMapaTablero(reportes, criterios, verCalor, verPuntos, esc) {
  if (!mapaTablero || typeof L === "undefined") return;
  const cont = mapaTablero.getContainer();
  if (cont.clientWidth === 0 || cont.clientHeight === 0) return;

  if (capaCalor) {
    if (verCalor) {
      if (!mapaTablero.hasLayer(capaCalor)) capaCalor.addTo(mapaTablero);
      const maxPts = Math.max(...Object.values(criterios.niveles).map((x) => x[1]), 9);
      capaCalor.setLatLngs(reportes.map((r) => [r.lat, r.lng, Math.min(1, r.criticidad.puntaje / maxPts)]));
    } else if (mapaTablero.hasLayer(capaCalor)) {
      mapaTablero.removeLayer(capaCalor);
    }
  }

  capaPuntos.clearLayers();
  if (verPuntos) {
    if (!mapaTablero.hasLayer(capaPuntos)) capaPuntos.addTo(mapaTablero);
    const colores = { Alto: "#dc2626", Medio: "#d97706", Bajo: "#059669" };
    for (const r of reportes) {
      const d = r.criticidad.desglose;
      const m = L.circleMarker([r.lat, r.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: colores[r.criticidad.nivel] || "#0284c7",
        fillOpacity: 0.92
      });
      const fotoHtml = r.foto
        ? `<br><img src="${esc(r.foto)}" alt="Evidencia" style="width:160px;margin-top:6px;border-radius:6px;">`
        : "";
      m.bindPopup(`
        <strong>${esc(r.id)}</strong> · ${esc(r.cuadra)}<br>
        <b>Hora:</b> ${esc((r.fecha_hora || "").replace("T", " "))}<br>
        <b>Cat:</b> ${esc(ETIQUETAS_CAT[r.categoria] || r.categoria)}<br>
        <b>Actor:</b> ${esc(ETIQUETAS_ACTOR[r.actor] || r.actor)}<br>
        <b>Criticidad:</b> ${d.ptsCat} + ${d.ptsVia} (${d.tipoVia}) + ${d.ptsFranja} (${d.franja}) = <b>${r.criticidad.puntaje} (${esc(r.criticidad.nivel)})</b>
        ${fotoHtml}
      `);
      m.addTo(capaPuntos);
    }
  } else if (mapaTablero.hasLayer(capaPuntos)) {
    mapaTablero.removeLayer(capaPuntos);
  }
}