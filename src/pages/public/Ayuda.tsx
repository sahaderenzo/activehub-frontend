import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { incluye } from "../../lib/texto";
import { ESTILO_RESALTE } from "../../lib/resaltado";
import Logo from "../../components/Logo";
import ChatbotWidget from "../../components/ChatbotWidget";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { FAQS } from "../../lib/faqs";

/**
 * Pantalla pública de Ayuda. Todo lo de "Soporte" vive acá, y hasta este tramo **nada de eso
 * funcionaba**: el botón "Buscar" no tenía handler, los tres "Ver guía →" tampoco, "Iniciar
 * chat" tampoco, el mail y el teléfono eran texto plano, y "Reportar un problema" hacía
 * `setReportSent(true)` y descartaba lo escrito — le decía "¡Gracias! Recibimos tu reporte" a
 * alguien cuyo reporte no se guardaba en ningún lado, porque no existía ni la tabla.
 *
 * <p>Hoy el formulario pega a `POST /api/soporte/reportes`, que es **público** a propósito:
 * quien necesita soporte muchas veces es justamente alguien que no pudo registrarse o entrar.
 */

/** Cada guía abre la FAQ que la responde: no existen páginas de guía y la respuesta ya está acá. */
const GUIAS = [
  {
    faqId: "preinscripcion-vs-inscripcion",
    tint: "#E7F8F5",
    stroke: "#12B5A5",
    path: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    title: "Cómo inscribirte a una clase",
    desc: "Elegí actividad, horario y confirmá tu lugar en pocos pasos.",
  },
  {
    faqId: "preinscripcion-vs-inscripcion",
    tint: "#EAF1FE",
    stroke: "#3A6FF0",
    path: "M20 6 9 17l-5-5",
    title: "PreInscripción vs. Inscripción",
    desc: "Cuándo se ocupa el cupo y cuándo solo registrás tu interés.",
  },
  {
    faqId: "medios-de-pago",
    tint: "#FFF3E0",
    stroke: "#F5A623",
    path: "M2 8h20M2 8v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8l2-4h16l2 4",
    title: "Medios de pago",
    desc: "Pagá con Mercado Pago o en efectivo directo con tu instructor.",
  },
];

const EMAIL_SOPORTE = "soporte@activehub.com";
const TEL_SOPORTE = "0810 555 ACTIVE";
/** Lo que marca el `tel:`: el número real detrás del alfanumérico de la marca. */
const TEL_SOPORTE_HREF = "tel:+548105552284";

