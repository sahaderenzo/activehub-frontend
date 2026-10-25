import { describe, expect, it } from "vitest";
import { cortesDePrecio } from "./precios";

describe("cortes del filtro rápido de precio", () => {
  /** Regresión: con los cortes al 25/50/75 % del precio máximo salían montos como "$9.500". */
  it("son montos redondos de la escala", () => {
    expect(cortesDePrecio([3_800, 4_500, 6_000, 9_000, 12_000])).toEqual([5_000, 8_000, 10_000]);
  });

  it("sólo ofrece montos que separan el catálogo: ni uno que deja todo afuera ni uno que incluye todo", () => {
    // Todo cuesta entre 4.000 y 6.000: sólo "hasta $5.000" filtra algo.
    expect(cortesDePrecio([4_000, 6_000])).toEqual([5_000]);
  });

  it("con muchos cortes posibles ofrece tres repartidos: el más bajo, uno del medio y el más alto", () => {
    expect(cortesDePrecio([500, 1_200_000])).toEqual([1_000, 20_000, 1_000_000]);
  });

  it("sin variedad de precios no ofrece nada", () => {
    expect(cortesDePrecio([])).toEqual([]);
    expect(cortesDePrecio([5_000, 5_000])).toEqual([]);
  });
});
