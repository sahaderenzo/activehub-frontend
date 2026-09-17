/**
 * Normalización de texto para BUSCAR, no para mostrar.
 *
 * <p>Reportado: buscar "inscripcion" no encontraba "Inscripción". Cada buscador del sistema
 * hacía su propio `.toLowerCase().includes(...)`, que compara code points: `ó` y `o` son dos
 * caracteres distintos, así que escribir sin tilde —lo normal cuando se tipea rápido, y lo
 * único posible en algunos teclados— no traía nada. En castellano eso no es un detalle: casi
 * toda palabra larga lleva tilde.
 *
 * <p>`normalizar` baja a minúsculas y **descompone** el texto (NFD) para separar cada letra de
 * su tilde, y borra los diacríticos combinantes. "Inscripción" y "inscripcion" quedan iguales;
 * la **ñ** también se aplana a "n", que es lo que la gente espera al buscar ("niño"/"nino").
 *
 * <p>**Usar SIEMPRE esto en cualquier filtro por texto** (`incluye`), nunca `toLowerCase()` a
 * secas. El espejo del lado del servidor es `ActividadSpecifications.conTexto`, que hace lo
 * mismo en SQL con `translate()`.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Si `texto` contiene `termino`, ignorando tildes y mayúsculas. Un término vacío matchea
 * todo, así el caso "sin búsqueda" no necesita un `if` en cada pantalla.
 */
export function incluye(texto: string | null | undefined, termino: string): boolean {
  const t = normalizar(termino.trim());
  if (!t) return true;
  return normalizar(texto ?? "").includes(t);
}
