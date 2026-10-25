/**
 * Montos redondos que ofrece el filtro rápido "Precio" del Home ("Hasta $5.000", …).
 *
 * Antes eran cortes al 25 %, 50 % y 75 % del precio más caro, redondeados a 500: salían montos
 * como "Hasta $9.500", que no dicen nada a quien los lee. Ahora se eligen de una escala fija de
 * montos redondos, y sólo los que separan el catálogo de verdad: incluyen al menos una
 * actividad y dejan afuera al menos otra (un "hasta" que incluye todo no filtra nada).
 */
const ESCALA = [
  1_000, 2_000, 3_000, 5_000, 8_000, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000, 100_000, 200_000, 500_000,
  1_000_000,
];

/** Cuántos montos se ofrecen como máximo. */
const MAXIMO_OPCIONES = 3;

export function cortesDePrecio(precios: number[]): number[] {
  const utiles = ESCALA.filter((c) => precios.some((p) => p <= c) && precios.some((p) => p > c));
  if (utiles.length <= MAXIMO_OPCIONES) return utiles;
  // Repartidos a lo largo de la escala: el más bajo, uno del medio y el más alto.
  const ultimo = utiles.length - 1;
  return [...new Set(Array.from({ length: MAXIMO_OPCIONES }, (_, i) => utiles[Math.round((i * ultimo) / (MAXIMO_OPCIONES - 1))]))];
}
