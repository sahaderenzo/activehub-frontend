/**
 * Pide algo a la API **sólo si el permiso está**; si no, resuelve con el vacío sin llamar.
 *
 * <p>Existe por una consecuencia de RN-19 que no es obvia: un permiso habilita un *módulo*,
 * no un *área*, así que cualquier combinación es posible — un rol con `reportes.ver` y nada
 * más, o con `penalizaciones.gestionar` sin `usuarios.gestionar`. Varias pantallas cargan sus
 * datos con un `Promise.all` de tres, cuatro o cinco consultas de módulos distintos, y
 * `Promise.all` **se rechaza entero si una sola falla**: un 403 de una consulta secundaria
 * dejaba la pantalla completa en estado de error, aunque el módulo que el usuario sí tiene
 * hubiera respondido bien. Es la misma trampa que ya había costado la landing pública cuando
 * `/api/niveles-intensidad` se olvidó de la lista `permitAll`.
 *
 * <p>La regla, entonces: **en un `Promise.all` que cruza módulos, cada consulta va envuelta
 * acá con el permiso que exige su `@PreAuthorize`.** Lo que no se pudo pedir queda vacío y la
 * pantalla oculta esa sección — nunca la muestra en cero, que se lee como "no hay datos" en
 * vez de "no tenés permiso".
 */
export function siPuede<T>(habilitado: boolean, pedir: () => Promise<T>, vacio: T): Promise<T> {
  return habilitado ? pedir() : Promise.resolve(vacio);
}
