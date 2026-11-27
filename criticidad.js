export function horaAMinutos(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
}

export function obtenerFranja(fechaHora, horasPico) {
  const hhmm = (fechaHora?.split("T")[1] || "00:00").slice(0, 5);
  const mins = horaAMinutos(hhmm);
  for (const rango of horasPico) {
    const [ini, fin] = rango.split("-");
    if (mins >= horaAMinutos(ini) && mins <= horaAMinutos(fin)) return "pico";
  }
  return "valle";
}

export function obtenerTipoVia(cuadra, vias) {
  const v = vias.find((x) => x.codigo === cuadra);
  return v ? v.tipo : "secundaria";
}

export function calcularCriticidad(reporte, vias, criterios) {
  const ptsCat = criterios.categoria[reporte.categoria] ?? 0;
  const tipoVia = obtenerTipoVia(reporte.cuadra, vias);
  const ptsVia = criterios.via[tipoVia] ?? 0;
  const franja = obtenerFranja(reporte.fecha_hora, criterios.horas_pico);
  const ptsFranja = criterios.franja[franja] ?? 0;
  const puntaje = ptsCat + ptsVia + ptsFranja;

  let nivel = "Bajo";
  for (const [nom, [min, max]] of Object.entries(criterios.niveles)) {
    if (puntaje >= min && puntaje <= max) {
      nivel = nom;
      break;
    }
  }

  return {
    puntaje,
    nivel,
    desglose: { ptsCat, ptsVia, tipoVia, franja, ptsFranja }
  };
}