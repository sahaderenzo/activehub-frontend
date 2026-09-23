import { describe, expect, it } from "vitest";
import { formatDistanciaKm, haversineKm } from "./geo";

/**
 * Distancias del filtro "cercanía" de Explorar y del "a X de vos" del Home. Las coordenadas
 * son de Mendoza, que es donde vive el catálogo.
 */
describe("haversineKm", () => {
  it("la distancia de un punto a sí mismo es cero", () => {
    expect(haversineKm(-32.8895, -68.8458, -32.8895, -68.8458)).toBe(0);
  });

  it("Mendoza capital a Ciudad de Buenos Aires: unos 985 km", () => {
    const km = haversineKm(-32.8895, -68.8458, -34.6037, -58.3816);
    expect(km).toBeGreaterThan(960);
    expect(km).toBeLessThan(1010);
  });

  it("es simétrica", () => {
    const ida = haversineKm(-32.88, -68.84, -32.9, -68.86);
    const vuelta = haversineKm(-32.9, -68.86, -32.88, -68.84);
    expect(ida).toBeCloseTo(vuelta, 10);
  });

  it("un grado de latitud son ~111 km en cualquier longitud", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
    expect(haversineKm(-32, -68, -33, -68)).toBeCloseTo(111.19, 1);
  });
});

describe("formatDistanciaKm", () => {
  it("debajo del kilómetro muestra metros redondeados", () => {
    expect(formatDistanciaKm(0.4)).toBe("400 m");
    expect(formatDistanciaKm(0.0499)).toBe("50 m");
  });

  it("desde un kilómetro muestra kilómetros con un decimal", () => {
    expect(formatDistanciaKm(1)).toBe("1.0 km");
    expect(formatDistanciaKm(12.34)).toBe("12.3 km");
  });
});
