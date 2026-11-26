# Control de Mal Parqueo e Invasión del Espacio Público en Santa Marta

Prototipo web desarrollado para la asignatura **Introducción a la Ingeniería de Sistemas (2026-2)** de la **Universidad del Magdalena** (**Reto No. 2**).

La aplicación permite registrar incidentes de mal parqueo e invasión de andenes en campo o desde reportes ciudadanos en menos de 30 segundos, calcular automáticamente su índice de criticidad, visualizar zonas críticas mediante un mapa de calor ponderado y generar un resumen operativo imprimible para priorizar intervenciones en el Centro Histórico y la Av. Campo Serrano de Santa Marta.

---

## Integrantes y roles

| Rol en el equipo | Integrante | Responsabilidades principales |
| :--- | :--- | :--- |
| **Analista de campo y privacidad** | Miliannys Medina | Levantamiento de registros georreferenciados en campo, verificación de horarios/cuadras y anonimización de placas y rostros (Ley 1581 de 2012). |
| **Integrador del mapa** | Lauren Muñoz | Configuración de OpenStreetMap, Leaflet, capa de calor ponderada (`leaflet.heat`) y validación de coordenadas. |
| **Ingeniero de lógica y clasificación** | Thally Guerrero | Modelo de criticidad (`criticidad.ts`), filtros combinados (`filtros.ts`), reglas del resumen operativo (`resumen.ts`) e importación/exportación JSON. |
| **Diseñador de interfaz y documentador** | Cristofer Garzon | Flujo móvil de captura rápida (< 30 s), diseño del tablero operativo, vista imprimible y documentación en este repositorio. |

## Enlace al prototipo publicado

- **GitHub Pages:** `https://<usuario>.github.io/<repositorio>/` *(reemplazar tras publicar la carpeta compilada `dist/`)*

---

## Funcionalidades implementadas

- **Captura rápida de reportes (RF-01):** Selección de ubicación mediante GPS o clic en el mapa, detección automática de la cuadra más cercana en `vias.json` (con ajuste manual), selección rápida de categoría, tipo de actor y origen (`ciudadano` / `campo`), compresión automática de foto a un máximo de `800 px` de ancho y herramienta integrada para pixelar rostros o placas antes de guardar en `localStorage`.
- **Cálculo automático de criticidad (RF-02):** Evaluación determinista en `src/utils/criticidad.ts` usando los pesos de `public/datos/criterios.json` y la clasificación vial de `public/datos/vias.json`. Recalcula en vivo al cargar la aplicación o al ajustar pesos en la pestaña **Criterios**.
- **Mapa de calor e incidentes (RF-03):** Cartografía con OpenStreetMap + Leaflet + `leaflet.heat`, ponderada por el puntaje de criticidad de cada reporte, con alternancia entre capa de calor y puntos individuales con ficha detallada.
- **Filtros y estadísticas por categoría (RF-04):** Filtrado dinámico sin recargar la página por sector, cuadra, franja horaria (`pico` / `valle`), rango de horas, categoría, tipo de actor y búsqueda de texto, con cálculo inmediato de conteos y porcentajes por categoría.
- **Resumen operativo imprimible Top 5 (RF-05):** Agrupación por cuadra, suma de puntajes acumulados, ranking Top 5, recomendación operativa y exposición explícita de la regla que la originó, con diseño adaptado para impresión (`window.print()`).
- **Portabilidad JSON sin duplicados (RF-06):** Exportación de todos los reportes a `.json` e importación incremental validando y omitiendo registros repetidos por `id`.

---

## Modelo de criticidad y reglas operativas

### Pesos base (`public/datos/criterios.json`)

| Criterio | Valor | Puntaje |
| :--- | :--- | :---: |
| **Categoría** | Estacionamiento en vía prohibida o doble fila (`doble_fila`) | `3` |
| **Categoría** | Bloqueo de rampa peatonal, cebra o paradero (`bloqueo_rampa_cebra_paradero`) | `3` |
| **Categoría** | Invasión de andén por comercio o mercancía (`invasion_anden`) | `2` |
| **Tipo de vía** | Vía arterial (`arterial`) | `3` |
| **Tipo de vía** | Vía secundaria (`secundaria`) | `1` |
| **Franja horaria** | Hora pico (`06:30-08:30`, `11:30-14:00`, `17:00-19:30`) | `3` |
| **Franja horaria** | Hora valle (resto del día) | `1` |

- **Niveles resultantes:** `Bajo` (`0–4 pts`), `Medio` (`5–6 pts`), `Alto` (`7–9 pts`).

### Reglas de recomendación (`src/utils/resumen.ts`)

