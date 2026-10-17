/**
 * Topes de las sanciones, espejo de `VentanaPenalizacion` del backend. Si cambia uno allá,
 * cambia acá: el backend es quien los hace cumplir, esto es para avisar antes de mandar.
 *
 * Pedido del usuario: sin tope, el formulario aceptaba suspender a alguien cien años o
 * cobrarle un millón de multa — errores de tipeo con consecuencias, no sanciones.
 */
export const MIN_DIAS_SUSPENSION = 15;
export const MAX_DIAS_SUSPENSION = 365;
export const MULTA_MINIMA = 1000;
export const MULTA_MAXIMA = 500000;

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

/** El mismo texto que devuelve el backend. */
export const MENSAJE_RANGO_MULTA = `La multa tiene que estar entre ${pesos(MULTA_MINIMA)} y ${pesos(MULTA_MAXIMA)}.`;

/** `null` si los días son válidos; si no, el mensaje a mostrar. */
export function errorDiasSuspension(dias: number): string | null {
  if (!Number.isInteger(dias) || dias < MIN_DIAS_SUSPENSION) {
    return `La suspensión no puede durar menos de ${MIN_DIAS_SUSPENSION} días.`;
  }
  if (dias > MAX_DIAS_SUSPENSION) {
    return `La suspensión no puede durar más de ${MAX_DIAS_SUSPENSION} días.`;
  }
  return null;
}

/**
 * `null` si el monto es válido. Con `ceroEsSinMulta`, 0 significa "sin multa" (la multa que
 * acompaña a una suspensión es opcional); sin él, la multa es obligatoria.
 */
export function errorMulta(monto: number, ceroEsSinMulta: boolean): string | null {
  if (!Number.isFinite(monto) || monto < 0) return "El monto no puede ser negativo.";
  if (monto === 0 && ceroEsSinMulta) return null;
  if (monto < MULTA_MINIMA || monto > MULTA_MAXIMA) return MENSAJE_RANGO_MULTA;
  return null;
}

/** Espejo del `@DecimalMax` del precio en `crearactividad` / `actualizaractividad`. */
export const PRECIO_MAXIMO = 1000000;
/** Espejo del `@Max` del cupo en `crearclase` / `actualizarclase`. */
export const CUPO_MAXIMO = 500;
