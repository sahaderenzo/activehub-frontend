import { useState } from "react";

/**
 * Pagina una lista que ya está entera en el cliente (la convención del proyecto: el backend
 * devuelve todo y la pantalla filtra y pagina). Va con `components/Paginacion.tsx`.
 *
 * La página pedida se guarda tal cual y la efectiva se DERIVA, recortada a las que existen:
 * si un filtro o una resolución achica la lista, se cae a la última válida en vez de mostrar
 * una página vacía, y sin un efecto que sincronice (`react-hooks/set-state-in-effect`).
 *
 * Dos opciones, también derivadas (sin efectos):
 * - `claveReinicio`: cuando cambia (p. ej. una firma de los filtros aplicados), se vuelve a la
 *   página 1. Así una pantalla con muchos filtros no tiene que acordarse de reiniciar en cada
 *   uno, y nunca queda parada en la página 4 de un resultado distinto.
 * - `paginaPreferida`: la página a mostrar mientras el usuario no eligió ninguna (p. ej. la que
 *   contiene la fila a la que lleva una notificación). En cuanto navega, manda lo que eligió.
 */
export function usePaginado<T>(items: T[], porPagina: number, claveReinicio = "", paginaPreferida?: number) {
  const [estado, setEstado] = useState<{ pagina: number | null; clave: string }>({ pagina: null, clave: claveReinicio });
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const pedida = estado.clave !== claveReinicio ? 1 : (estado.pagina ?? paginaPreferida ?? 1);
  const paginaActual = Math.min(Math.max(1, pedida), totalPaginas);
  const visibles = items.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  const irAPagina = (n: number) => setEstado({ pagina: Math.min(totalPaginas, Math.max(1, n)), clave: claveReinicio });
  return { visibles, paginaActual, totalPaginas, irAPagina };
}
