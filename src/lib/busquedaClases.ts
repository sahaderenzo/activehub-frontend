import { formatFecha } from "./mockData";
import { incluye } from "./texto";

const dos = (n: number) => String(n).padStart(2, "0");

/**
 * Un solo formateador para todo el módulo: `toLocaleDateString` arma uno nuevo en cada llamada y
 * es unas 50 veces más lento, y la lupa lo pide por cada clase en cada tecla.
 */
const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });

/**
 * Si el término es una fecha numérica que coincide con el día de la clase (en hora local):
 * "24", "24/10", "24/10/2026", "4/3", "04-03"… Se compara como prefijo de "d/m/aaaa" y
 * "dd/mm/aaaa", así una fecha a medio tipear ya filtra.
 */
function coincideFechaNumerica(iso: string, termino: string): boolean {
  const t = termino.replace(/[-.\s]/g, "/");
  if (!/^\d{1,2}(\/\d{0,2}(\/\d{0,4})?)?$/.test(t)) return false;
  const d = new Date(iso);
  const [dia, mes, anio] = [d.getDate(), d.getMonth() + 1, d.getFullYear()];
  return [`${dia}/${mes}/${anio}`, `${dos(dia)}/${dos(mes)}/${anio}`].some((f) => f.startsWith(t));
}

/**
 * Búsqueda de las listas de clases del instructor (Historial): por nombre de la actividad, sin
 * tildes, o por fecha: numérica ("24/10"), abreviada como en la lista ("sáb 24 oct") o con el
 * mes completo ("24 de octubre", "octubre"). Término vacío = todas.
 */
export function claseCoincide(c: { actividadNombre: string; fechaHora: string }, termino: string): boolean {
  const t = termino.trim();
  if (!t) return true;
  const larga = FECHA_LARGA.format(new Date(c.fechaHora));
  return (
    incluye(c.actividadNombre, t) ||
    incluye(formatFecha(c.fechaHora), t) ||
    incluye(larga, t) ||
    coincideFechaNumerica(c.fechaHora, t)
  );
}
