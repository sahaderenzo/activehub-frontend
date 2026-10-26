/** Lo mínimo para filtrar y ordenar: lo cumplen las reseñas del detalle y las del instructor. */
interface Opinion {
  puntaje: number;
  createdAt: string;
}

/** Orden de la lista de opiniones (detalle del alumno y "Reseñas" del instructor). */
export const ORDENES_OPINIONES = ["Más recientes", "Más antiguas", "Mejor calificación", "Peor calificación"] as const;
export type OrdenOpiniones = (typeof ORDENES_OPINIONES)[number];

/**
 * Las opiniones que se muestran: filtradas por estrellas (null = todas) y ordenadas. A igual
 * calificación, primero la más reciente.
 */
export function opinionesVisibles<T extends Opinion>(resenias: T[], estrellas: number | null, orden: OrdenOpiniones): T[] {
  const lista = resenias.filter((r) => estrellas === null || r.puntaje === estrellas);
  const masReciente = (x: T, y: T) => y.createdAt.localeCompare(x.createdAt);
  switch (orden) {
    case "Más antiguas":
      return lista.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    case "Mejor calificación":
      return lista.sort((x, y) => y.puntaje - x.puntaje || masReciente(x, y));
    case "Peor calificación":
      return lista.sort((x, y) => x.puntaje - y.puntaje || masReciente(x, y));
    default:
      return lista.sort(masReciente);
  }
}
