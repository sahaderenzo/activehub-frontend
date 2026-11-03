import { describe, expect, it } from "vitest";
import { agruparPenalizaciones, errorComprobante, fechaCorta, rutaPermitidaConMulta } from "./sanciones";
import { rutaNotificacion } from "./notificaciones";

describe("rutaPermitidaConMulta", () => {
  it("con la multa sin pagar deja ver sólo Mis sanciones, las próximas clases y sus inscriptos", () => {
    expect(rutaPermitidaConMulta("/instructor/sanciones")).toBe(true);
    expect(rutaPermitidaConMulta("/instructor/proximas-clases")).toBe(true);
    expect(rutaPermitidaConMulta("/instructor/clases/c-1")).toBe(true);
  });

  it("el resto del área lo manda a pagar", () => {
    expect(rutaPermitidaConMulta("/instructor")).toBe(false);
    expect(rutaPermitidaConMulta("/instructor/actividades")).toBe(false);
    expect(rutaPermitidaConMulta("/instructor/actividades/nueva")).toBe(false);
    expect(rutaPermitidaConMulta("/instructor/clases/c-1/editar")).toBe(false);
    expect(rutaPermitidaConMulta("/instructor/perfil")).toBe(false);
  });
});

describe("fechaCorta", () => {
  it("da vuelta la fecha sin pasar por Date, que la correría un día por el huso", () => {
    expect(fechaCorta("2026-11-30")).toBe("30/11/2026");
    expect(fechaCorta(null)).toBe("");
  });
});

describe("errorComprobante", () => {
  const archivo = (tipo: string, bytes: number) => new File([new Uint8Array(bytes)], "comprobante", { type: tipo });

  it("acepta PDF, JPG y PNG de hasta 5 MB", () => {
    expect(errorComprobante(archivo("application/pdf", 10))).toBeNull();
    expect(errorComprobante(archivo("image/jpeg", 10))).toBeNull();
    expect(errorComprobante(archivo("image/png", 5 * 1024 * 1024))).toBeNull();
  });

  it("rechaza otros formatos y los archivos más grandes", () => {
    expect(errorComprobante(archivo("text/plain", 10))).toBe("Formato no permitido. Subí un PDF, JPG o PNG.");
    expect(errorComprobante(archivo("application/pdf", 5 * 1024 * 1024 + 1))).toBe("El archivo supera los 5 MB.");
  });
});

describe("agruparPenalizaciones", () => {
  const pen = (id: string, extra: Partial<{ usuarioId: string; tipo: string; motivo: string; denunciaId: string | null; createdAt: string }> = {}) => ({
    id,
    usuarioId: "inst-1",
    tipo: "Económica",
    motivo: "Faltó a la clase",
    denunciaId: null as string | null,
    createdAt: "2026-11-01T15:00:00.100Z",
    ...extra,
  });
  const ids = (grupos: { id: string }[][]) => grupos.map((g) => g.map((p) => p.id));

  it("junta la multa y la suspensión aplicadas juntas", () => {
    const grupos = agruparPenalizaciones([pen("m"), pen("s", { tipo: "Suspensión temporal", createdAt: "2026-11-01T15:00:00.140Z" })]);
    expect(ids(grupos)).toEqual([["m", "s"]]);
  });

  it("junta las dos partes de una misma denuncia aunque el motivo cambie", () => {
    const grupos = agruparPenalizaciones([
      pen("m", { denunciaId: "d-1", motivo: "Multa por la denuncia" }),
      pen("s", { denunciaId: "d-1", tipo: "Suspensión temporal", motivo: "Suspensión por la denuncia" }),
    ]);
    expect(ids(grupos)).toEqual([["m", "s"]]);
  });

  it("no junta dos del mismo tipo, de otro instructor, de otra denuncia ni separadas en el tiempo", () => {
    expect(ids(agruparPenalizaciones([pen("a"), pen("b")]))).toEqual([["a"], ["b"]]);
    expect(ids(agruparPenalizaciones([pen("a"), pen("b", { tipo: "Suspensión temporal", usuarioId: "inst-2" })]))).toEqual([["a"], ["b"]]);
    expect(ids(agruparPenalizaciones([pen("a", { denunciaId: "d-1" }), pen("b", { tipo: "Suspensión temporal", denunciaId: "d-2" })]))).toEqual([["a"], ["b"]]);
    expect(ids(agruparPenalizaciones([pen("a"), pen("b", { tipo: "Suspensión temporal", createdAt: "2026-11-03T15:00:00Z" })]))).toEqual([["a"], ["b"]]);
  });

  it("cada grupo tiene a lo sumo una parte de cada tipo", () => {
    const grupos = agruparPenalizaciones([pen("m1"), pen("s", { tipo: "Suspensión temporal" }), pen("m2")]);
    expect(ids(grupos)).toEqual([["m1", "s"], ["m2"]]);
  });
});

describe("rutaNotificacion de una penalización (V36)", () => {
  const n = { destinoTipo: "PENALIZACION" as const, destinoId: "pen-1" };

  it("al instructor lo lleva a Mis sanciones, sin permiso propio", () => {
    expect(rutaNotificacion(n, "instructor", ["actividades.publicar"])).toBe("/instructor/sanciones");
  });

  it("al administrador lo lleva a la fila de la penalización", () => {
    expect(rutaNotificacion(n, "admin", ["penalizaciones.gestionar"])).toBe("/admin/penalizaciones?penalizacion=pen-1");
  });

  it("sin el permiso de penalizaciones el administrador no tiene link", () => {
    expect(rutaNotificacion(n, "admin", ["reportes.ver"])).toBeNull();
  });
});
