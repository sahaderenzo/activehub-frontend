import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { CuentaMercadoPago } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";

/** Lo que devuelve el callback del backend en `?mercadopago=` al volver de Mercado Pago. */
const AVISOS: Record<string, { tono: "ok" | "error"; texto: string }> = {
  vinculada: { tono: "ok", texto: "¡Listo! Vinculaste tu cuenta de Mercado Pago. Ya podés cobrar tus clases con tarjeta." },
  cancelada: { tono: "error", texto: "Cancelaste la vinculación en Mercado Pago. Podés intentarlo de nuevo cuando quieras." },
  error: { tono: "error", texto: "Mercado Pago no aceptó la vinculación. Intentá de nuevo en unos minutos." },
};

/**
 * Vincular la cuenta de Mercado Pago del instructor (OAuth, KAN-54). El botón no abre un
 * popup: redirige la pestaña entera a Mercado Pago, y el backend la devuelve a /instructor
 * con `?mercadopago=vinculada|cancelada|error`.
 */
export default function TarjetaMercadoPago() {
  const { obtenerCuentaMercadoPago, iniciarVinculacionMercadoPago } = useData();
  const [params, setParams] = useSearchParams();
  const [cuenta, setCuenta] = useState<CuentaMercadoPago | null>(null);
  const [cargando, setCargando] = useState(true);
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso] = useState(() => AVISOS[params.get("mercadopago") ?? ""] ?? null);

  // El aviso se lee una vez y el parámetro se limpia: al recargar no tiene que volver a aparecer.
  useEffect(() => {
    if (params.has("mercadopago")) {
      const siguiente = new URLSearchParams(params);
      siguiente.delete("mercadopago");
      setParams(siguiente, { replace: true });
    }
  }, [params, setParams]);

  const cargar = useCallback(() => {
    obtenerCuentaMercadoPago()
      .then((c) => {
        setCuenta(c);
        setError(null);
      })
      .catch(() => setError("No pudimos consultar tu cuenta de Mercado Pago."))
      .finally(() => setCargando(false));
  }, [obtenerCuentaMercadoPago]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const vincular = async () => {
    setError(null);
    setRedirigiendo(true);
    try {
      window.location.href = await iniciarVinculacionMercadoPago();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar la vinculación. Intentá de nuevo.");
      setRedirigiendo(false);
    }
  };

  const vinculada = cuenta?.vinculada === true;
  const vencida = cuenta?.estado === "TOKEN_VENCIDO";

  return (
    <div
      style={s(
        "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:18px 22px;margin-bottom:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
      )}
    >
      {aviso && (
        <div
          role="status"
          style={s(
            aviso.tono === "ok"
              ? "background:#E7F8F5;border:1px solid #CBEDE7;color:#0C8576;border-radius:12px;padding:12px 14px;margin-bottom:14px;font:600 13.5px Manrope;"
              : "background:#FBEAEB;border:1px solid #F3D2D3;color:#BE3A3E;border-radius:12px;padding:12px 14px;margin-bottom:14px;font:600 13.5px Manrope;",
          )}
        >
          {aviso.texto}
        </div>
      )}
      <div style={s("display:flex;align-items:center;gap:16px;flex-wrap:wrap;")}>
        <div style={s("flex:1;min-width:220px;")}>
          <div style={s("font:700 16px Space Grotesk;color:#0E2A47;")}>Cobros con Mercado Pago</div>
          <div style={s("font-size:13.5px;color:#65788C;margin-top:4px;")}>
            {cargando
              ? "Consultando tu cuenta…"
              : vinculada
                ? `Cuenta vinculada${cuenta?.actualizadaEl ? ` desde el ${formatFecha(cuenta.actualizadaEl)}` : ""}. Los pagos con tarjeta de tus clases van a tu cuenta.`
                : vencida
                  ? "La autorización de tu cuenta venció. Volvé a vincularla para seguir cobrando con tarjeta."
                  : "Vinculá tu cuenta para que tus alumnos puedan pagarte con tarjeta. Sin cuenta vinculada solo pueden pagar en efectivo."}
          </div>
          {error && <div style={s("font-size:13px;color:#BE3A3E;font-weight:600;margin-top:6px;")}>{error}</div>}
        </div>
        {!cargando && vinculada && (
          <span
            style={s(
              "background:#E7F8F5;color:#0C8576;border-radius:99px;padding:6px 12px;font:700 12.5px Manrope;",
            )}
          >
            Vinculada
          </span>
        )}
        {!cargando && !vinculada && (
          <button
            type="button"
            className="ah-btn"
            onClick={vincular}
            disabled={redirigiendo}
            style={s(
              "background:#009EE3;color:#fff;border:none;border-radius:12px;padding:11px 18px;font:700 14px Manrope;cursor:pointer;",
            )}
          >
            {redirigiendo ? "Abriendo Mercado Pago…" : vencida ? "Volver a vincular" : "Vincular Mercado Pago"}
          </button>
        )}
      </div>
    </div>
  );
}
