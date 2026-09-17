import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import ErrorReintentar from "./ErrorReintentar";
import { rutaNotificacion } from "../lib/notificaciones";
import type { Area } from "../lib/areas";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type { Notificacion } from "../context/DataContext";

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface NotificationBellProps {
  /** Ajuste visual para fondos oscuros, como el sidebar de instructor/admin. */
  variant?: "light" | "dark";
  /** Desde qué borde de la campana cuelga el dropdown, para no salirse de la pantalla. */
  align?: "left" | "right";
  /**
   * Desde qué área se abrió la campana. Sólo desempata a dónde lleva el click cuando el
   * usuario tiene las dos pantallas que muestran ese destino (ver `lib/notificaciones.ts`).
   */
  area: Area;
}

/** Campana de notificaciones, compartida por los 3 roles (alumno/instructor/admin). */
export default function NotificationBell({ variant = "light", align = "right", area }: NotificationBellProps) {
  const { listarNotificaciones, marcarNotificacionesLeidas } = useData();
  const { permisos } = useAuth();
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);

  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = () => {
    listarNotificaciones()
      .then((lista) => {
        setNotificaciones(lista);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const toggle = () => {
    const abriendo = !open;
    setOpen(abriendo);
    if (abriendo && noLeidas > 0) {
      marcarNotificacionesLeidas()
        .then(() => setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true }))))
        .catch(() => {});
    }
  };

  const abrir = (ruta: string) => {
    setOpen(false);
    navigate(ruta);
  };

  return (
    <div style={s("position:relative;")}>
      <button
        className="ah-btn"
        onClick={toggle}
        style={s(
          variant === "dark"
            ? "position:relative;width:40px;height:40px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);cursor:pointer;display:flex;align-items:center;justify-content:center;"
            : "position:relative;width:40px;height:40px;border-radius:11px;border:1px solid #E7EDF3;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;",
        )}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={variant === "dark" ? "#9DB3C9" : "#41566B"} strokeWidth={2}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {noLeidas > 0 && (
          <span
            style={s(
              "position:absolute;top:6px;right:7px;min-width:15px;height:15px;padding:0 3px;border-radius:99px;background:#FF6A2B;border:1.5px solid #fff;color:#fff;font:700 9.5px Manrope,sans-serif;display:flex;align-items:center;justify-content:center;",
            )}
          >
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={s("position:fixed;inset:0;z-index:60;")} onClick={() => setOpen(false)} />
          <div
            style={s(
              `position:absolute;top:48px;${align === "left" ? "left:0" : "right:0"};z-index:61;width:340px;max-height:420px;overflow-y:auto;background:#fff;border:1px solid #E7EDF3;border-radius:14px;box-shadow:0 12px 32px rgba(14,42,71,.14);`,
            )}
          >
            <div style={s("padding:14px 16px;border-bottom:1px solid #F1F4F8;font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>
              Notificaciones
            </div>
            {errorCarga ? (
              // "No tenés notificaciones" con el backend caído es una afirmación falsa.
              <div style={s("padding:16px;")}>
                <ErrorReintentar mensaje="No pudimos cargar tus notificaciones." onReintentar={cargar} />
              </div>
            ) : notificaciones.length === 0 ? (
              <div style={s("padding:26px 16px;text-align:center;font-size:13px;color:#90A1B2;")}>
                No tenés notificaciones.
              </div>
            ) : (
              notificaciones.map((n) => {
                // Sin destino (o sin permiso para la pantalla que lo muestra) la fila se
                // muestra igual, pero como texto: un click que rebota al home es peor que
                // ninguno. Ver `lib/notificaciones.ts`.
                const ruta = rutaNotificacion(n, area, permisos);
                return (
                  <div
                    key={n.id}
                    className={ruta ? "ah-btn" : undefined}
                    role={ruta ? "link" : undefined}
                    tabIndex={ruta ? 0 : undefined}
                    onClick={ruta ? () => abrir(ruta) : undefined}
                    onKeyDown={ruta ? (e) => { if (e.key === "Enter" || e.key === " ") abrir(ruta); } : undefined}
                    style={s(
                      `padding:12px 16px;border-bottom:1px solid #F5F7FA;display:flex;gap:9px;align-items:flex-start;background:${n.leida ? "transparent" : "#F7FBFA"};cursor:${ruta ? "pointer" : "default"};`,
                    )}
                  >
                    <span
                      style={s(
                        `width:8px;height:8px;border-radius:99px;margin-top:5px;flex:none;background:${n.leida ? "transparent" : "#12B5A5"};`,
                      )}
                    />
                    <div style={s("min-width:0;flex:1;")}>
                      <div style={s("font-size:13px;color:#33485E;font-weight:600;line-height:1.4;")}>{n.mensaje}</div>
                      <div style={s("font-size:11px;color:#90A1B2;font-weight:600;margin-top:4px;")}>
                        {formatFechaHora(n.createdAt)}
                      </div>
                    </div>
                    {ruta && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#C2CEDA"
                        strokeWidth={2.4}
                        style={s("flex:none;margin-top:4px;")}
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
