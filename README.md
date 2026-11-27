# Reto No. 2 — Control de Mal Parqueo e Invasión del Espacio Público en Santa Marta

**Equipo:** Ingenia (Team 14)  
**Curso:** Introducción a la Ingeniería de Sistemas · 2026-2 · Universidad del Magdalena  
**Zona de estudio:** Carrera 5 (Av. Campo Serrano), Carrera 4, Carrera 1C y calles transversales del Centro Histórico (10 cuadras, 25 registros de campo)

## Integrantes y roles

| Integrante | Correo institucional | Rol |
| :--- | :--- | :--- |
| **Thally Guerrero Camargo** | tmguerrero@unimagdalena.edu.co | Analista de campo y privacidad |
| **Miliannys Medina** | mnmedina@unimagdalena.edu.co | Integrador del mapa e instrucciones para la IA |
| **Lauren Muñoz** | ldmunoz@unimagdalena.edu.co | Ingeniero de lógica y clasificación
| **Cristofer Garzon** | cagarzon@unimagdalena.edu.co | Diseñador de interfaz y documentador

## Enlace al prototipo
* **Prototipo publicado:** `[Pegar aquí el enlace de GitHub Pages cuando se active, o indicar uso con Live Server]`

## Cómo abrir y probar el proyecto
1. Clonar o descargar este repositorio (en la rama correspondiente).
2. Abrir la carpeta en **Visual Studio Code**.
3. Hacer clic derecho sobre `index.html` y elegir **Open with Live Server** (necesario para que `fetch` cargue los archivos de `datos/`).
4. En **PC** se abre el Tablero Operativo; en **celular** (o reduciendo el ancho de la ventana) se activa la vista de Captura Rápida (< 30 s) con barra de navegación inferior.

## Arquitectura de archivos
* `index.html` y `styles.css`: Capa de presentación responsiva (Captura móvil, Mapa de calor, Filtros y Resumen operativo).
* `app.js`: Coordinador principal de vistas, eventos y carga de datos.
* `captura.js`: Captura rápida, GPS, compresión de fotos (máx. 800 px), pixelador de privacidad, `localStorage` y exportar/importar JSON sin duplicados.
* `criticidad.js`: Cálculo puro del índice de criticidad leyendo `vias.json` y `criterios.json`.
* `filtros.js`: Filtrado dinámico por sector/cuadra, franja horaria, rango de hora, categoría y actor.
* `resumen.js`: Agrupación por cuadra, Top 5 crítico, reglas de recomendación explícitas e impresión.
* `mapa.js`: Mapa base OpenStreetMap, capa `Leaflet.heat` y capa de puntos individuales.
* `datos/`: `vias.json` (10 cuadras), `criterios.json`, `reportes.json` (25 registros) y `fotos/` (evidencias anonimizadas).
* `documentos/`: Anexo de evidencia de campo, Diagrama de arquitectura y Bitácora de ingeniería en PDF.
