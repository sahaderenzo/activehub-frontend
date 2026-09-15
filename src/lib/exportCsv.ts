/**
 * Descarga real de un CSV armado en el cliente.
 *
 * <p>Vivía dentro de `admin/Reportes.tsx`, que era el único que exportaba. Cuando "Métricas del
 * instructor" necesitó lo mismo, copiarla habría dejado dos implementaciones de las decisiones
 * que hacen que el archivo abra bien en Excel en es-AR, que es justo donde estas cosas se
 * desincronizan. Compañera de `exportPdf.ts`.
 *
 * <p>Dos detalles que no se pueden perder:
 * <ul>
 *   <li><b>BOM al principio</b>: sin él Excel abre el archivo en la codificación del sistema y
 *       los acentos salen rotos.</li>
 *   <li><b>Separador `;`</b>: es lo que espera Excel con configuración regional de Argentina,
 *       donde la coma es el separador decimal.</li>
 * </ul>
 */
export function descargarCsv(nombreArchivo: string, filas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const texto = String(v ?? "");
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = "﻿" + filas.map((f) => f.map(escapar).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
