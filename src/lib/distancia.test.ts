import { describe, expect, it } from "vitest";
import {
  DISTANCIA_MAX_KM,
  RANGO_COMPLETO,
  dentroDelRangoDistancia,
  filtroDistanciaActivo,
  formatKmFiltro,
  rangoHasta,
} from "./distancia";

describe("filtro de distancia por rango", () => {
  it("la barra completa no filtra, ni siquiera sin ubicación", () => {
    expect(filtroDistanciaActivo(RANGO_COMPLETO)).toBe(false);
    expect(dentroDelRangoDistancia(undefined, RANGO_COMPLETO)).toBe(true);
    expect(dentroDelRangoDistancia(500, RANGO_COMPLETO)).toBe(true);
  });

  it("entre un mínimo y un máximo incluye los dos extremos", () => {
    const r = { minKm: 3, maxKm: 12 };
    expect(dentroDelRangoDistancia(2.9, r)).toBe(false);
    expect(dentroDelRangoDistancia(3, r)).toBe(true);
    expect(dentroDelRangoDistancia(12, r)).toBe(true);
    expect(dentroDelRangoDistancia(12.1, r)).toBe(false);
  });

  it("con la manija máxima en el tope no hay límite superior", () => {
    const r = { minKm: 10, maxKm: DISTANCIA_MAX_KM };
    expect(filtroDistanciaActivo(r)).toBe(true);
    expect(dentroDelRangoDistancia(250, r)).toBe(true);
    expect(dentroDelRangoDistancia(9, r)).toBe(false);
  });

  it("con el filtro activo, una distancia que no se pudo medir no entra", () => {
    expect(dentroDelRangoDistancia(undefined, { minKm: 0, maxKm: 5 })).toBe(false);
  });

  it("escribe el tope como sin límite", () => {
    expect(formatKmFiltro(5)).toBe("5 km");
    expect(formatKmFiltro(DISTANCIA_MAX_KM)).toBe(`${DISTANCIA_MAX_KM}+ km`);
  });

  /**
   * Regresión: el Home ofrece "A menos de 25 km", y con los chips viejos (que llegaban hasta
   * "10 km" y "Más de 10 km") ese valor no coincidía con ninguno y se ignoraba en silencio.
   */
  it("un 'hasta X km' de otra pantalla se acota a la barra", () => {
    expect(rangoHasta(25)).toEqual({ minKm: 0, maxKm: 25 });
    expect(rangoHasta(5)).toEqual({ minKm: 0, maxKm: 5 });
    expect(rangoHasta(999)).toEqual({ minKm: 0, maxKm: DISTANCIA_MAX_KM });
    expect(rangoHasta(undefined)).toEqual(RANGO_COMPLETO);
    expect(rangoHasta(-3)).toEqual(RANGO_COMPLETO);
  });
});
