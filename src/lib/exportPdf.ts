/**
 * Exportación a PDF sin dependencias: se arma un documento HTML propio en una ventana nueva
 * y se dispara el diálogo de impresión del navegador, donde "Guardar como PDF" es el destino
 * por defecto en Chrome, Edge y Firefox.
 *
 * <p>Por qué así y no con una librería (jsPDF / pdfmake): el contenido a exportar son tablas
 * largas que tienen que paginarse, repetir el encabezado en cada hoja y respetar acentos. El
 * motor de impresión del navegador hace las tres cosas gratis; con jsPDF hay que programar la
 * paginación a mano y embeber una fuente con soporte latin-1.
 *
 * <p>Por qué una ventana aparte y no `window.print()` sobre la pantalla: imprimir la pantalla
 * saca también la barra lateral, los filtros y los botones, y obliga a mantener una hoja
 * `@media print` en paralelo al diseño. Acá el documento impreso es exactamente lo que se ve
 * en la vista previa.
 *
 * <p>El `window.open` va dentro del handler del click a propósito: disparado desde un
 * `setTimeout` o un `.then()` los bloqueadores de pop-ups lo cortan.
 */

export interface ColumnaPdf<T> {
  encabezado: string;
  /** Texto de la celda. Se escapa: nunca se interpola HTML crudo del usuario. */
  valor: (fila: T) => string;
  /** Ancho sugerido de la columna (cualquier medida CSS). */
  ancho?: string;
}

export interface ReportePdf<T> {
  /** Título del documento y del encabezado impreso. */
  titulo: string;
  /** Línea de contexto bajo el título (filtros aplicados, alcance, etc.). */
  subtitulo?: string;
  /** Pares "etiqueta: valor" que se imprimen como ficha arriba de la tabla. */
  meta?: { etiqueta: string; valor: string }[];
  columnas: ColumnaPdf<T>[];
  filas: T[];
  /**
   * Gráfico opcional, impreso arriba de la tabla.
   *
   * <p>Se dibuja con divs y CSS, no con una imagen: el `<canvas>` de la pantalla no se puede
   * llevar al documento nuevo sin rasterizarlo, y una imagen rasterizada sale borrosa al
   * imprimir. Con barras de CSS el PDF sale vectorial y nítido a cualquier zoom.
   *
   * <p>Va con el valor escrito sobre cada barra y una escala a la izquierda: un gráfico
   * impreso no tiene tooltip, así que si el número no está escrito, no está.
   */
  grafico?: { titulo: string; barras: { label: string; valor: number }[]; unidad?: string };
  /** Nota al pie del documento. */
  pie?: string;
}

/**
 * El gráfico impreso. Misma lógica de escala que `components/GraficoBarras`: el tope se
 * redondea a un múltiplo de 4 para que las marcas del eje sean enteras.
 */
