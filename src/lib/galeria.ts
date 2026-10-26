import { BASE_URL } from "./api";
import { fotoActividadUrl } from "./photos";

/** Una foto del carrusel del detalle: `clave` es estable (id de la imagen o "portada"). */
export interface FotoGaleria {
  clave: string;
  src: string;
}

export const imagenActividadUrl = (imagenId: string): string => `${BASE_URL}/api/fotos/actividad/imagen/${imagenId}`;

/**
 * Las fotos de una actividad en el orden en que se muestran, sin repetir ninguna.
 *
 * La portada (`/api/fotos/actividad/{id}`) y la galería son dos cosas en el backend, pero la
 * primera imagen que se sube a la galería queda TAMBIÉN como portada y comparten el archivo:
 * mostrar las dos por separado repetía la foto. Por eso el detalle informa `portadaImagenId`.
 * - La portada va siempre primero: es la que el instructor eligió para el catálogo.
 * - Si es una imagen de la galería, se muestra una sola vez (en el primer lugar).
 * - Si se subió aparte, va primero y después la galería completa.
 *
 * Sin el detalle cargado (`imagenes` undefined) sólo se conoce la portada, que puede no existir:
 * se devuelve igual y quien la muestra la descarta si no carga.
 */
export function fotosDeActividad(a: {
  id: string;
  imagenes?: string[];
  tienePortada?: boolean;
  portadaImagenId?: string | null;
}): FotoGaleria[] {
  const portada: FotoGaleria = { clave: "portada", src: fotoActividadUrl(a.id) };
  if (a.imagenes === undefined) return [portada];

  const galeria = a.imagenes.map((id) => ({ clave: id, src: imagenActividadUrl(id) }));
  const idPortada = a.portadaImagenId ?? null;
  if (idPortada && a.imagenes.includes(idPortada)) {
    return [galeria.find((f) => f.clave === idPortada)!, ...galeria.filter((f) => f.clave !== idPortada)];
  }
  return a.tienePortada ? [portada, ...galeria] : galeria;
}
