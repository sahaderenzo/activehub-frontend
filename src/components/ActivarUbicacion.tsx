import { s } from "../lib/style";
import type { GeolocationState } from "../lib/geo";

interface Props {
  geolocation: GeolocationState;
  /** Para qué se usa la ubicación en esta pantalla, completa la frase "Activá tu ubicación para…". */
  para: string;
  /** "bloque" reemplaza un estado vacío; "linea" va dentro de un panel ya armado. */
  variante?: "bloque" | "linea";
}

/**
 * Botón "Activar ubicación" para quien tiene la ubicación apagada. Pedido del usuario: nada de
 * instrucciones, un botón que abra el cartel del navegador.
 *
 * - Cartel cerrado sin elegir: el botón llama a `reintentar` y el navegador vuelve a mostrar su
 *   cartel de permiso, el mismo de la barra de direcciones.
 * - Permiso BLOQUEADO: ningún código de la página puede reabrir ese cartel ni el panel de
 *   permisos de la barra (no existe una API para eso). Queda el botón y una sola línea que dice
 *   dónde se habilita; al habilitarlo, `useGeolocation` lo detecta y pide la ubicación solo.
 *
 * NO usar el elemento nativo `<geolocation>`: abre otro cuadro, centrado en la pantalla, y en
 * Brave confirmar desde él cierra el navegador entero (reportado 2026-10-17, también con una
 * exclusión de Brave que no alcanzó). Se probó y se retiró.
 *
 * Sólo se muestra con la ubicación negada; con "unsupported" no hay nada que activar.
 */
export default function ActivarUbicacion({ geolocation, para, variante = "bloque" }: Props) {
  // Al tocar el botón el estado pasa a "loading" y esto desaparece: la pantalla muestra su
  // propio "buscando…" mientras el navegador espera la respuesta del cartel.
  if (geolocation.status !== "denied") return null;

  return (
    <div
      role="status"
      style={s(
        variante === "bloque"
          ? "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:24px 20px;text-align:center;"
          : "background:#F4F8FD;border:1px solid #DCE7F5;border-radius:12px;padding:12px 14px;",
      )}
    >
      <div style={s("font:600 13.5px Manrope,sans-serif;color:#41566B;line-height:1.5;margin-bottom:10px;")}>
        Activá tu ubicación para {para}.
      </div>
      <button
        type="button"
        className="ah-btn"
        onClick={geolocation.reintentar}
        style={s(
          "display:inline-flex;align-items:center;gap:8px;background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:10px 16px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
        )}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Activar ubicación
      </button>
      {geolocation.bloqueado && (
        <div style={s("font:600 12px Manrope,sans-serif;color:#7A8C9E;margin-top:8px;")}>
          Tu navegador la tiene bloqueada: habilitala desde el ícono junto a la dirección de la página.
        </div>
      )}
    </div>
  );
}
