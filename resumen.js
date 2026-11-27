import { obtenerFranja, obtenerTipoVia } from "./criticidad.js";

function dominante(lista, campo) {
  const cnt = {};
  for (const x of lista) cnt[x[campo]] = (cnt[x[campo]] || 0) + 1;
  let kMax = null, vMax = 0;
  for (const [k, v] of Object.entries(cnt)) {
    if (v > vMax) { vMax = v; kMax = k; }
  }
  return { clave: kMax, cantidad: vMax };
}

function evaluarRegla(grupo, vias, criterios) {
  const reps = grupo.reportes;
  const tipoVia = obtenerTipoVia(grupo.cuadra, vias);
  const altosPico = reps.filter(
    (r) => r.criticidad?.nivel === "Alto" && obtenerFranja(r.fecha_hora, criterios.horas_pico) === "pico"
  ).length;
  const catDom = dominante(reps, "categoria");
  const actDom = dominante(reps, "actor");

  if (altosPico >= 3) {
    return {
      recomendacion: "Patrullaje prioritario en hora pico",
      regla: `Regla 1: 3 o más reportes nivel Alto en hora pico (${altosPico} detectados).`
    };
  }
  if (catDom.clave === "invasion_anden") {
    return {
      recomendacion: "Operativo de espacio público",
      regla: `Regla 2: Predomina invasión de andén (${catDom.cantidad}/${reps.length}).`
    };
  }
  if (actDom.clave === "vehiculo_carga") {
    return {
      recomendacion: "Revisar horario de cargue y descargue",
      regla: `Regla 3: Predomina vehículo de carga (${actDom.cantidad}/${reps.length}).`
    };
  }
  if (tipoVia === "arterial" && (catDom.clave === "doble_fila" || catDom.clave === "bloqueo_rampa_cebra_paradero")) {
    return {
      recomendacion: "Control de estacionamiento y despeje de carril",
      regla: `Regla 4: Obstrucción vehicular predominante en vía arterial.`
    };
  }
  return {
    recomendacion: "Monitoreo preventivo y señalización",
    regla: "Regla 5: Reincidencia moderada sin patrón dominante crítico."
  };
}

export function generarTop5(reportes, vias, criterios) {
  const grupos = {};
  for (const r of reportes) {
    if (!grupos[r.cuadra]) {
      const info = vias.find((v) => v.codigo === r.cuadra);
      grupos[r.cuadra] = {
        cuadra: r.cuadra,
        nombre: info ? info.nombre : r.cuadra,
        puntajeTotal: 0,
        reportes: []
      };
    }
    grupos[r.cuadra].puntajeTotal += r.criticidad?.puntaje || 0;
    grupos[r.cuadra].reportes.push(r);
  }
  return Object.values(grupos)
    .sort((a, b) => b.puntajeTotal - a.puntajeTotal)
    .slice(0, 5)
    .map((g) => ({ ...g, ...evaluarRegla(g, vias, criterios) }));
}

export function renderizarResumen(contenedor, top5, esc) {
  if (top5.length === 0) {
    contenedor.innerHTML = `<p style="font-size:0.88rem;color:var(--ink-muted)">Sin reportes para los filtros seleccionados.</p>`;
    return;
  }
  const maxScore = top5[0].puntajeTotal || 1;
  contenedor.innerHTML = top5
    .map((item, i) => `
      <article class="resumen-card">
        <div class="resumen-top">
          <div>
            <span class="rank-num">${i + 1}</span>
            <strong>${esc(item.cuadra)}</strong>
            <div style="font-size:0.78rem;color:var(--ink-muted);margin-left:2rem;">${esc(item.nombre)}</div>
          </div>
          <span class="score-pill">${item.puntajeTotal} pts · ${item.reportes.length} rep.</span>
        </div>
        <div class="score-track"><div class="score-fill" style="width:${Math.round((item.puntajeTotal / maxScore) * 100)}%"></div></div>
        <div class="rec-text">Acción: ${esc(item.recomendacion)}</div>
        <div class="regla-chip">${esc(item.regla)}</div>
      </article>
    `)
    .join("");
}