import { calcularCriticidad } from "./criticidad.js";
import { fijarUbicacionEnMapa } from "./mapa.js";

const STORAGE_KEY = "santa_marta_vigia_vial_v1";

export function cargarLocales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarLocales(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function obtenerBytesLocales() {
  return new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
}

export function detectarCuadraCercana(lat, lng, vias) {
  let mejor = vias[0]?.codigo || "", dMin = Infinity;
  for (const v of vias) {
    if (v.lat == null || v.lng == null) continue;
    const d = Math.hypot(lat - v.lat, lng - v.lng);
    if (d < dMin) { dMin = d; mejor = v.codigo; }
  }
  return mejor;
}

function pixelarEnCanvas(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = Math.floor((clientX - rect.left) * scaleX);
  const cy = Math.floor((clientY - rect.top) * scaleY);
  const radio = Math.max(18, Math.round(canvas.width * 0.04));
  const bloque = Math.max(8, Math.round(canvas.width * 0.018));

  const x0 = Math.max(0, cx - radio);
  const y0 = Math.max(0, cy - radio);
  const w = Math.min(canvas.width - x0, radio * 2);
  const h = Math.min(canvas.height - y0, radio * 2);
  if (w <= 0 || h <= 0) return;

  const ctx = canvas.getContext("2d");
  const d = ctx.getImageData(x0, y0, w, h).data;
  for (let y = 0; y < h; y += bloque) {
    for (let x = 0; x < w; x += bloque) {
      const idx = (y * w + x) * 4;
      ctx.fillStyle = `rgb(${d[idx]}, ${d[idx + 1]}, ${d[idx + 2]})`;
      ctx.fillRect(x0 + x, y0 + y, bloque, bloque);
    }
  }
}

export function inicializarCaptura({ getVias, getCriterios, onNuevoReporte, esc }) {
  let tieneFoto = false;
  let pincelPixel = false;
  let pintando = false;
  let timerInicio = null;
  let timerInt = null;

  const iniciarTimer = () => {
    if (timerInicio !== null) return;
    timerInicio = performance.now();
    timerInt = setInterval(() => {
      const seg = (performance.now() - timerInicio) / 1000;
      const el = document.getElementById("timer-display");
      el.textContent = `${seg.toFixed(1)} s`;
      el.classList.toggle("alerta", seg >= 20 && seg < 30);
      el.classList.toggle("tarde", seg >= 30);
    }, 100);
  };

  const reiniciarTimer = () => {
    clearInterval(timerInt);
    timerInicio = null;
    timerInt = null;
    const el = document.getElementById("timer-display");
    el.textContent = "0.0 s";
    el.classList.remove("alerta", "tarde");
  };

  const fijarPunto = (lat, lng, autodetectar = true, centrar = false) => {
    document.getElementById("input-lat").value = lat.toFixed(6);
    document.getElementById("input-lng").value = lng.toFixed(6);
    document.getElementById("texto-coords").textContent = `Punto fijado: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    fijarUbicacionEnMapa(lat, lng, centrar);
    if (autodetectar) {
      document.getElementById("select-cuadra").value = detectarCuadraCercana(lat, lng, getVias());
    }
  };

  const form = document.getElementById("form-captura");
  form.addEventListener("pointerdown", iniciarTimer);
  form.addEventListener("change", iniciarTimer);
  document.getElementById("btn-reset-timer").addEventListener("click", reiniciarTimer);

  document.getElementById("btn-gps").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Tu navegador no soporta GPS.");
    navigator.geolocation.getCurrentPosition(
      (pos) => fijarPunto(pos.coords.latitude, pos.coords.longitude, true, true),
      () => alert("No se pudo obtener GPS. Toca el mapa o usa 'Centro de cuadra'.")
    );
  });

  document.getElementById("btn-centro-cuadra").addEventListener("click", () => {
    const vias = getVias();
    const cod = document.getElementById("select-cuadra").value;
    const v = vias.find((x) => x.codigo === cod) || vias[0];
    if (v) fijarPunto(v.lat, v.lng, false, true);
  });

  const canvas = document.getElementById("canvas-foto");
  const pixelTools = document.getElementById("pixel-tools");
  const btnPixel = document.getElementById("btn-toggle-pixel");

  document.getElementById("input-foto").addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    if (!archivo) {
      tieneFoto = false;
      pixelTools.classList.add("hidden");
      return;
    }
    const lector = new FileReader();
    lector.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 800 / img.width);
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        tieneFoto = true;
        pixelTools.classList.remove("hidden");
      };
      img.src = ev.target.result;
    };
    lector.readAsDataURL(archivo);
  });

  btnPixel.addEventListener("click", () => {
    pincelPixel = !pincelPixel;
    btnPixel.textContent = pincelPixel
      ? "Pincel activo: desliza sobre placa/rostro (toca para desactivar)"
      : "Activar pincel pixelador (tapar placa/rostro)";
    btnPixel.style.background = pincelPixel ? "var(--medio-bg)" : "";
  });

  canvas.addEventListener("pointerdown", (e) => { if (pincelPixel) { pintando = true; pixelarEnCanvas(canvas, e.clientX, e.clientY); } });
  canvas.addEventListener("pointermove", (e) => { if (pincelPixel && pintando) pixelarEnCanvas(canvas, e.clientX, e.clientY); });
  window.addEventListener("pointerup", () => { pintando = false; });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const lat = parseFloat(document.getElementById("input-lat").value);
    const lng = parseFloat(document.getElementById("input-lng").value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return alert("Primero fija la ubicación en el mapa, con GPS o con Centro de cuadra.");
    }

    const ahora = new Date();
    const fechaHora = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const nuevo = {
      id: `LOC-${Date.now().toString().slice(-6)}`,
      origen: form.origen.value,
      fecha_hora: fechaHora,
      lat,
      lng,
      cuadra: document.getElementById("select-cuadra").value,
      categoria: form.categoria.value,
      actor: form.actor.value,
      foto: tieneFoto ? canvas.toDataURL("image/jpeg", 0.7) : ""
    };
    nuevo.criticidad = calcularCriticidad(nuevo, getVias(), getCriterios());

    const locales = cargarLocales();
    locales.push(nuevo);
    guardarLocales(locales);

    const seg = timerInicio !== null ? (performance.now() - timerInicio) / 1000 : null;
    reiniciarTimer();
    const txtT = seg !== null ? ` · Tiempo: ${seg.toFixed(1)} s (${seg <= 30 ? "Prueba <30s OK" : "Superó 30s"})` : "";
    const d = nuevo.criticidad.desglose;
    const res = document.getElementById("resultado-captura");
    res.innerHTML = `
      <strong>Reporte ${esc(nuevo.id)} guardado${esc(txtT)}</strong><br>
      Cálculo: ${d.ptsCat} (cat) + ${d.ptsVia} (${d.tipoVia}) + ${d.ptsFranja} (${d.franja}) = <strong>${nuevo.criticidad.puntaje} pts (${esc(nuevo.criticidad.nivel)})</strong>
    `;
    res.classList.remove("hidden");

    form.reset();
    tieneFoto = false;
    pincelPixel = false;
    pixelTools.classList.add("hidden");
    onNuevoReporte();
  });

  return fijarPunto;
}

export function exportarReportesJSON(datos) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reportes-santa-marta-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importarReportesSinDuplicados(lista, precargados) {
  const actuales = cargarLocales();
  const ids = new Set([...precargados.map((r) => r.id), ...actuales.map((r) => r.id)]);
  let nuevos = 0, repetidos = 0;
  for (const item of lista) {
    if (!item?.id) continue;
    if (ids.has(item.id)) repetidos++;
    else { actuales.push(item); ids.add(item.id); nuevos++; }
  }
  guardarLocales(actuales);
  return { nuevos, repetidos };
}