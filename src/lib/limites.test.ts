import { describe, expect, it } from "vitest";
import { errorDiasSuspension, errorMulta, MENSAJE_RANGO_MULTA } from "./limites";

/**
 * Pedido del usuario: las sanciones no tenían tope y se podía suspender cien años o cobrar un
 * millón de multa. Los números son espejo de `VentanaPenalizacion` del backend.
 */
describe("errorDiasSuspension", () => {
  it("acepta los bordes del rango", () => {
    expect(errorDiasSuspension(15)).toBeNull();
    expect(errorDiasSuspension(365)).toBeNull();
  });

  it("rechaza menos del mínimo y más del máximo", () => {
    expect(errorDiasSuspension(14)).toMatch("menos de 15 días");
    expect(errorDiasSuspension(366)).toMatch("más de 365 días");
    expect(errorDiasSuspension(36500)).toMatch("más de 365 días");
  });

  it("rechaza un número no entero", () => {
    expect(errorDiasSuspension(20.5)).not.toBeNull();
  });
});

describe("errorMulta", () => {
  it("con ceroEsSinMulta, 0 es válido (suspensión sin multa)", () => {
    expect(errorMulta(0, true)).toBeNull();
  });

  it("sin ceroEsSinMulta, 0 queda fuera del rango", () => {
    expect(errorMulta(0, false)).toBe(MENSAJE_RANGO_MULTA);
  });

  it("acepta los bordes y rechaza fuera de ellos", () => {
    expect(errorMulta(1000, false)).toBeNull();
    expect(errorMulta(500000, false)).toBeNull();
    expect(errorMulta(999, true)).toBe(MENSAJE_RANGO_MULTA);
    expect(errorMulta(1000000, true)).toBe(MENSAJE_RANGO_MULTA);
  });

  it("el mensaje es el mismo que devuelve el backend", () => {
    expect(MENSAJE_RANGO_MULTA).toBe("La multa tiene que estar entre $1.000 y $500.000.");
  });
});
