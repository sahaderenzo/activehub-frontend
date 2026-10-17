import { useState } from "react";

/**
 * Pagina una lista que ya está entera en el cliente (la convención del proyecto: el backend
 * devuelve todo y la pantalla filtra y pagina). Va con `components/Paginacion.tsx`.
 *
 * La página pedida se guarda tal cual y la efectiva se DERIVA, recortada a las que existen:
 * si un filtro o una resolución achica la lista, se cae a la última válida en vez de mostrar
 * una página vacía, y sin un efecto que sincronice (`react-hooks/set-state-in-effect`).
 */
export function usePaginado<T>(items: T[], porPagina: number) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = items.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  const irAPagina = (n: number) => setPagina(Math.min(totalPaginas, Math.max(1, n)));
  return { visibles, paginaActual, totalPaginas, irAPagina };
}
