import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Logo from "../../components/Logo";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora, getCategoria, getTipoActividad, getUsuario, tipoIngreso } from "../../lib/mockData";

type Metodo = "Mercado Pago" | "Efectivo";

export default function AlumnoInscripcion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { clases, actividades, inscribirse } = useData();
  const [metodo, setMetodo] = useState<Metodo>("Mercado Pago");
  const [confirmado, setConfirmado] = useState(false);

  const clase = clases.find((c) => c.id === id);
  const actividad = clase ? actividades.find((a) => a.id === clase.actividadId) : undefined;

  useEffect(() => {
    // La inscripción con pago solo aplica a 4 días o menos de la clase; si
    // todavía faltan más de 4 días, lo correcto es preinscribirse primero.
    if (clase && tipoIngreso(clase) !== "inscripcion" && !confirmado) {
      navigate(`/alumno/reserva/${clase.id}`, { replace: true });
    }
  }, [clase, confirmado, navigate]);

  if (!clase || !actividad) {
    return (
      <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;display:flex;align-items:center;justify-content:center;")}>
        <p style={s("color:#65788C;font-weight:600;")}>Clase no encontrada.</p>
      </div>
    );
  }

  const tipo = getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const instructor = getUsuario(actividad.instructorId);

  const confirmarPago = (m: Metodo) => {
    if (!currentUser) return;
    inscribirse(clase.id, currentUser.id, m);
    setConfirmado(true);
  };

  if (confirmado) {
    return (
      <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
        <header style={s("background:#fff;border-bottom:1px solid #E7EDF3;")}>
          <div style={s("max-width:1000px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;")}>
            <Logo size={32} to="/alumno" />
          </div>
        </header>
        <div style={s("max-width:600px;margin:0 auto;padding:60px 28px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:44px 30px;text-align:center;")}>
            <span
              style={s(
                "display:inline-flex;width:64px;height:64px;border-radius:99px;background:#E7F8F5;align-items:center;justify-content:center;margin-bottom:18px;",
              )}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h1 style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;")}>
              {metodo === "Mercado Pago" ? "¡Inscripción confirmada!" : "¡Lugar reservado!"}
            </h1>
            <p style={s("font-size:14.5px;color:#65788C;margin:0 0 26px;max-width:420px;margin-inline:auto;")}>
              {metodo === "Mercado Pago"
                ? `Tu pago fue aprobado y tu lugar en ${actividad.nombre} del ${formatFecha(clase.fechaHora)} quedó confirmado.`
                : `Tu lugar en ${actividad.nombre} del ${formatFecha(clase.fechaHora)} quedó reservado con pago pendiente. Abonalo directamente al instructor.`}
            </p>
            <button
              className="ah-btn"
              onClick={() => navigate("/alumno/mis-clases")}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px 26px;font:700 15px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Ver mis clases
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <header style={s("background:#fff;border-bottom:1px solid #E7EDF3;")}>
        <div style={s("max-width:1000px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;gap:14px;")}>
          <span
            className="ah-link"
            onClick={() => navigate(`/alumno/actividad/${actividad.id}`)}
            style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver
          </span>
          <div style={s("margin-left:auto;")}>
            <Logo size={32} to="/alumno" />
          </div>
        </div>
      </header>
      <div style={s("max-width:1000px;margin:0 auto;padding:30px 28px 70px;")}>
        <div style={s("display:flex;align-items:center;gap:6px;margin-bottom:28px;max-width:560px;")}>
          <div style={s("display:flex;align-items:center;gap:9px;")}>
            <span
              style={s(
                "width:28px;height:28px;border-radius:99px;background:#0FB8A9;color:#fff;display:flex;align-items:center;justify-content:center;",
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>Resumen</span>
          </div>
          <div style={s("flex:1;height:2px;background:#FF6A2B;")} />
          <div style={s("display:flex;align-items:center;gap:9px;")}>
            <span
              style={s(
                "width:28px;height:28px;border-radius:99px;background:#FF6A2B;color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk,sans-serif;",
              )}
            >
              2
            </span>
            <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>Pago</span>
          </div>
          <div style={s("flex:1;height:2px;background:#E2E9F0;")} />
          <div style={s("display:flex;align-items:center;gap:9px;")}>
            <span
              style={s(
                "width:28px;height:28px;border-radius:99px;background:#E8EDF2;color:#90A1B2;display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk,sans-serif;",
              )}
            >
              3
            </span>
            <span style={s("font:700 13.5px Manrope,sans-serif;color:#90A1B2;")}>Confirmación</span>
          </div>
        </div>

        <h1 style={s("font:700 28px Space Grotesk,sans-serif;letter-spacing:-.6px;margin:0 0 22px;")}>Inscripción y pago</h1>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;")}>
          <div>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Elegí tu método de pago</div>
            <div style={s("display:flex;flex-direction:column;gap:13px;margin-bottom:22px;")}>
              <div
                onClick={() => setMetodo("Mercado Pago")}
                className="ah-btn"
                style={s(
                  `cursor:pointer;background:${metodo === "Mercado Pago" ? "#F3FBFA" : "#fff"};border:2px solid ${metodo === "Mercado Pago" ? "#0FB8A9" : "#E7EDF3"};border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:15px;`,
                )}
              >
                <RadioDot on={metodo === "Mercado Pago"} />
                <div style={s("width:46px;height:46px;border-radius:11px;background:#009EE3;display:flex;align-items:center;justify-content:center;")}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                    <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </div>
                <div style={s("flex:1;")}>
                  <div style={s("font:700 16px Manrope,sans-serif;color:#0E2A47;")}>MercadoPago</div>
                  <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>Tarjeta de crédito, débito o dinero en cuenta</div>
                </div>
                <span
                  style={s(
                    "font:700 11px Manrope,sans-serif;color:#0C8576;background:#E7F8F5;border:1px solid #CBEDE7;padding:4px 9px;border-radius:99px;",
                  )}
                >
                  Recomendado
                </span>
              </div>
              <div
                onClick={() => setMetodo("Efectivo")}
                className="ah-btn"
                style={s(
                  `cursor:pointer;background:${metodo === "Efectivo" ? "#F3FBFA" : "#fff"};border:2px solid ${metodo === "Efectivo" ? "#0FB8A9" : "#E7EDF3"};border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:15px;`,
                )}
              >
                <RadioDot on={metodo === "Efectivo"} />
                <div style={s("width:46px;height:46px;border-radius:11px;background:#E7F8F5;display:flex;align-items:center;justify-content:center;")}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.5" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                </div>
                <div style={s("flex:1;")}>
                  <div style={s("font:700 16px Manrope,sans-serif;color:#0E2A47;")}>Efectivo</div>
                  <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>Pagás presencialmente al instructor</div>
                </div>
              </div>
            </div>

            {metodo === "Mercado Pago" ? (
              <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;")}>
                <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:14px;")}>
                  <div style={s("width:34px;height:34px;border-radius:9px;background:#009EE3;display:flex;align-items:center;justify-content:center;")}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                      <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  </div>
                  <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>Pagar con MercadoPago</div>
                </div>
                <p style={s("font-size:13.5px;line-height:1.55;color:#65788C;margin:0 0 16px;")}>
                  Vas a ser redirigido a la pasarela segura de MercadoPago para completar el pago. Tu lugar queda reservado mientras
                  tanto.
                </p>
                <button
                  className="ah-btn"
                  onClick={() => confirmarPago("Mercado Pago")}
                  style={s(
                    "width:100%;background:#009EE3;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(0,158,227,.28);",
                  )}
                >
                  Pagar ${actividad.precio.toLocaleString("es-AR")} con MercadoPago
                </button>
              </div>
            ) : (
              <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;")}>
                <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;margin-bottom:12px;")}>Instrucciones de pago en efectivo</div>
                <div style={s("display:flex;flex-direction:column;gap:12px;margin-bottom:18px;")}>
                  <EfectivoStep n={1}>
                    Tu lugar queda <strong>reservado con pago pendiente</strong> hasta el inicio de la clase.
                  </EfectivoStep>
                  <EfectivoStep n={2}>
                    Llegá <strong>10 minutos antes</strong> y aboná los ${actividad.precio.toLocaleString("es-AR")} directamente al
                    instructor.
                  </EfectivoStep>
                  <EfectivoStep n={3}>El instructor confirma tu asistencia y tu inscripción queda completa.</EfectivoStep>
                </div>
                <button
                  className="ah-btn"
                  onClick={() => confirmarPago("Efectivo")}
                  style={s(
                    "width:100%;background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(15,184,169,.3);",
                  )}
                >
                  Confirmar inscripción (pago en efectivo)
                </button>
              </div>
            )}
          </div>

          <div
            style={s(
              "position:sticky;top:24px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
            )}
          >
            <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:16px;")}>Resumen de tu clase</div>
            <div style={s("display:flex;gap:13px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #EEF2F6;")}>
              <div style={s(`width:60px;height:60px;border-radius:11px;flex:none;background:${actividad.photoTint};`)} />
              <div>
                <div style={s("font:700 11px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;")}>
                  {cat?.nombre}
                </div>
                <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;line-height:1.25;")}>{actividad.nombre}</div>
              </div>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:10px;margin-bottom:16px;font-size:13.5px;")}>
              <Row label="Fecha" value={`${formatFecha(clase.fechaHora)} · ${formatHora(clase.fechaHora)}`} />
              <Row label="Instructor" value={instructor ? `${instructor.nombre} ${instructor.apellido}` : ""} />
              <Row label="Ubicación" value={actividad.ubicacion} />
            </div>
            <div style={s("border-top:1px solid #EEF2F6;padding-top:14px;display:flex;flex-direction:column;gap:9px;")}>
              <div style={s("display:flex;justify-content:space-between;font-size:13.5px;")}>
                <span style={s("color:#7A8C9E;font-weight:600;")}>Subtotal</span>
                <span style={s("font-weight:700;color:#0E2A47;")}>${actividad.precio.toLocaleString("es-AR")}</span>
              </div>
              <div style={s("display:flex;justify-content:space-between;font-size:13.5px;")}>
                <span style={s("color:#7A8C9E;font-weight:600;")}>Cargo de servicio</span>
                <span style={s("font-weight:700;color:#0E2A47;")}>$0</span>
              </div>
              <div style={s("display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;")}>
                <span style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>Total</span>
                <span style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;")}>${actividad.precio.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      style={s(
        `width:20px;height:20px;border-radius:99px;border:2px solid ${on ? "#0FB8A9" : "#D6DEE7"};display:flex;align-items:center;justify-content:center;flex:none;`,
      )}
    >
      {on && <span style={s("width:10px;height:10px;border-radius:99px;background:#0FB8A9;")} />}
    </span>
  );
}

function EfectivoStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={s("display:flex;gap:11px;align-items:flex-start;")}>
      <span
        style={s(
          "width:24px;height:24px;border-radius:99px;background:#E7F8F5;color:#0C8576;display:flex;align-items:center;justify-content:center;font:700 12px Space Grotesk,sans-serif;flex:none;",
        )}
      >
        {n}
      </span>
      <span style={s("font-size:14px;color:#54697E;font-weight:500;line-height:1.5;")}>{children}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={s("display:flex;justify-content:space-between;")}>
      <span style={s("color:#7A8C9E;font-weight:600;")}>{label}</span>
      <span style={s("font-weight:700;color:#0E2A47;")}>{value}</span>
    </div>
  );
}
