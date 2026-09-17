import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Marca y trae a la vista la fila a la que apunta una notificación.
 *
 * <p>Sin esto, "llevar al asunto" queda a mitad de camino: el click de "Un alumno canceló su
 * inscripción a Yoga del 12/03" aterrizaba en una lista de treinta filas sin decir cuál era.
 * La pantalla de destino declara con qué parámetro de query la buscan (`?clase=`,
 * `?resenia=`, `?denuncia=`…, ver `lib/notificaciones.ts`) y pinta la fila que coincide.
 *
 * <p>El resaltado se **apaga solo** a los pocos segundos: sirve para encontrar la fila al
 * llegar, no para dejarla marcada mientras el usuario sigue trabajando en la pantalla. El
 * parámetro queda en la URL igual, así que recargar vuelve a marcarla.
 */
const DURACION_MS = 4000;

/** Borde y halo del resaltado. Se concatena al final del `style` de la fila. */
export const ESTILO_RESALTE = "border-color:#FF6A2B;box-shadow:0 0 0 3px #FFE4D5;";

export interface Resaltado {
  /** El id buscado, o `null`. Útil para elegir pestaña/actividad antes de renderizar. */
  id: string | null;
  /** Si esta fila es la buscada y el resaltado sigue activo. */
  activo: (idFila: string) => boolean;
  /** `ref` para la fila buscada: la trae a la vista al montarse. `undefined` para el resto. */
  ref: (idFila: string) => ((nodo: HTMLElement | null) => void) | undefined;
}

export function useResaltado(parametro: string): Resaltado {
  const [searchParams] = useSearchParams();
  const id = searchParams.get(parametro);
  // Qué id ya cumplió su tiempo en pantalla. Se guarda el id y no un booleano para no tener
  // que reactivarlo en un `setState` sincrónico dentro del efecto cuando cambia el parámetro.
  const [apagado, setApagado] = useState<string | null>(null);
  const visible = id !== null && apagado !== id;

  // Una sola vez por id: la lista se re-renderiza en cada carga y scrollear de nuevo mientras
  // el usuario ya está leyendo otra cosa es un salto molesto, no una ayuda.
  const yaCentrado = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    yaCentrado.current = null;
    const timer = window.setTimeout(() => setApagado(id), DURACION_MS);
    return () => window.clearTimeout(timer);
  }, [id]);

  const centrar = useCallback(
    (nodo: HTMLElement | null) => {
      if (!nodo || !id || yaCentrado.current === id) return;
      yaCentrado.current = id;
      nodo.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [id],
  );

  return {
    id,
    activo: (idFila) => visible && idFila === id,
    ref: (idFila) => (idFila === id ? centrar : undefined),
  };
}
