import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";

const GUIAS = [
  {
    tint: "#E7F8F5",
    stroke: "#12B5A5",
    path: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    title: "Cómo reservar una clase",
    desc: "Elegí actividad, horario y confirmá tu lugar en pocos pasos.",
  },
  {
    tint: "#EAF1FE",
    stroke: "#3A6FF0",
    path: "M20 6 9 17l-5-5",
    title: "PreInscripción vs. Inscripción",
    desc: "Cuándo se ocupa el cupo y cuándo solo registrás tu interés.",
  },
  {
    tint: "#FFF3E0",
    stroke: "#F5A623",
    path: "M2 8h20M2 8v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8l2-4h16l2 4",
    title: "Medios de pago",
    desc: "Pagá con Mercado Pago o en efectivo directo con tu instructor.",
  },
];

const FAQS = [
  {
    q: "¿Cuál es la diferencia entre PreInscripción e Inscripción?",
    a: "Si faltan más de 4 días para la clase, solo podés PreInscribirte (registra tu interés, no ocupa cupo ni genera pago). A 4 días o menos, la inscripción es definitiva y ocupa un cupo hasta 1 hora antes del inicio.",
  },
  {
    q: "¿Cómo pago mi inscripción?",
    a: "Con Mercado Pago (el pago queda Retenido y se Libera al confirmarse la clase) o en efectivo directamente con tu instructor, quien confirma el cobro manualmente.",
  },
  {
    q: "¿Puedo cancelar una clase ya inscripta?",
    a: "Sí, desde 'Mis clases' podés cancelar tu inscripción. Una vez cancelada, no puede volver a un estado anterior.",
  },
  {
    q: "¿Cómo dejo una reseña?",
    a: "Después de que una clase en la que estuviste Inscripto finalice, vas a poder calificarla desde 'Mis reseñas'.",
  },
  {
    q: "Soy instructor, ¿cuándo puedo publicar actividades?",
    a: "Un administrador valida tu cuenta después del registro. Mientras esté en revisión podés ingresar, pero no publicar actividades.",
  },
];

