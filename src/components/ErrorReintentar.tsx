import { s } from "../lib/style";

/**
 * Estado de error con acción de recuperación, compartido por todas las pantallas.
 *
 * <p>Existe porque el patrón `.catch(() => {})` estaba repetido en 16 pantallas: el error se
 * tragaba y quedaba el estado vacío, así que <b>un backend caído se veía exactamente igual que
 * una plataforma sin datos</b>. La especificación pide "Reintentar" como criterio de error en
 * prácticamente todas las HU.
 *
 * `variant="bloque"` (default) es el recuadro para cuando la pantalla no tiene nada que mostrar;
 * `variant="banner"` es la franja fina para cuando ya hay contenido en pantalla.
 */
export default function ErrorReintentar({
  mensaje = "No pudimos cargar la información.",
  onReintentar,
  variant = "bloque",
  dark = false,
}: {
  mensaje?: string;
  onReintentar?: () => void;
  variant?: "bloque" | "banner";
  dark?: boolean;
}) {
  const paleta = dark
    ? { bg: "rgba(255,255,255,.06)", bd: "rgba(255,255,255,.16)", fg: "#F3C6C7", btnBg: "rgba(255,255,255,.12)", btnFg: "#fff" }
    : { bg: "#FBEAEB", bd: "#F3D2D3", fg: "#BE3A3E", btnBg: "#fff", btnFg: "#BE3A3E" };

  const layout =
    variant === "bloque"
      ? "flex-direction:column;align-items:center;text-align:center;gap:12px;padding:30px 22px;"
      : "align-items:center;gap:12px;padding:13px 15px;";

  return (
    <div
      role="alert"
      style={s(`display:flex;${layout}background:${paleta.bg};border:1px solid ${paleta.bd};border-radius:14px;`)}
    >
      {variant === "bloque" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={paleta.fg} strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )}
      <span style={s(`flex:${variant === "banner" ? "1" : "none"};font:600 13.5px Manrope,sans-serif;line-height:1.45;color:${paleta.fg};`)}>
        {mensaje}
      </span>
      {onReintentar && (
        <button
          className="ah-btn"
          onClick={onReintentar}
          style={s(
            `flex:none;background:${paleta.btnBg};border:1px solid ${paleta.bd};border-radius:9px;padding:9px 16px;font:700 12.5px Manrope,sans-serif;color:${paleta.btnFg};cursor:pointer;`,
          )}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
