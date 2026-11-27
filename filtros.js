import { horaAMinutos, obtenerFranja } from "./criticidad.js";

export function filtrarReportes(reportes, filtros, vias, criterios) {
  return reportes.filter((r) => {
    if (filtros.sector !== "todos") {
      const v = vias.find((x) => x.codigo === r.cuadra);
      if (r.cuadra !== filtros.sector && (!v || v.sector !== filtros.sector)) {
        return false;
      }
    }
    if (filtros.franja !== "todas") {
      if (obtenerFranja(r.fecha_hora, criterios.horas_pico) !== filtros.franja) {
        return false;
      }
    }
    const hhmm = (r.fecha_hora?.split("T")[1] || "00:00").slice(0, 5);
    const mins = horaAMinutos(hhmm);
    if (filtros.horaInicio && mins < horaAMinutos(filtros.horaInicio)) return false;
    if (filtros.horaFin && mins > horaAMinutos(filtros.horaFin)) return false;

    if (filtros.categoria !== "todas" && r.categoria !== filtros.categoria) return false;
    if (filtros.actor !== "todos" && r.actor !== filtros.actor) return false;
    return true;
  });
}

export function calcularEstadisticas(reportes) {
  const total = reportes.length;
  const c = { doble_fila: 0, bloqueo_rampa_cebra_paradero: 0, invasion_anden: 0 };
  for (const r of reportes) {
    if (c[r.categoria] !== undefined) c[r.categoria]++;
  }
  const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    doble_fila: { n: c.doble_fila, p: pct(c.doble_fila) },
    bloqueo: { n: c.bloqueo_rampa_cebra_paradero, p: pct(c.bloqueo_rampa_cebra_paradero) },
    anden: { n: c.invasion_anden, p: pct(c.invasion_anden) }
  };
}