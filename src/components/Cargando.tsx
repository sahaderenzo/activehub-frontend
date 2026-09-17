import { useEffect } from "react";
import { createPortal } from "react-dom";
import { s } from "../lib/style";

/**
 * Los dos estados de carga de la app. **Usar estos, no un spinner suelto por pantalla.**
 *
 * <h2>Por qué son dos y no uno</h2>
 *
 * Son dos problemas distintos y se ven distinto a propósito:
 *
 * <ul>
 *   <li><b>{@link CargandoAccion} — el usuario apretó algo y hay que esperar.</b> Inscribirse,
 *       pagar, publicar una reseña. Tapa la pantalla con un fondo gris y un cartel centrado:
 *       la espera es corta pero el doble click es caro (dos inscripciones, dos cobros), así
 *       que el overlay <b>bloquea de verdad</b> en vez de confiar en que el botón se
 *       deshabilite.</li>
 *   <li><b>{@link CargandoSeccion} — la pantalla todavía no tiene los datos.</b> Reemplaza el
 *       contenido por "Cargando X, por favor espere" <b>hasta que esté todo</b>. Nunca se
 *       pinta la pantalla a medias.</li>
 * </ul>
 *
 * <h2>El bug que resuelve el segundo</h2>
 *
 * Reportado: un alumno entraba a "Mis clases", veía los contadores en 0 y la lista vacía, y
 * concluía que no tenía nada anotado — cuando en realidad la consulta seguía en vuelo. Lo
 * mismo en los paneles del admin, con KPIs en cero, y en los comentarios de una actividad.
 * **Un cero y un vacío son afirmaciones**, y mientras los datos no llegaron son falsas. Es la
 * misma regla que ya obligaba a que el estado de error reemplace al estado vacío
 * (`ErrorReintentar`), extendida al tercer estado: cargando.
 *
 * <p>De ahí que el prop se llame `listo` y no `cargando`: la pantalla declara cuándo tiene
 * **todo** lo que necesita. Con varias consultas en paralelo hay que esperar a la última —
 * mostrar media pantalla es exactamente el problema que esto viene a resolver.
 */

const SPINNER = (tam: number, color: string, pista: string) =>
  `display:block;width:${tam}px;height:${tam}px;border:3px solid ${pista};border-top-color:${color};border-radius:99px;animation:ahspin .8s linear infinite;`;

interface CargandoAccionProps {
  /**
   * Qué se está haciendo, en gerundio y sin punto final: "Confirmando tu inscripción",
   * "Procesando el pago", "Publicando tu reseña".
   */
  mensaje: string;
  /** Si no está activo no se renderiza nada; así la pantalla no necesita un ternario. */
  activo: boolean;
}

/**
 * Overlay bloqueante con el fondo gris. Va en un **portal a `document.body`** por la misma
 * razón que `Modal`: `.ah-screen` anima `transform` y captura a sus descendientes
 * `position:fixed`, así que un overlay escrito dentro de la pantalla se centra contra el alto
 * del documento y no contra la ventana (ver el comentario largo de `Modal.tsx`).
 */
export function CargandoAccion({ mensaje, activo }: CargandoAccionProps) {
  // Mientras tapa la pantalla, el fondo no se scrollea: es una espera, no una pantalla.
  useEffect(() => {
    if (!activo) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [activo]);

  if (!activo) return null;

  return createPortal(
    <div
      role="alert"
      aria-busy="true"
      style={s(
        "position:fixed;inset:0;z-index:120;background:rgba(14,42,71,.45);display:flex;align-items:center;justify-content:center;padding:20px;",
      )}
    >
      <div
        style={s(
          "background:#fff;border-radius:18px;padding:28px 34px;box-shadow:0 22px 50px rgba(14,42,71,.28);display:flex;flex-direction:column;align-items:center;gap:15px;max-width:340px;text-align:center;",
        )}
      >
        <span style={s(SPINNER(34, "#0FB8A9", "#D7F2ED"))} />
        <div style={s("font:700 15.5px Manrope,sans-serif;color:#0E2A47;line-height:1.4;")}>{mensaje}…</div>
        <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>Por favor esperá, no cierres esta ventana.</div>
      </div>
    </div>,
    document.body,
  );
}

interface CargandoSeccionProps {
  /**
   * El nombre de lo que se está trayendo, en minúscula y plural cuando corresponda:
   * "clases", "comentarios", "actividades". Se arma "Cargando {seccion}, por favor espere".
   */
  seccion: string;
}

/** Cartel que ocupa el lugar del contenido hasta que la pantalla tiene todos sus datos. */
export function CargandoSeccion({ seccion }: CargandoSeccionProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      style={s(
        "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:46px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;",
      )}
    >
      <span style={s(SPINNER(28, "#0FB8A9", "#D7F2ED"))} />
      <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>Cargando {seccion}, por favor espere</div>
    </div>
  );
}
