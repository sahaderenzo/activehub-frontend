import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { s } from "../lib/style";

/**
 * Overlay de modal. **Usar siempre esto, nunca un `position:fixed` suelto dentro de la página.**
 *
 * <h2>El bug que resuelve</h2>
 *
 * Los modales se abrían "en el medio de la página" en vez de en el medio de la pantalla: con la
 * página scrolleada, el modal quedaba arriba de todo y había que subir para verlo. Pasaba en
 * "Mis reseñas" del alumno, en Tipos y niveles del admin y en todos los demás.
 *
 * <p>La causa no estaba en los modales —todos eran `position:fixed;inset:0`, que es correcto—
 * sino en su ancestro: `.ah-screen`, la clase del contenedor raíz de cada pantalla, tiene
 * `animation: ahFade .28s ease both`, y esa animación anima `transform`. **Un elemento con una
 * animación de `transform` aplicada crea un containing block para sus descendientes
 * `position:fixed`**, así que `inset:0` dejaba de resolverse contra el viewport y pasaba a
 * resolverse contra el alto completo de la página. En una pantalla larga, "centrado" terminaba
 * a miles de píxeles de donde estaba el usuario. Es primo del caso de `backdrop-filter` en
 * `AlumnoNav` que ya está documentado en el CLAUDE.md.
 *
 * <p>La solución es un **portal a `document.body`**: así el overlay no tiene ningún ancestro de
 * la pantalla y ninguna propiedad futura (un `transform`, un `filter`, un `contain`) puede
 * volver a capturarlo. Bajarle el `fill-mode` a la animación también lo arreglaría hoy, pero
 * dejaría la trampa armada para el próximo que agregue un efecto al contenedor.
 *
 * <p>De yapa, y por la misma razón que antes no funcionaba: mientras el modal está abierto se
 * bloquea el scroll del body, así la página de atrás no se mueve bajo el modal.
 */
interface ModalProps {
  /** Click en el fondo. Si no se pasa, el fondo no cierra (formularios con datos a medio llenar). */
  onClose?: () => void;
  children: ReactNode;
  /** Oscuridad del fondo. Por defecto el gris azulado del resto de la app. */
  fondo?: string;
  /** `centro` (por defecto) o `columna`, para el modal a pantalla completa de Reportes. */
  layout?: "centro" | "columna";
  zIndex?: number;
}

export default function Modal({
  onClose,
  children,
  fondo = "rgba(14,42,71,.45)",
  layout = "centro",
  zIndex = 80,
}: ModalProps) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  // Escape cierra, como espera cualquiera que use un modal.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const base =
    layout === "columna"
      ? `position:fixed;inset:0;z-index:${zIndex};background:${fondo};display:flex;flex-direction:column;`
      : `position:fixed;inset:0;z-index:${zIndex};background:${fondo};display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;`;

  return createPortal(
    <div
      style={s(base)}
      onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      {children}
    </div>,
    document.body,
  );
}
