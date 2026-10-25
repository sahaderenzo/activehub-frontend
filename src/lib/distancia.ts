/**
 * Filtro por distancia de Explorar: un rango [mínimo, máximo] en kilómetros, elegido con la
 * barra de dos manijas (`components/RangoDoble.tsx`). Reemplazó a los chips fijos
 * ("Menos de 2 km", "2 km", "5 km"…), que no permitían pedir, por ejemplo, entre 3 y 12 km.
 *
 * El cálculo de la distancia sigue siendo del cliente (`lib/geo.ts`, Haversine contra la
 * ubicación del navegador); acá sólo se decide si una distancia entra en el rango.
 */

/** Tope de la barra. La manija máxima en el tope significa "sin límite": `DISTANCIA_MAX_KM` o más. */
export const DISTANCIA_MAX_KM = 30;
export const DISTANCIA_PASO_KM = 1;

export interface RangoDistancia {
  minKm: number;
  maxKm: number;
}

/** La barra completa: no filtra, y no hace falta pedir la ubicación. */
export const RANGO_COMPLETO: RangoDistancia = { minKm: 0, maxKm: DISTANCIA_MAX_KM };

export function filtroDistanciaActivo(r: RangoDistancia): boolean {
  return r.minKm > 0 || r.maxKm < DISTANCIA_MAX_KM;
}

/**
 * Si una actividad a `distKm` entra en el rango. Con el filtro activo y sin distancia
 * calculable (sin ubicación propia, o la actividad sin coordenadas) devuelve false: no se puede
 * afirmar que esté dentro de un rango que no se pudo medir.
 */
export function dentroDelRangoDistancia(distKm: number | undefined, r: RangoDistancia): boolean {
  if (!filtroDistanciaActivo(r)) return true;
  if (distKm === undefined) return false;
  if (distKm < r.minKm) return false;
  // En el tope, la manija máxima no limita: "30 km o más".
  return r.maxKm >= DISTANCIA_MAX_KM || distKm <= r.maxKm;
}

/** "5 km", y en el tope "30+ km" (sin límite). */
export function formatKmFiltro(km: number): string {
  return km >= DISTANCIA_MAX_KM ? `${DISTANCIA_MAX_KM}+ km` : `${km} km`;
}

/**
 * Un "hasta X km" que llega de otra pantalla (los filtros rápidos del Home). Se acota a la barra
 * y un valor inválido no filtra.
 */
export function rangoHasta(km: number | undefined): RangoDistancia {
  if (km === undefined || !Number.isFinite(km) || km <= 0) return RANGO_COMPLETO;
  return { minKm: 0, maxKm: Math.min(Math.round(km), DISTANCIA_MAX_KM) };
}
