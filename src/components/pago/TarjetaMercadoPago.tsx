import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../lib/api";
import Modal from "../Modal";
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
 *
 * Desvincular (KAN-67) se ofrece con la cuenta vinculada y también con la autorización
 * vencida. Si quedan pagos de MP retenidos o en revisión el backend responde 409 con el
 * mensaje ya redactado (dice cuántos son), y se muestra tal cual.
 */
export default function TarjetaMercadoPago() {
  const { obtenerCuentaMercadoPago, iniciarVinculacionMercadoPago, desvincularMercadoPago } = useData();
  const [params, setParams] = useSearchParams();
  const [cuenta, setCuenta] = useState<CuentaMercadoPago | null>(null);
  const [cargando, setCargando] = useState(true);
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);
  const [errorDesvincular, setErrorDesvincular] = useState<string | null>(null);
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

  const desvincular = async () => {
    setErrorDesvincular(null);
    setDesvinculando(true);
    try {
      await desvincularMercadoPago();
      setConfirmando(false);
      cargar();
    } catch (err) {
      setErrorDesvincular(
        err instanceof ApiError ? err.message : "No pudimos desvincular tu cuenta. Intentá de nuevo.",
      );
    } finally {
      setDesvinculando(false);
    }
  };

  const cerrarConfirmacion = () => {
    if (desvinculando) return;
    setConfirmando(false);
    setErrorDesvincular(null);
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
        {!cargando && (vinculada || vencida) && (
          <button
            type="button"
            className="ah-btn"
            onClick={() => setConfirmando(true)}
            style={s(
              "background:#fff;color:#BE3A3E;border:1px solid #F3D2D3;border-radius:12px;padding:10px 16px;font:700 13.5px Manrope;cursor:pointer;",
            )}
          >
            Desvincular
          </button>
        )}
      </div>

      {confirmando && (
        <Modal onClose={cerrarConfirmacion}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-desvincular-mp"
            style={s(
              "width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);",
            )}
          >
            <div
              id="titulo-desvincular-mp"
              style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:10px;")}
            >
              ¿Desvincular tu cuenta de Mercado Pago?
            </div>
            <div style={s("font-size:13.5px;color:#41566B;line-height:1.5;")}>
              Desde ese momento tus clases solo van a aceptar pagos en efectivo. Podés volver a vincularla cuando
              quieras.
            </div>
            {errorDesvincular && (
              <div
                role="alert"
                style={s(
                  "background:#FBEAEB;border:1px solid #F3D2D3;color:#BE3A3E;border-radius:12px;padding:12px 14px;margin-top:14px;font:600 13px Manrope;line-height:1.45;",
                )}
              >
                {errorDesvincular}
              </div>
            )}
            <div style={s("display:flex;gap:10px;margin-top:20px;")}>
              <button
                type="button"
                className="ah-btn"
                onClick={cerrarConfirmacion}
                disabled={desvinculando}
                style={s(
                  "flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
                )}
              >
                {errorDesvincular ? "Cerrar" : "Cancelar"}
              </button>
              {!errorDesvincular && (
                <button
                  type="button"
                  className="ah-btn"
                  onClick={desvincular}
                  disabled={desvinculando}
                  style={s(
                    "flex:1;background:#BE3A3E;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
                  )}
                >
                  {desvinculando ? "Desvinculando…" : "Sí, desvincular"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
