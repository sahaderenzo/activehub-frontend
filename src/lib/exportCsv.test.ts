import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { descargarCsv } from "./exportCsv";

/**
 * Las dos decisiones de `descargarCsv` existen para que el archivo abra bien en Excel con la
 * configuración regional argentina: **BOM** al principio y **`;`** como separador. Son
 * exactamente las que se pierden cuando alguien "moderniza" la función, así que van fijadas.
 */
let bytes = new Uint8Array();

beforeEach(async () => {
  bytes = new Uint8Array();
  // jsdom no implementa `createObjectURL`: se reemplaza por uno que guarda lo que se iba a
  // descargar. Se leen los BYTES y no el texto porque `Blob.text()` descarta el BOM al
  // decodificar, y el BOM es justamente una de las dos cosas que hay que probar.
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => {
      void blob.arrayBuffer().then((b) => (bytes = new Uint8Array(b)));
      return "blob:fake";
    },
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(vi.fn());
});

afterEach(() => vi.unstubAllGlobals());

/** La lectura del Blob es asíncrona; esto espera a que llegue y devuelve el texto decodificado. */
async function csv(filas: (string | number)[][]) {
  descargarCsv("reporte.csv", filas);
  await vi.waitFor(() => expect(bytes.length).toBeGreaterThan(0));
  return new TextDecoder().decode(bytes);
}

describe("descargarCsv", () => {
  it("empieza con el BOM, sin el cual Excel rompe los acentos", async () => {
    const texto = await csv([["Actividad"], ["Natación"]]);
    // EF BB BF: el BOM de UTF-8, en bytes, antes de cualquier otra cosa.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(texto).toContain("Natación");
  });

  it("separa con punto y coma, no con coma", async () => {
    const texto = await csv([["Actividad", "Importe"], ["Yoga", 1500]]);
    expect(texto).toContain("Actividad;Importe");
    expect(texto).toContain("Yoga;1500");
  });

  it("separa las filas con CRLF", async () => {
    const texto = await csv([["a"], ["b"]]);
    expect(texto).toContain("a\r\nb");
  });

  it("entrecomilla lo que tiene punto y coma, comillas o saltos de línea", async () => {
    const texto = await csv([["Trekking; nivel alto", 'Dijo "gracias"', "dos\nlíneas"]]);
    expect(texto).toContain('"Trekking; nivel alto"');
    expect(texto).toContain('"Dijo ""gracias"""');
    expect(texto).toContain('"dos\nlíneas"');
  });

  it("dispara la descarga con el nombre pedido", async () => {
    const enlaces: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      enlaces.push(this.download);
    });

    await csv([["a"]]);

    expect(enlaces).toEqual(["reporte.csv"]);
  });
});