1. **Regla 1:** `≥ 3` reportes de nivel *Alto* en hora pico en la cuadra → *Patrullaje prioritario en hora pico*.
2. **Regla 2:** Predomina el actor *Vehículo de carga descargando* (`> 50%`) → *Revisar horario de cargue y descargue*.
3. **Regla 3:** Predomina la categoría *Invasión de andén* (`≥ 50%`) → *Operativo de espacio público*.
4. **Regla 4:** Alta incidencia (`≥ 2`) de *Vehículo de carga descargando* → *Revisar horario de cargue y descargue*.
5. **Regla 5:** Predomina *Bloqueo de rampa, cebra o paradero* → *Control de accesibilidad y despeje de cruces*.
6. **Regla 6:** Predomina *Doble fila / vía prohibida* → *Control vial contra parqueo en doble fila*.

---

## Datos de campo incluidos

El proyecto incluye actualmente **36 registros reales** (`MP-001` a `MP-036`) georreferenciados en **21 cuadras** del **Centro Histórico** y la **Av. Campo Serrano** (Carrera 5) de Santa Marta, levantados en recorridos de campo el `24/11/2026` y `26/11/2026` cubriendo franjas valle y pico, así como los cuatro tipos de actores (`vehiculo_particular`, `motocicleta`, `vehiculo_carga` y `mobiliario_comercial`).

---

## Estructura del proyecto

```text
├── index.html
├── package.json
├── vite.config.ts
├── README.md
├── public/
│   ├── assets/aistudio/        # Fotografías de evidencia del segundo recorrido
│   └── datos/
│       ├── criterios.json      # Pesos, horas pico y rangos de criticidad
│       ├── vias.json           # Catálogo de 21 cuadras monitoreadas
│       ├── reportes.json       # Base de 36 reportes reales
│       └── fotos/              # Carpeta para mp-001.jpg ... mp-021.jpg anonimizadas
└── src/
    ├── App.tsx                 # Coordinación de vistas, carga JSON y localStorage
    ├── types/monitoring.ts     # Definiciones de tipos TypeScript
    ├── utils/
    │   ├── criticidad.ts       # Cálculo puro de puntaje y nivel (sin DOM)
    │   ├── filtros.ts          # Filtrado dinámico y porcentajes por categoría
    │   ├── resumen.ts          # Agrupación Top 5 y reglas de recomendación
    │   ├── captura.ts          # Detección de cuadra cercana, compresión y pixelado
    │   └── leafletInit.ts      # Inicialización de Leaflet + leaflet.heat
    └── components/
        ├── MapaTablero.tsx     # Mapa OpenStreetMap con heatmap y marcadores
        ├── VistaTablero.tsx    # Tablero principal, KPIs, Top 5 e Import/Export JSON
        ├── VistaCaptura.tsx    # Formulario móvil de registro rápido (< 30 s)
        ├── VistaRegistros.tsx  # Tabla detallada con buscador y desglose
        ├── VistaCriterios.tsx  # Inspector y simulador en vivo de criterios.json
        └── DetalleReporteModal.tsx
```

---

## Ejecución en local (PC)

### Requisitos
- **Node.js** 18 o superior ([nodejs.org](https://nodejs.org/)).

### Pasos
1. Descarga o clona el repositorio en tu computador.
2. Abre una terminal dentro de la carpeta del proyecto e instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
4. Abre en tu navegador: `http://localhost:3000`.

### Compilar versión estática (Live Server)
1. Genera la carpeta de producción `dist/`:
   ```bash
   npm run build
   ```
2. Puedes previsualizarla en local con `npm run preview` o servir la carpeta `dist/` mediante **Live Server** en VS Code o `python -m http.server 8000`.
   > **Nota:** No abras `index.html` directamente con doble clic (`file://`), ya que los navegadores bloquean las peticiones `fetch()` a `datos/*.json` por políticas de seguridad CORS.

---

## Subir a GitHub y publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `equipo-reto-2-santa-marta`).
2. Desde la carpeta del proyecto en tu PC, ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Prototipo monitoreo vial Santa Marta - Reto 2"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repositorio>.git
   git push -u origin main
   ```
3. Para publicarlo automáticamente en **GitHub Pages**, entra en tu repositorio de GitHub a **Settings → Pages → Build and deployment → Source** y selecciona **GitHub Actions** (el flujo `.github/workflows/deploy.yml` ya viene incluido y compilará el sitio en cada `push` a `main`).
4. Una vez desplegado, copia la URL generada y reemplázala en la sección **Enlace al prototipo publicado** al inicio de este `README.md`.

---

## Privacidad y tratamiento de datos (Ley 1581 de 2012)

Las fotografías almacenadas o capturadas en el sistema tienen fines estrictamente académicos y de diagnóstico urbano. Antes de subir las fotografías al repositorio público en GitHub o publicar en GitHub Pages, se deben pixelar o difuminar rostros y placas vehiculares visibles utilizando la herramienta de pixelado incluida en la vista **Reportar** o un editor previo en las imágenes guardadas en `public/datos/fotos/` y `public/assets/aistudio/`.

