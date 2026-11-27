import { calcularCriticidad } from "./criticidad.js";
import { filtrarReportes, calcularEstadisticas } from "./filtros.js";
import { generarTop5, renderizarResumen } from "./resumen.js";
import { iniciarMapas, refrescarMapas, actualizarMapaTablero } from "./mapa.js";
import {
  cargarLocales,
  obtenerBytesLocales,
  inicializarCaptura,
  exportarReportesJSON,
  importarReportesSinDuplicados
} from "./captura.js";

let criterios = null;
let vias = [];
let reportesPrecargados = [];

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function actualizarMedidorStorage() {
  const kb = (obtenerBytesLocales() / 1024).toFixed(1);
  document.getElementById("storage-text").textContent = `Memoria local: ${kb} KB / 5120 KB`;
  document.getElementById("resumen-storage-mob").textContent = `${kb} KB usados`;
}

function obtenerTodos() {
  const map = new Map();
  for (const r of [...reportesPrecargados, ...cargarLocales()]) {
    map.set(r.id, { ...r, criticidad: calcularCriticidad(r, vias, criterios) });
  }
  return Array.from(map.values());
}

function actualizarTablero() {
  const todos = obtenerTodos();
  const filtros = {
    sector: document.getElementById("filtro-sector").value,
    franja: document.getElementById("filtro-franja").value,
    horaInicio: document.getElementById("filtro-hora-inicio").value,
    horaFin: document.getElementById("filtro-hora-fin").value,
    categoria: document.getElementById("filtro-categoria").value,
    actor: document.getElementById("filtro-actor").value
  };

  const filtrados = filtrarReportes(todos, filtros, vias, criterios);
  const st = calcularEstadisticas(filtrados);

  const altos = filtrados.filter((r) => r.criticidad.nivel === "Alto").length;
  const pctAltos = st.total ? Math.round((altos / st.total) * 100) : 0;

  document.getElementById("kpi-total").textContent = st.total;
  document.getElementById("kpi-total-sub").textContent = `de ${todos.length} registrados`;
  document.getElementById("kpi-altos").textContent = altos;
  document.getElementById("kpi-altos-sub").textContent = `${pctAltos}% del total filtrado`;

  document.getElementById("bar-doble").style.width = `${st.doble_fila.p}%`;
  document.getElementById("bar-bloqueo").style.width = `${st.bloqueo.p}%`;
  document.getElementById("bar-anden").style.width = `${st.anden.p}%`;
  document.getElementById("kpi-categorias").innerHTML = `
    <span><i class="dot-cat" style="background:#ef4444"></i>Doble fila ${st.doble_fila.p}%</span>
    <span><i class="dot-cat" style="background:#f59e0b"></i>Rampa/Cebra ${st.bloqueo.p}%</span>
    <span><i class="dot-cat" style="background:#0ea5e9"></i>Andén ${st.anden.p}%</span>
  `;

  const top5 = generarTop5(filtrados, vias, criterios);
  if (top5.length > 0) {
    document.getElementById("kpi-top-cuadra").textContent = top5[0].cuadra;
    document.getElementById("kpi-top-pts").textContent = `${top5[0].puntajeTotal} pts (${top5[0].reportes.length} rep.)`;
  } else {
    document.getElementById("kpi-top-cuadra").textContent = "—";
    document.getElementById("kpi-top-pts").textContent = "0 pts";
  }

  actualizarMapaTablero(
    filtrados,
    criterios,
    document.getElementById("toggle-calor").checked,
    document.getElementById("toggle-puntos").checked,
    esc
  );

  renderizarResumen(document.getElementById("lista-resumen"), top5, esc);

  document.getElementById("tabla-desglose").innerHTML = filtrados
    .slice(0, 35)
    .map((r) => {
      const d = r.criticidad.desglose;
      return `
        <tr>
          <td><strong>${esc(r.id)}</strong></td>
          <td>${esc(r.cuadra)}</td>
          <td>${d.ptsCat} + ${d.ptsVia} (${d.tipoVia}) + ${d.ptsFranja} (${d.franja}) = <strong>${r.criticidad.puntaje}</strong></td>
          <td><span class="pill-nivel nivel-${esc(r.criticidad.nivel)}">${esc(r.criticidad.nivel)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function poblarSelectores() {
  document.getElementById("select-cuadra").innerHTML = vias
    .map((v) => `<option value="${esc(v.codigo)}">${esc(v.codigo)} — ${esc(v.nombre)}</option>`)
    .join("");

  const fSec = document.getElementById("filtro-sector");
  fSec.innerHTML = `<option value="todos">Todos los sectores / cuadras</option>`;
  for (const s of [...new Set(vias.map((v) => v.sector))]) {
    fSec.add(new Option(`Sector: ${s}`, s));
  }
  for (const v of vias) {
    fSec.add(new Option(`Cuadra: ${v.codigo}`, v.codigo));
  }

  document.getElementById("peso-doble-fila").value = criterios.categoria.doble_fila;
  document.getElementById("peso-bloqueo").value = criterios.categoria.bloqueo_rampa_cebra_paradero;
  document.getElementById("peso-anden").value = criterios.categoria.invasion_anden;
  document.getElementById("peso-arterial").value = criterios.via.arterial;
  document.getElementById("peso-secundaria").value = criterios.via.secundaria;
  document.getElementById("peso-pico").value = criterios.franja.pico;
}

async function iniciar() {
  const aviso = document.getElementById("aviso-modo");
  try {
    const [rC, rV, rR] = await Promise.all([
      fetch("datos/criterios.json"),
      fetch("datos/vias.json"),
      fetch("datos/reportes.json")
    ]);
    criterios = await rC.json();
    vias = await rV.json();
    reportesPrecargados = await rR.json();
    aviso.textContent = `Datos cargados (${reportesPrecargados.length} registros base · ${vias.length} cuadras).`;
  } catch {
    aviso.textContent = "Error leyendo datos/*.json. Ábrelo con Live Server de VS Code o GitHub Pages.";
    return;
  }

  poblarSelectores();

  const fijarPunto = inicializarCaptura({
    getVias: () => vias,
    getCriterios: () => criterios,
    onNuevoReporte: () => {
      actualizarMedidorStorage();
      actualizarTablero();
    },
    esc
  });

  iniciarMapas((lat, lng) => fijarPunto(lat, lng, true, false));

  // Navegación Móvil y PC
  const setMob = (vista) => {
    document.body.setAttribute("data-mobile-view", vista);
    for (const v of ["captura", "mapa", "resumen"]) {
      document.getElementById(`mob-tab-${v}`).setAttribute("aria-selected", String(v === vista));
    }
    setTimeout(() => { refrescarMapas(); if (vista === "mapa") actualizarTablero(); }, 100);
  };
  const setPC = (vista) => {
    document.body.setAttribute("data-pc-view", vista);
    document.getElementById("pc-tab-tablero").setAttribute("aria-selected", String(vista === "tablero"));
    document.getElementById("pc-tab-captura").setAttribute("aria-selected", String(vista === "captura"));
    setTimeout(() => { refrescarMapas(); if (vista === "tablero") actualizarTablero(); }, 100);
  };

  document.getElementById("pc-tab-tablero").addEventListener("click", () => setPC("tablero"));
  document.getElementById("pc-tab-captura").addEventListener("click", () => setPC("captura"));
  document.getElementById("mob-tab-captura").addEventListener("click", () => setMob("captura"));
  document.getElementById("mob-tab-mapa").addEventListener("click", () => setMob("mapa"));
  document.getElementById("mob-tab-resumen").addEventListener("click", () => setMob("resumen"));

  for (const id of [
    "filtro-sector", "filtro-franja", "filtro-hora-inicio",
    "filtro-hora-fin", "filtro-categoria", "filtro-actor",
    "toggle-calor", "toggle-puntos"
  ]) {
    document.getElementById(id).addEventListener("change", actualizarTablero);
  }

  document.getElementById("btn-limpiar-filtros").addEventListener("click", () => {
    document.getElementById("filtro-sector").value = "todos";
    document.getElementById("filtro-franja").value = "todas";
    document.getElementById("filtro-hora-inicio").value = "";
    document.getElementById("filtro-hora-fin").value = "";
    document.getElementById("filtro-categoria").value = "todas";
    document.getElementById("filtro-actor").value = "todos";
    actualizarTablero();
  });

  document.getElementById("btn-imprimir").addEventListener("click", () => {
    document.getElementById("print-fecha").textContent = `Generado el ${new Date().toLocaleString("es-CO")}`;
    window.print();
  });

  document.getElementById("btn-aplicar-pesos").addEventListener("click", () => {
    criterios.categoria.doble_fila = Number(document.getElementById("peso-doble-fila").value) || 0;
    criterios.categoria.bloqueo_rampa_cebra_paradero = Number(document.getElementById("peso-bloqueo").value) || 0;
    criterios.categoria.invasion_anden = Number(document.getElementById("peso-anden").value) || 0;
    criterios.via.arterial = Number(document.getElementById("peso-arterial").value) || 0;
    criterios.via.secundaria = Number(document.getElementById("peso-secundaria").value) || 0;
    criterios.franja.pico = Number(document.getElementById("peso-pico").value) || 0;
    actualizarTablero();
  });

  document.getElementById("btn-descargar-criterios").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(criterios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "criterios.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-exportar").addEventListener("click", () => {
    const locales = cargarLocales();
    exportarReportesJSON(locales.length ? locales : obtenerTodos());
  });

  document.getElementById("input-importar").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      const lista = JSON.parse(await archivo.text());
      if (!Array.isArray(lista)) throw new Error();
      const { nuevos, repetidos } = importarReportesSinDuplicados(lista, reportesPrecargados);
      document.getElementById("mensaje-json").textContent =
        `Sincronización lista: ${nuevos} reportes agregados · ${repetidos} duplicados omitidos por ID.`;
      actualizarMedidorStorage();
      actualizarTablero();
    } catch {
      alert("El archivo JSON no es válido.");
    }
    e.target.value = "";
  });

  window.addEventListener("resize", refrescarMapas);
  actualizarMedidorStorage();
  actualizarTablero();
}

iniciar();