function renderGrafico(g: ReportePdf<unknown>["grafico"]): string {
  if (!g || g.barras.length === 0) return "";

  const pico = Math.max(1, ...g.barras.map((b) => b.valor));
  const paso = Math.max(1, Math.ceil(pico / 4));
  const max = paso * 4;
  const marcas = [4, 3, 2, 1, 0].map((n) => n * paso);

  const eje = marcas
    .map((v, i) => `<span style="top:${(i / (marcas.length - 1)) * 100}%">${v}</span>`)
    .join("");
  const lineas = marcas.map((_, i) => `<div class="g-linea" style="top:${(i / (marcas.length - 1)) * 100}%"></div>`).join("");
  const barras = g.barras
    .map((b) => `<div class="g-barra" style="height:${b.valor === 0 ? 1 : Math.max(2, (b.valor / max) * 100)}%"></div>`)
    .join("");
  const etiquetas = g.barras
    .map((b) => `<span>${escapar(b.label)}<b>${b.valor}</b></span>`)
    .join("");

  return `<div class="grafico">
    <h2>${escapar(g.titulo)}${g.unidad ? " (" + escapar(g.unidad) + ")" : ""}</h2>
    <div class="g-cuerpo">
      <div class="g-eje">${eje}</div>
      <div class="g-area">
        <div class="g-barras">${lineas}${barras}</div>
        <div class="g-etiquetas">${etiquetas}</div>
      </div>
    </div>
  </div>`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportarPdf<T>(reporte: ReportePdf<T>): boolean {
  const ventana = window.open("", "_blank", "width=1100,height=800");
  if (!ventana) return false;

  const meta = (reporte.meta ?? [])
    .map(
      (m) =>
        `<div class="meta-item"><span class="meta-label">${escapar(m.etiqueta)}</span><span class="meta-valor">${escapar(
          m.valor,
        )}</span></div>`,
    )
    .join("");

  const encabezados = reporte.columnas
    .map((c) => `<th${c.ancho ? ` style="width:${escapar(c.ancho)}"` : ""}>${escapar(c.encabezado)}</th>`)
    .join("");

  const grafico = renderGrafico(reporte.grafico);

  const cuerpo = reporte.filas
    .map((fila) => `<tr>${reporte.columnas.map((c) => `<td>${escapar(c.valor(fila))}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(reporte.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 34px 40px; font: 400 12px/1.5 system-ui, "Segoe UI", sans-serif; color: #33485E; }
  header { border-bottom: 2px solid #0E2A47; padding-bottom: 14px; margin-bottom: 16px; }
  .marca { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
  .logo { width: 28px; height: 28px; border-radius: 7px; background: #FF6A2B; color: #fff; display: flex;
          align-items: center; justify-content: center; font: 800 12px system-ui, sans-serif; }
  .marca-nombre { font: 800 15px system-ui, sans-serif; color: #0E2A47; letter-spacing: -.2px; }
  h1 { font: 700 20px system-ui, sans-serif; color: #0E2A47; margin: 0; letter-spacing: -.3px; }
  .subtitulo { font-size: 12px; color: #65788C; margin-top: 4px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 26px; margin-bottom: 16px; }
  .meta-item { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font: 700 9px system-ui, sans-serif; color: #90A1B2; letter-spacing: .5px; text-transform: uppercase; }
  .meta-valor { font: 600 12px system-ui, sans-serif; color: #0E2A47; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; font: 700 9.5px system-ui, sans-serif; color: #5A6B7D; text-transform: uppercase;
       letter-spacing: .4px; padding: 7px 9px; background: #F1F5F9; border-bottom: 1px solid #CBD5E1; }
  td { padding: 7px 9px; border-bottom: 1px solid #ECF1F6; font-size: 11px; vertical-align: top;
       word-break: break-word; }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #FAFCFE; }
  .vacio { padding: 26px; text-align: center; color: #90A1B2; font-weight: 600; }
  .grafico { margin-bottom: 20px; page-break-inside: avoid; }
  .grafico h2 { font: 700 12px system-ui, sans-serif; color: #0E2A47; margin: 0 0 10px; }
  .g-cuerpo { display: flex; gap: 8px; }
  .g-eje { width: 34px; flex: none; position: relative; height: 150px; }
  .g-eje span { position: absolute; right: 0; transform: translateY(-50%);
                font: 700 8px system-ui, sans-serif; color: #A3B1C0; }
  .g-area { flex: 1; }
  .g-barras { position: relative; height: 150px; border-bottom: 1px solid #CBD5E1; display: flex;
              align-items: flex-end; gap: 6px; }
  .g-linea { position: absolute; left: 0; right: 0; border-top: 1px dashed #ECF1F6; }
  .g-barra { flex: 1; background: #12B5A5; border-radius: 3px 3px 0 0; position: relative; }
  .g-etiquetas { display: flex; gap: 6px; margin-top: 5px; }
  .g-etiquetas span { flex: 1; text-align: center; font: 700 8px system-ui, sans-serif; color: #90A1B2; }
  .g-etiquetas b { display: block; color: #0E2A47; font-size: 9.5px; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px dashed #D9E2EB; font-size: 9.5px; color: #90A1B2; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header>
    <div class="marca"><span class="logo">AH</span><span class="marca-nombre">ActiveHub</span></div>
    <h1>${escapar(reporte.titulo)}</h1>
    ${reporte.subtitulo ? `<div class="subtitulo">${escapar(reporte.subtitulo)}</div>` : ""}
  </header>
  ${meta ? `<div class="meta">${meta}</div>` : ""}
  ${grafico}
  ${
    reporte.filas.length > 0
      ? `<table><thead><tr>${encabezados}</tr></thead><tbody>${cuerpo}</tbody></table>`
      : `<div class="vacio">No hay datos para exportar con los filtros aplicados.</div>`
  }
  ${reporte.pie ? `<footer>${escapar(reporte.pie)}</footer>` : ""}
  <script>
    // Esperar a las imagenes y fuentes antes de imprimir; si se llama en el parse, Firefox
    // saca una hoja en blanco.
    window.addEventListener('load', function () { window.focus(); window.print(); });
  </script>
</body>
</html>`;

  // El documento se entrega como Blob y NO con `document.write`.
  //
  // Con `window.open("")` + `document.write`, la ventana se queda con la URL `about:blank` y
  // su evento `load` ya se disparo antes de que escribieramos nada, asi que el `onload` que
  // llamaba a `print()` no corria nunca: quedaba una ventana en blanco y sin dialogo de
  // impresion. Eso es exactamente lo que se reporto al exportar la trazabilidad.
  //
  // Con un Blob la ventana carga un documento de verdad (URL `blob:`), y la llamada a
  // `print()` viaja DENTRO del HTML, asi que corre cuando el navegador termino de parsearlo.
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  ventana.location.replace(url);
  // Se libera cuando la ventana ya lo cargo; revocarlo antes cancelaria la carga.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