export default function Ayuda() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { crearReporteSoporte } = useData();

  const [search, setSearch] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [emailEditado, setEmailEditado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [chatAbierto, setChatAbierto] = useState(false);
  /** FAQ desplegada por una guía o por el buscador. `<details>` se controla con esto. */
  const [faqAbierta, setFaqAbierta] = useState<string | null>(null);
  /** La que acaba de abrir una guía, resaltada unos segundos para que se note el click. */
  const [faqDestacada, setFaqDestacada] = useState<string | null>(null);

  // Derivado, no sincronizado con un efecto: si el usuario ya está logueado su correo es el
  // valor por defecto, y en cuanto toca el campo manda lo que escribió. Con un `useEffect` que
  // llamara al setter, además, se pisaría lo tipeado cuando `currentUser` termina de llegar.
  const email = emailEditado ?? currentUser?.email ?? "";

  const faqsRef = useRef<HTMLDivElement>(null);
  const contactoRef = useRef<HTMLDivElement>(null);
  const faqRefs = useRef<Record<string, HTMLDetailsElement | null>>({});

  const filteredFaqs = search.trim()
    ? FAQS.filter((f) => incluye(f.q, search) || incluye(f.a, search) || f.claves.some((c) => incluye(c, search)))
    : FAQS;

  const homeByRol: Record<string, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

  // Los links "Preguntas frecuentes" y "Contacto" del footer de la Landing llegan acá con la
  // sección pedida. Solo scrollea (no toca estado), así que no cae en `set-state-in-effect`.
  useEffect(() => {
    const seccion = (location.state as { seccion?: string } | null)?.seccion;
    if (seccion === "faqs") faqsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (seccion === "contacto") contactoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.state]);

  const abrirFaq = (id: string) => {
    setFaqAbierta(id);
    setSearch("");
    // Feedback visible SIEMPRE, incluso si esa FAQ ya estaba abierta y a la vista: dos de las
    // tres guías responden con el mismo texto, así que sin esto la segunda parecía muerta.
    setFaqDestacada(id);
    window.setTimeout(() => setFaqDestacada((actual) => (actual === id ? null : actual)), 2500);
    // En el mismo tick el `<details>` todavía puede estar filtrado por el buscador; el scroll
    // va al frame siguiente, cuando ya se renderizó abierto.
    requestAnimationFrame(() => {
      faqRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const irAResultados = () => {
    faqsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitReport = async (e: FormEvent) => {
    e.preventDefault();
    setErrorReporte(null);
    setEnviando(true);
    try {
      await crearReporteSoporte({ email: email.trim(), asunto: asunto.trim(), detalle: detalle.trim() });
      setReportSent(true);
      setAsunto("");
      setDetalle("");
    } catch (err) {
      // El mensaje del backend manda (email inválido, texto con HTML, campos muy largos).
      setErrorReporte(err instanceof ApiError ? err.message : "No pudimos enviar tu reporte. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              irAResultados();
            }}
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
            {/* El filtrado ya ocurre al tipear; el botón baja a los resultados, que en pantallas
                chicas quedaban abajo del pliegue y parecía que no pasaba nada. */}
            <button
              type="submit"
              className="ah-btn"
              style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:12px 22px;font:700 14px Manrope;cursor:pointer;")}
            >
              Buscar
            </button>
          </form>
          {search.trim() && (
            <div style={s("margin-top:12px;font-size:13.5px;color:#9DB3C9;font-weight:600;")}>
              {filteredFaqs.length === 0
                ? "No encontramos preguntas que coincidan."
                : `${filteredFaqs.length} ${filteredFaqs.length === 1 ? "resultado" : "resultados"}`}
            </div>
          )}
        </div>
      </div>

      <div style={s("max-width:1000px;margin:0 auto;padding:34px 28px 60px;")}>
        <div style={s("font:700 18px Space Grotesk;margin-bottom:16px;")}>Guías rápidas</div>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:40px;")}>
          {GUIAS.map((g) => (
            <div
              key={g.title}
              className="ah-hov"
              onClick={() => abrirFaq(g.faqId)}
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
          <div ref={faqsRef}>
            <div style={s("font:700 18px Space Grotesk;margin-bottom:16px;")}>Preguntas frecuentes</div>
            <div style={s("display:flex;flex-direction:column;gap:11px;")}>
              {filteredFaqs.map((f) => (
                <details
                  key={f.id}
                  ref={(el) => {
                    faqRefs.current[f.id] = el;
                  }}
                  open={faqAbierta === f.id}
                  /*
                    El `null` va con actualización FUNCIONAL y sólo si esta FAQ seguía siendo
                    la anotada como abierta. Ésta era la causa de que las "Guías rápidas" no
                    hicieran nada:

                    abrir una FAQ cierra la que estaba abierta, así que el navegador encola
                    DOS eventos `toggle` — el de la que se abre y el de la que se cierra — en
                    orden de documento, no en el orden en que nos importan. Si la que se
                    cerraba estaba más abajo en la lista, su handler corría ÚLTIMO y hacía
                    `setFaqAbierta(null)`, pisando el id que la guía acababa de poner: la FAQ
                    se abría y se volvía a cerrar en el mismo frame. Se veía como que el click
                    no hacía absolutamente nada, y encima sólo pasaba al alternar entre guías
                    (por eso el primer click parecía andar).
                  */
                  onToggle={(e) => {
                    const abierto = (e.currentTarget as HTMLDetailsElement).open;
                    setFaqAbierta((actual) => (abierto ? f.id : actual === f.id ? null : actual));
                  }}
                  style={s(
                    "background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:18px 20px;"
                      + (faqDestacada === f.id ? ESTILO_RESALTE : ""),
                  )}
                >
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

          <div ref={contactoRef} style={s("position:sticky;top:88px;display:flex;flex-direction:column;gap:16px;")}>
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
              {/* Abre el asistente que ya está montado abajo a la derecha (modo controlado). */}
              <button
                className="ah-btn"
                onClick={() => setChatAbierto(true)}
                style={s("width:100%;background:#fff;color:#0C8576;border:none;border-radius:11px;padding:12px;font:700 14px Manrope;cursor:pointer;")}
              >
                Iniciar chat
              </button>
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 15px Space Grotesk;margin-bottom:14px;")}>Reportar un problema</div>
              {reportSent ? (
                <div style={s("display:flex;flex-direction:column;gap:10px;")}>
                  <div style={s("display:flex;align-items:center;gap:9px;color:#0C8576;font-weight:700;font-size:13.5px;")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    ¡Gracias! Recibimos tu reporte.
                  </div>
                  <p style={s("font-size:13px;line-height:1.55;color:#7A8C9E;font-weight:600;margin:0;")}>
                    Te vamos a responder a <strong>{email}</strong>.
                  </p>
                  <button
                    className="ah-btn"
                    onClick={() => setReportSent(false)}
                    style={s("align-self:flex-start;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:9px 14px;font:700 12.5px Manrope;cursor:pointer;")}
                  >
                    Enviar otro
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReport} style={s("display:flex;flex-direction:column;gap:11px;")}>
                  {/* El email es obligatorio incluso logueado: es la vía de respuesta, y sin
                      cuenta es la única que hay. Se precarga con el de la sesión si existe. */}
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmailEditado(e.target.value)}
                    placeholder="Tu email de contacto"
                    style={s("width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:11px 13px;font:600 14px Manrope;color:#0E2A47;outline:none;")}
                  />
                  <input
                    required
                    maxLength={150}
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    placeholder="Asunto"
                    style={s("width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:11px 13px;font:600 14px Manrope;color:#0E2A47;outline:none;")}
                  />
                  <textarea
                    required
                    maxLength={2000}
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder="Contanos qué pasó…"
                    style={s(
                      "width:100%;min-height:80px;border:1px solid #D9E1EA;border-radius:11px;padding:11px 13px;font:600 14px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
                    )}
                  />
                  {errorReporte && (
                    <div
                      role="alert"
                      style={s("background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 12px;font:600 12.5px Manrope;line-height:1.45;")}
                    >
                      {errorReporte}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="ah-btn"
                    disabled={enviando}
                    style={s(
                      `background:${enviando ? "#F1C7B4" : "#FF6A2B"};color:#fff;border:none;border-radius:11px;padding:12px;font:700 14px Manrope;cursor:${enviando ? "wait" : "pointer"};`,
                    )}
                  >
                    {enviando ? "Enviando…" : "Enviar reporte"}
                  </button>
                </form>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px 22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              {/* `mailto:` y `tel:` de verdad: antes era texto plano y no se podía ni copiar
                  de un click desde el teléfono. */}
              <a
                href={`mailto:${EMAIL_SOPORTE}`}
                className="ah-link"
                style={s("display:flex;align-items:center;gap:11px;margin-bottom:12px;text-decoration:none;")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:700;")}>{EMAIL_SOPORTE}</span>
              </a>
              <a
                href={TEL_SOPORTE_HREF}
                className="ah-link"
                style={s("display:flex;align-items:center;gap:11px;text-decoration:none;")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:700;")}>{TEL_SOPORTE}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Controlado: "Iniciar chat" lo abre. Es la misma base de conocimiento (`lib/faqs.ts`)
          que las preguntas de arriba, así que no hay dos respuestas distintas para lo mismo. */}
      <ChatbotWidget abierto={chatAbierto} onAbiertoChange={setChatAbierto} />
    </div>
  );
}
