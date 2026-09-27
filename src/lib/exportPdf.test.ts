import { afterEach, describe, expect, it, vi } from "vitest";
import { exportarPdf } from "./exportPdf";

/**
 * Reportado: "Exportar todo" de Trazabilidad abría una pestaña que quedaba en blanco, y
 * "Exportar esta página" hacía lo mismo fuera de la página 1. `audit_log.entidad_id` es
 * nullable y `escapar(null)` tiraba una excepción DESPUÉS del `window.open`.
 */
describe("exportarPdf", () => {
  afterEach(() => vi.restoreAllMocks());

  function ventanaFalsa() {
    const ventana = { location: { replace: vi.fn() } } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(ventana);
    // jsdom no implementa createObjectURL.
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    return { ventana, open };
  }

  it("una celda null no rompe la exportación", () => {
    const { ventana } = ventanaFalsa();
    const ok = exportarPdf({
      titulo: "Auditoría",
      columnas: [{ encabezado: "ID", valor: (f: { id: string | null }) => f.id as string }],
      filas: [{ id: null }, { id: "abc" }],
    });
    expect(ok).toBe(true);
    expect(ventana.location.replace).toHaveBeenCalledWith("blob:fake");
  });

  it("si armar el documento falla, no deja una ventana abierta", () => {
    const { open } = ventanaFalsa();
    expect(() =>
      exportarPdf({
        titulo: "Auditoría",
        columnas: [
          {
            encabezado: "X",
            valor: () => {
              throw new Error("fila rota");
            },
          },
        ],
        filas: [{}],
      }),
    ).toThrow("fila rota");
    expect(open).not.toHaveBeenCalled();
  });

  it("devuelve false si el navegador bloquea la ventana", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(exportarPdf({ titulo: "T", columnas: [], filas: [] })).toBe(false);
  });
});