export default function Ayuda() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [detalle, setDetalle] = useState("");

  const filteredFaqs = search.trim()
    ? FAQS.filter((f) => f.q.toLowerCase().includes(search.trim().toLowerCase()) || f.a.toLowerCase().includes(search.trim().toLowerCase()))
    : FAQS;

  const homeByRol: Record<string, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

  const submitReport = (e: FormEvent) => {
    e.preventDefault();
    setReportSent(true);
    setAsunto("");
    setDetalle("");
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <header
        style={s(
          "position:sticky;top:0;z-index:40;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #E7EDF3;",
        )}
      >
        <div style={s("max-width:1240px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:20px;")}>
          <Logo size={36} to={currentUser ? homeByRol[currentUser.rol] : "/"} />
          <div style={s("margin-left:auto;")}>
            <span
              className="ah-link"
              onClick={() => navigate(currentUser ? homeByRol[currentUser.rol] : "/")}
              style={s("cursor:pointer;font:700 14px Manrope;color:#41566B;")}
            >
              {currentUser ? "Volver a mi panel" : "Volver al inicio"}
            </span>
          </div>
        </div>
      </header>

      <div style={s("background:linear-gradient(135deg,#0E2A47,#143A5E);")}>
        <div style={s("max-width:900px;margin:0 auto;padding:48px 28px 44px;text-align:center;position:relative;")}>
          <h1 style={s("font:700 34px Space Grotesk;color:#fff;letter-spacing:-.8px;margin:0 0 10px;")}>¿En qué podemos ayudarte?</h1>
          <p style={s("font-size:15.5px;color:#9DB3C9;margin:0 0 24px;")}>Buscá en las preguntas frecuentes o contactá con soporte.</p>
          <div
            style={s(
              "max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:7px;display:flex;align-items:center;gap:8px;box-shadow:0 14px 30px rgba(0,0,0,.18);",
            )}
          >
            <div style={s("flex:1;display:flex;align-items:center;gap:10px;padding:9px 14px;")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Escribí tu pregunta…"
                style={s("border:none;outline:none;font:600 14.5px Manrope;color:#0E2A47;width:100%;")}
              />
            </div>
            <button
              className="ah-btn"
              style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:12px 22px;font:700 14px Manrope;cursor:pointer;")}
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div style={s("max-width:1000px;margin:0 auto;padding:34px 28px 60px;")}>
        <div style={s("font:700 18px Space Grotesk;margin-bottom:16px;")}>Guías rápidas</div>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:40px;")}>
          {GUIAS.map((g) => (
            <div
              key={g.title}
              className="ah-hov"
              style={s("cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}
            >
              <div
                style={s(
                  `width:48px;height:48px;border-radius:12px;background:${g.tint};display:flex;align-items:center;justify-content:center;margin-bottom:14px;`,
                )}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={g.stroke} strokeWidth={2}>
                  <path d={g.path} />
                </svg>
              </div>
              <div style={s("font:700 16px Manrope;color:#0E2A47;margin-bottom:6px;")}>{g.title}</div>
              <div style={s("font-size:13.5px;color:#65788C;font-weight:600;line-height:1.5;margin-bottom:12px;")}>{g.desc}</div>
              <span className="ah-link" style={s("font:700 13.5px Manrope;color:#FF6A2B;cursor:pointer;")}>
                Ver guía →
              </span>
            </div>
          ))}
        </div>

        <div className="ah-grid-side-alt" style={s("display:grid;grid-template-columns:1.5fr 1fr;gap:30px;align-items:start;")}>
          <div>
            <div style={s("font:700 18px Space Grotesk;margin-bottom:16px;")}>Preguntas frecuentes</div>
            <div style={s("display:flex;flex-direction:column;gap:11px;")}>
              {filteredFaqs.map((f) => (
                <details key={f.q} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:18px 20px;")}>
                  <summary
                    style={s(
                      "display:flex;align-items:center;justify-content:space-between;font:700 15px Manrope;color:#0E2A47;gap:14px;cursor:pointer;list-style:none;",
                    )}
                  >
                    {f.q}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2.4} style={{ flex: "none" }}>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <p style={s("font-size:14px;line-height:1.6;color:#65788C;margin:8px 0 0;")}>{f.a}</p>
                </details>
              ))}
              {filteredFaqs.length === 0 && (
                <div style={s("background:#fff;border:1px dashed #D5DEE7;border-radius:14px;padding:24px;text-align:center;color:#7A8C9E;font-weight:600;font-size:13.5px;")}>
                  No encontramos preguntas que coincidan con tu búsqueda.
                </div>
              )}
            </div>
          </div>

          <div style={s("position:sticky;top:88px;display:flex;flex-direction:column;gap:16px;")}>
            <div style={s("background:linear-gradient(135deg,#0FB8A9,#12B5A5);border-radius:18px;padding:24px;color:#fff;")}>
              <div
                style={s(
                  "width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;margin-bottom:14px;",
                )}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div style={s("font:700 17px Space Grotesk;margin-bottom:6px;")}>Contactar con soporte</div>
              <p style={s("font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.88);margin:0 0 16px;")}>
                Nuestro equipo responde de lunes a viernes de 9 a 18 hs.
              </p>
              <button className="ah-btn" style={s("width:100%;background:#fff;color:#0C8576;border:none;border-radius:11px;padding:12px;font:700 14px Manrope;cursor:pointer;")}>
                Iniciar chat
              </button>
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 15px Space Grotesk;margin-bottom:14px;")}>Reportar un problema</div>
              {reportSent ? (
                <div style={s("display:flex;align-items:center;gap:9px;color:#0C8576;font-weight:700;font-size:13.5px;")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  ¡Gracias! Recibimos tu reporte.
                </div>
              ) : (
                <form onSubmit={submitReport} style={s("display:flex;flex-direction:column;gap:11px;")}>
                  <input
                    required
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    placeholder="Asunto"
                    style={s("width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:11px 13px;font:600 14px Manrope;color:#0E2A47;outline:none;")}
                  />
                  <textarea
                    required
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder="Contanos qué pasó…"
                    style={s(
                      "width:100%;min-height:80px;border:1px solid #D9E1EA;border-radius:11px;padding:11px 13px;font:600 14px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
                    )}
                  />
                  <button
                    type="submit"
                    className="ah-btn"
                    style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:12px;font:700 14px Manrope;cursor:pointer;")}
                  >
                    Enviar reporte
                  </button>
                </form>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px 22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:12px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:700;")}>soporte@activehub.com</span>
              </div>
              <div style={s("display:flex;align-items:center;gap:11px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:700;")}>0810 555 ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
