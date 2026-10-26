import { describe, expect, it } from "vitest";
import { claseCoincide } from "./busquedaClases";

/** La lupa del Historial del instructor: por actividad o por fecha (2026-10-25). */

// Sábado 24 de octubre de 2026, 18:30 en hora LOCAL (la pantalla muestra la hora local).
const clase = { actividadNombre: "Natación para adultos", fechaHora: new Date(2026, 9, 24, 18, 30).toISOString() };

describe("claseCoincide", () => {
  it("término vacío: todas", () => {
    expect(claseCoincide(clase, "  ")).toBe(true);
  });

  it("por nombre de la actividad, sin tildes ni mayúsculas", () => {
    expect(claseCoincide(clase, "natacion")).toBe(true);
    expect(claseCoincide(clase, "yoga")).toBe(false);
  });

  it("por fecha numérica, completa o a medio tipear", () => {
    for (const t of ["24", "24/10", "24/10/2026", "24-10", "24.10"]) expect(claseCoincide(clase, t)).toBe(true);
    expect(claseCoincide(clase, "25/10")).toBe(false);
    expect(claseCoincide(clase, "24/11")).toBe(false);
  });

  it("por fecha escrita, abreviada como en la lista o con el mes completo", () => {
    expect(claseCoincide(clase, "sab 24 oct")).toBe(true);
    expect(claseCoincide(clase, "octubre")).toBe(true);
    expect(claseCoincide(clase, "24 de octubre")).toBe(true);
    expect(claseCoincide(clase, "noviembre")).toBe(false);
  });
});
