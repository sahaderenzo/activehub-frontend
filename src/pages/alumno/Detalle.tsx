import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  diasHastaClase,
  disponibilidad,
  formatFecha,
  formatHora,
  getCategoria,
  getTipoActividad,
  getUsuario,
  perfilesInstructor,
  tipoIngreso,
} from "../../lib/mockData";
import type { Actividad, Clase, NivelIntensidad } from "../../lib/types";

const BENEFICIOS_POR_NIVEL: Record<NivelIntensidad, string[]> = {
  "Física baja": [
    "Bajo impacto articular: apta si estás retomando la actividad física.",
    "Ayuda a reducir el estrés y mejorar la calidad del descanso.",
    "Favorece la conexión entre respiración y movimiento.",
  ],
  "Física media": [
    "Mejora la resistencia cardiovascular de forma progresiva.",
    "Tonifica sin generar demasiada carga articular.",
    "Buen punto de partida para subir el nivel de exigencia con el tiempo.",
  ],
  "Física alta": [
    "Alto gasto calórico y mejora notable de la capacidad aeróbica.",
    "Fortalece el sistema cardiovascular y la resistencia muscular.",
    "Ideal si ya tenés una base de entrenamiento previa.",
  ],
};

const PREVENCIONES_POR_NIVEL: Record<NivelIntensidad, string[]> = {
  "Física baja": [
    "Consultá a un profesional si tenés una lesión o cirugía reciente.",
    "Avisá al instructor si sentís mareos o molestias durante la sesión.",
  ],
  "Física media": [
    "Hidratate antes, durante y después de la actividad.",
    "Usá calzado y ropa adecuados para reducir el riesgo de lesiones.",
  ],
  "Física alta": [
    "Si tenés antecedentes cardíacos, consultá a un médico antes de empezar.",
    "Respetá los tiempos de entrada en calor y elongación al finalizar.",
    "Frená la actividad ante dolor agudo o falta de aire excesiva.",
  ],
};

const FAQS = [
  {
    q: "¿Qué pasa si no puedo asistir?",
    a: "Podés cancelar tu inscripción desde \"Mis clases\" antes del inicio. Si pagaste con Mercado Pago, el reintegro se procesa según la política de cancelación de la clase.",
  },
  {
    q: "¿Necesito experiencia previa?",
    a: "No, las clases están pensadas para recibir alumnos de distintos niveles. El instructor adapta la propuesta según el grupo.",
  },
  {
    q: "¿Qué tengo que llevar?",
    a: "Ropa cómoda acorde a la actividad, calzado adecuado y una botella de agua. Cualquier elemento adicional se informa al confirmar tu lugar.",
  },
];

type AiState = "idle" | "loading" | "generated";

export default function AlumnoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { actividades, clases, resenias, favoritos, toggleFavorito } = useData();

  const actividad = actividades.find((a) => a.id === id);

  const [selectedClaseId, setSelectedClaseId] = useState<string | null>(null);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiActualizado, setAiActualizado] = useState(false);
  const [aiFecha, setAiFecha] = useState<string>("");

  const clasesActividad = useMemo(
    () =>
      clases
        .filter((c) => c.actividadId === id && c.estado !== "Cancelada" && c.estado !== "Finalizada")
        .sort((x, y) => x.fechaHora.localeCompare(y.fechaHora)),
    [clases, id],
  );

  const selectedClase: Clase | undefined =
    clasesActividad.find((c) => c.id === selectedClaseId) ?? clasesActividad[0];

  if (!actividad) {
    return (
      <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
        <AlumnoNav active="explorar" />
        <div style={s("max-width:640px;margin:0 auto;padding:80px 28px;text-align:center;")}>
          <h1 style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;")}>Actividad no encontrada</h1>
          <p style={s("color:#65788C;margin:10px 0 20px;")}>La actividad que buscás no existe o fue eliminada.</p>
          <Link to="/alumno/explorar" className="ah-link" style={s("color:#FF6A2B;font-weight:700;")}>
            Volver a explorar
          </Link>
        </div>
      </div>
    );
  }

  const tipo = getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const instructor = getUsuario(actividad.instructorId);

  const intereses = currentUser?.perfilAlumno?.intereses ?? [];

  const generarInforme = () => {
    setAiState("loading");
    window.setTimeout(() => {
      setAiFecha(new Date().toISOString());
      setAiState("generated");
    }, 1400);
  };

  const actualizarInforme = () => {
    setAiState("loading");
    window.setTimeout(() => {
      setAiFecha(new Date().toISOString());
      setAiState("generated");
      setAiActualizado(true);
    }, 1400);
  };

  const reviewsActividad = resenias.filter((r) => {
    const c = clases.find((cl) => cl.id === r.claseId);
    return c?.actividadId === actividad.id && !r.enModeracion;
  });
  const ratingProm = reviewsActividad.length
    ? reviewsActividad.reduce((sum, r) => sum + r.puntaje, 0) / reviewsActividad.length
    : actividad.rating;
  const ratingBars = [5, 4, 3, 2, 1].map((star) => {
    const n = reviewsActividad.filter((r) => r.puntaje === star).length;
    const pct = reviewsActividad.length ? Math.round((n / reviewsActividad.length) * 100) : 0;
    return { star, n, pct };
  });

  const isFav = !!currentUser && favoritos.some((f) => f.usuarioId === currentUser.id && f.actividadId === actividad.id);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="explorar" />
      <div style={s("max-width:1240px;margin:0 auto;padding:22px 28px 60px;")}>
        <div style={s("font:600 13px Manrope,sans-serif;color:#7A8C9E;margin-bottom:18px;display:flex;align-items:center;gap:8px;")}>
          <Link to="/alumno" className="ah-link" style={s("cursor:pointer;color:#7A8C9E;text-decoration:none;")}>
            Inicio
          </Link>
          <span>/</span>
          <Link to="/alumno/explorar" className="ah-link" style={s("cursor:pointer;color:#7A8C9E;text-decoration:none;")}>
            {cat?.nombre ?? "Explorar"}
          </Link>
          <span>/</span>
          <span style={s("color:#0E2A47;")}>{actividad.nombre}</span>
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.55fr 1fr;gap:30px;align-items:start;")}>
          {/* LEFT */}
          <div>
            <div
              style={s(
                "border-radius:22px;overflow:hidden;border:1px solid #E7EDF3;box-shadow:0 1px 2px rgba(14,42,71,.05);margin-bottom:14px;",
              )}
            >
              <div style={s(`position:relative;height:360px;background:${actividad.photoTint};`)}>
                <div
                  style={s(
                    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.82);font:600 13px ui-monospace,Menlo,monospace;letter-spacing:.5px;",
                  )}
                >
                  FOTO · {actividad.nombre}
                </div>
                <div style={s("position:absolute;top:16px;left:16px;")}>
                  <StatusBadge type={selectedClase ? disponibilidad(selectedClase).type : "disponible"} />
                </div>
              </div>
            </div>

            <span
              style={s(
                "display:inline-block;font:700 12px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.5px;margin-bottom:9px;",
              )}
            >
              {tipo?.nombre ?? ""} · {cat?.nombre ?? ""}
            </span>
            <h1 style={s("font:700 36px Space Grotesk,sans-serif;letter-spacing:-1px;margin:0 0 16px;line-height:1.08;")}>
              {actividad.nombre}
            </h1>
            <div style={s("display:flex;flex-wrap:wrap;gap:22px;margin-bottom:30px;")}>
              <div style={s("display:flex;align-items:center;gap:7px;font-size:14.5px;font-weight:700;color:#0E2A47;")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
                  <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                {ratingProm.toFixed(1)}{" "}
                <span style={s("color:#9AAABA;font-weight:600;")}>({reviewsActividad.length} opiniones)</span>
              </div>
              <div style={s("display:flex;align-items:center;gap:7px;font-size:14.5px;font-weight:600;color:#41566B;")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {actividad.ubicacion}
              </div>
              <div style={s("display:flex;align-items:center;gap:7px;font-size:14.5px;font-weight:600;color:#41566B;")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {actividad.nivelIntensidad}
              </div>
            </div>

            <div
              style={s(
                "display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px 18px;margin-bottom:30px;",
              )}
            >
              <span
                style={s(
                  "width:50px;height:50px;border-radius:99px;background:linear-gradient(140deg,#12B5A5,#0E2A47);display:flex;align-items:center;justify-content:center;color:#fff;font:700 19px Space Grotesk,sans-serif;flex:none;",
                )}
              >
                {instructor?.nombre.charAt(0) ?? "?"}
              </span>
              <div>
                <div style={s("font:700 16px Manrope,sans-serif;color:#0E2A47;")}>
                  {instructor ? `${instructor.nombre} ${instructor.apellido}` : "Instructor"}
                </div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  Instructor
                  {perfilesInstructor[actividad.instructorId]?.aniosExperiencia
                    ? ` · ${perfilesInstructor[actividad.instructorId].aniosExperiencia} años de experiencia`
                    : ""}
                </div>
              </div>
              <button
                className="ah-btn"
                style={s(
                  "margin-left:auto;background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:10px 16px;font:700 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
                )}
              >
                Ver perfil
              </button>
            </div>

            <h2 style={s("font:700 20px Space Grotesk,sans-serif;margin:0 0 12px;")}>Descripción</h2>
            <p style={s("font-size:15.5px;line-height:1.7;color:#54697E;margin:0 0 30px;")}>{actividad.descripcion}</p>

            <div
              style={s(
                "background:linear-gradient(135deg,#F3FBFA,#EEF7FF);border:1px solid #D6EDEA;border-radius:18px;padding:24px 26px;margin-bottom:30px;",
              )}
            >
              <div style={s("display:flex;align-items:flex-start;gap:11px;margin-bottom:14px;")}>
                <span
                  style={s(
                    "width:36px;height:36px;border-radius:10px;background:linear-gradient(140deg,#12B5A5,#3A6FF0);display:flex;align-items:center;justify-content:center;flex:none;",
                  )}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                    <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
                  </svg>
                </span>
                <div style={s("flex:1;min-width:0;")}>
                  <h2 style={s("font:700 19px Space Grotesk,sans-serif;margin:0;display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                    Asistente de beneficios y prevenciones
                    <span
                      style={s(
                        "font:700 11px Manrope,sans-serif;color:#0C8576;background:#D7F2ED;border:1px solid #BCE7DF;padding:3px 9px;border-radius:99px;",
                      )}
                    >
                      IA
                    </span>
                  </h2>
                  <p style={s("font-size:13px;color:#65788C;font-weight:600;margin:4px 0 0;line-height:1.45;")}>
                    Cruza esta actividad (tipo, intensidad y objetivos) con tu perfil y arma un informe orientativo.
                  </p>
                </div>
              </div>

              <div style={s("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px;")}>
                {(intereses.length ? intereses : ["Sin intereses registrados en tu perfil"]).map((c) => (
                  <span
                    key={c}
                    style={s(
                      "font:700 11.5px Manrope,sans-serif;color:#41566B;background:#fff;border:1px solid #D9E6E3;border-radius:99px;padding:5px 11px;",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>

              {aiState === "idle" && (
                <div style={s("background:#fff;border:1px dashed #C5DDD8;border-radius:14px;padding:26px 22px;text-align:center;")}>
                  <p style={s("font-size:14px;color:#65788C;font-weight:600;line-height:1.5;margin:0 0 16px;max-width:440px;margin-inline:auto;")}>
                    Todavía no generaste tu informe para esta actividad. Pedilo cuando quieras: la IA usará la versión actual de tu perfil.
                  </p>
                  <button
                    className="ah-btn"
                    onClick={generarInforme}
                    style={s(
                      "background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:13px 22px;font:700 14.5px Manrope,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:9px;",
                    )}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                      <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
                    </svg>
                    Generar beneficios y prevenciones
                  </button>
                </div>
              )}

              {aiState === "loading" && (
                <div style={s("background:#fff;border:1px solid #D6EDEA;border-radius:14px;padding:30px 22px;text-align:center;")}>
                  <span
                    style={s(
                      "display:inline-block;width:30px;height:30px;border:3px solid #D7F2ED;border-top-color:#0FB8A9;border-radius:99px;animation:ahspin 0.8s linear infinite;",
                    )}
                  />
                  <p style={s("font-size:14px;color:#0C8576;font-weight:700;margin:14px 0 2px;")}>
                    Analizando la actividad y tu perfil de salud…
                  </p>
                  <p style={s("font-size:12.5px;color:#9AAABA;font-weight:600;margin:0;")}>Consultando el modelo de IA</p>
                </div>
              )}

              {aiState === "generated" && (
                <div style={s("background:#fff;border:1px solid #D6EDEA;border-radius:14px;padding:20px 22px;")}>
                  <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:16px;")}>
                    <span style={s("font:600 12px Manrope,sans-serif;color:#7A8C9E;display:flex;align-items:center;gap:6px;")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      Generado el {formatFecha(aiFecha)} · perfil de {currentUser?.nombre ?? "alumno"}
                    </span>
                    {aiActualizado && (
                      <span
                        style={s(
                          "font:700 10.5px Manrope,sans-serif;color:#B9741A;background:#FFF3E0;border:1px solid #F6E2C0;padding:3px 9px;border-radius:99px;",
                        )}
                      >
                        Informe actualizado
                      </span>
                    )}
                    <button
                      className="ah-btn"
                      onClick={actualizarInforme}
                      style={s(
                        "margin-left:auto;background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:8px 14px;font:700 12.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;display:inline-flex;align-items:center;gap:7px;",
                      )}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2.2}>
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 3v5h-5" />
                      </svg>
                      Actualizar informe
                    </button>
                  </div>
                  <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:22px;")}>
                    <div>
                      <div
                        style={s(
                          "display:flex;align-items:center;gap:8px;margin-bottom:11px;font:700 13px Manrope,sans-serif;color:#0C8576;text-transform:uppercase;letter-spacing:.3px;",
                        )}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Beneficios para vos
                      </div>
                      <div style={s("display:flex;flex-direction:column;gap:11px;")}>
                        {BENEFICIOS_POR_NIVEL[actividad.nivelIntensidad].map((b) => (
                          <div key={b} style={s("display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#36506B;font-weight:600;line-height:1.45;")}>
                            <span style={s("width:7px;height:7px;border-radius:99px;background:#0FB8A9;flex:none;margin-top:6px;")} />
                            {b}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div
                        style={s(
                          "display:flex;align-items:center;gap:8px;margin-bottom:11px;font:700 13px Manrope,sans-serif;color:#B9741A;text-transform:uppercase;letter-spacing:.3px;",
                        )}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B9741A" strokeWidth={2.2}>
                          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                          <path d="M12 9v4M12 17h.01" />
                        </svg>
                        Prevenciones a considerar
                      </div>
                      <div style={s("display:flex;flex-direction:column;gap:11px;")}>
                        {PREVENCIONES_POR_NIVEL[actividad.nivelIntensidad].map((p) => (
                          <div key={p} style={s("display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#36506B;font-weight:600;line-height:1.45;")}>
                            <span style={s("width:7px;height:7px;border-radius:99px;background:#E2A03B;flex:none;margin-top:6px;")} />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    style={s(
                      "display:flex;align-items:center;gap:7px;margin-top:16px;padding:9px 12px;background:#F3FBFA;border:1px solid #D7EEEA;border-radius:10px;",
                    )}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2} style={s("flex:none;")}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <path d="M17 21v-8H7v8M7 3v5h8" />
                    </svg>
                    <span style={s("font:600 11.5px Manrope,sans-serif;color:#5A7B76;line-height:1.4;")}>
                      Informe guardado para esta sesión. Usá <b style={s("color:#0C8576;")}>Actualizar informe</b> para regenerarlo.
                    </span>
                  </div>
                  <div style={s("display:flex;align-items:flex-start;gap:9px;margin-top:14px;padding-top:15px;border-top:1px solid #EEF2F6;")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2} style={s("flex:none;margin-top:1px;")}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <p style={s("font-size:11.5px;color:#8597A8;font-weight:600;line-height:1.5;margin:0;")}>
                      Informe orientativo generado por IA. <b style={s("color:#65788C;")}>No es un diagnóstico médico</b> ni una indicación clínica, y{" "}
                      <b style={s("color:#65788C;")}>no condiciona ni bloquea tu inscripción</b> a la actividad. Ante dudas, consultá a un profesional de la salud.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <h2 style={s("font:700 20px Space Grotesk,sans-serif;margin:0 0 6px;")}>Fechas y horarios disponibles</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:0 0 16px;")}>Elegí el día para ver el horario y los cupos.</p>
            <div style={s("display:flex;gap:12px;margin-bottom:34px;flex-wrap:wrap;")}>
              {clasesActividad.length === 0 && (
                <span style={s("font-size:13.5px;color:#9AAABA;font-weight:600;")}>No hay clases programadas por el momento.</span>
              )}
              {clasesActividad.map((c) => {
                const d = new Date(c.fechaHora);
                const on = selectedClase?.id === c.id;
                const disp = disponibilidad(c);
                return (
                  <div
                    key={c.id}
                    className="ah-btn"
                    onClick={() => setSelectedClaseId(c.id)}
                    style={s(
                      `cursor:pointer;width:96px;background:${on ? "#EAFBF8" : "#fff"};border:1.5px solid ${on ? "#0FB8A9" : "#E7EDF3"};border-radius:14px;padding:14px 10px;text-align:center;`,
                    )}
                  >
                    <div style={s("font:700 12px Manrope,sans-serif;color:#7A8C9E;text-transform:uppercase;")}>
                      {d.toLocaleDateString("es-AR", { weekday: "short" })}
                    </div>
                    <div style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin:2px 0;")}>{d.getDate()}</div>
                    <div style={s("font-size:12.5px;font-weight:700;color:#0C8576;")}>{formatHora(c.fechaHora)}</div>
                    <div style={s(`font-size:10.5px;font-weight:700;margin-top:3px;color:${disp.type === "sincupos" ? "#BE3A3E" : "#9AAABA"};`)}>
                      {disp.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 style={s("font:700 20px Space Grotesk,sans-serif;margin:0 0 18px;")}>Opiniones de alumnos</h2>
            <div
              className="ah-grid-side-alt"
              style={s(
                "display:grid;grid-template-columns:170px 1fr;gap:26px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px 24px;margin-bottom:18px;",
              )}
            >
              <div style={s("text-align:center;border-right:1px solid #EEF2F6;padding-right:20px;")}>
                <div style={s("font:700 46px Space Grotesk,sans-serif;color:#0E2A47;line-height:1;")}>{ratingProm.toFixed(1)}</div>
                <div style={s("display:flex;gap:2px;justify-content:center;margin:8px 0 6px;")}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i < Math.round(ratingProm) ? "#FFC53D" : "#E3E9EF"}>
                      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>{reviewsActividad.length} opiniones</div>
              </div>
              <div style={s("display:flex;flex-direction:column;justify-content:center;gap:7px;")}>
                {ratingBars.map((rb) => (
                  <div key={rb.star} style={s("display:flex;align-items:center;gap:10px;")}>
                    <span style={s("font-size:12.5px;font-weight:700;color:#7A8C9E;width:10px;")}>{rb.star}</span>
                    <div style={s("flex:1;height:7px;border-radius:99px;background:#EEF2F6;overflow:hidden;")}>
                      <div style={s(`height:100%;width:${rb.pct}%;background:#FFC53D;border-radius:99px;`)} />
                    </div>
                    <span style={s("font-size:12px;color:#9AAABA;font-weight:600;width:30px;text-align:right;")}>{rb.n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:14px;margin-bottom:34px;")}>
              {reviewsActividad.length === 0 && (
                <div style={s("color:#9AAABA;font-size:13.5px;font-weight:600;")}>Todavía no hay opiniones publicadas para esta actividad.</div>
              )}
              {reviewsActividad.slice(0, 5).map((rv) => {
                const alumno = getUsuario(rv.alumnoId);
                return (
                  <div key={rv.id} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;")}>
                    <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:10px;")}>
                      <span
                        style={s(
                          "width:38px;height:38px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;display:flex;align-items:center;justify-content:center;font:700 15px Space Grotesk,sans-serif;",
                        )}
                      >
                        {alumno?.nombre.charAt(0) ?? "?"}
                      </span>
                      <div>
                        <div style={s("font:700 14.5px Manrope,sans-serif;color:#0E2A47;")}>
                          {alumno ? `${alumno.nombre} ${alumno.apellido}` : "Alumno"}
                        </div>
                        <div style={s("font-size:12px;color:#9AAABA;font-weight:600;")}>{formatFecha(rv.createdAt)}</div>
                      </div>
                      <div style={s("margin-left:auto;display:flex;gap:1px;")}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < rv.puntaje ? "#FFC53D" : "#E3E9EF"}>
                            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p style={s("font-size:14.5px;line-height:1.6;color:#54697E;margin:0;")}>{rv.comentario}</p>
                  </div>
                );
              })}
            </div>

            <h2 style={s("font:700 20px Space Grotesk,sans-serif;margin:0 0 16px;")}>Preguntas frecuentes</h2>
            <div style={s("display:flex;flex-direction:column;gap:11px;")}>
              {FAQS.map((f) => (
                <div key={f.q} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:17px 20px;")}>
                  <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;margin-bottom:7px;")}>{f.q}</div>
                  <p style={s("font-size:14px;line-height:1.6;color:#65788C;margin:0;")}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: BOOKING */}
          <BookingPanel actividad={actividad} selectedClase={selectedClase} isFav={isFav} onToggleFav={() => currentUser && toggleFavorito(currentUser.id, actividad.id)} />
        </div>
      </div>
    </div>
  );
}

function BookingPanel({
  actividad,
  selectedClase,
  isFav,
  onToggleFav,
}: {
  actividad: Actividad;
  selectedClase: Clase | undefined;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { inscripciones } = useData();

  const ingreso = selectedClase ? tipoIngreso(selectedClase) : null;
  const existente = selectedClase && currentUser
    ? inscripciones.find((i) => i.claseId === selectedClase.id && i.alumnoId === currentUser.id && i.estado !== "Cancelada")
    : undefined;

  const dias = selectedClase ? diasHastaClase(selectedClase) : 0;
  const libres = selectedClase ? selectedClase.cuposMax - selectedClase.cuposOcupados : 0;
  const pct = selectedClase ? Math.min(100, Math.round((selectedClase.cuposOcupados / selectedClase.cuposMax) * 100)) : 0;

  let msg = "Elegí una fecha disponible para ver el detalle de inscripción.";
  if (selectedClase && ingreso === "preinscripcion" && !existente) {
    msg = `Faltan ${dias} días para la clase. Podés preinscribirte ahora; la inscripción con pago se habilita cuando falten 4 días o menos.`;
  } else if (selectedClase && ingreso === "preinscripcion" && existente?.estado === "PreInscripción") {
    msg = "Ya te preinscribiste. Te avisaremos cuando falten 4 días para que puedas inscribirte y pagar.";
  } else if (selectedClase && ingreso === "inscripcion" && (!existente || existente.estado === "Cancelada")) {
    msg = `Faltan ${dias} día${dias === 1 ? "" : "s"}. Ya podés inscribirte y confirmar tu lugar pagando.`;
  } else if (selectedClase && existente?.estado === "PagoPendiente") {
    msg = "Tu inscripción quedó con pago pendiente en efectivo. Aboná al instructor antes de la clase.";
  } else if (selectedClase && existente?.estado === "Inscripto") {
    msg = `¡Ya estás inscripto/a! Te esperamos el ${formatFecha(selectedClase.fechaHora)} a las ${formatHora(selectedClase.fechaHora)}.`;
  }

  return (
    <div style={s("position:sticky;top:88px;")}>
      <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:22px;padding:24px;box-shadow:0 14px 40px rgba(14,42,71,.10);")}>
        <div style={s("display:flex;align-items:baseline;gap:6px;margin-bottom:4px;")}>
          <span style={s("font:700 34px Space Grotesk,sans-serif;color:#0E2A47;")}>${actividad.precio.toLocaleString("es-AR")}</span>
          <span style={s("font-size:14px;color:#90A1B2;font-weight:600;")}>/ clase</span>
        </div>
        <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;margin-bottom:18px;")}>
          {selectedClase ? `${formatFecha(selectedClase.fechaHora)} · ${formatHora(selectedClase.fechaHora)} hs` : "Sin fecha seleccionada"}
        </div>

        {selectedClase && (
          <div style={s("background:#F6F9FC;border:1px solid #EAF0F6;border-radius:14px;padding:14px 16px;margin-bottom:18px;")}>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;")}>
              <span style={s("font:700 13.5px Manrope,sans-serif;color:#41566B;display:flex;align-items:center;gap:7px;")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                Cupos disponibles
              </span>
              <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0C8576;")}>
                {libres} / {selectedClase.cuposMax}
              </span>
            </div>
            <div style={s("height:8px;border-radius:99px;background:#E3EAF1;overflow:hidden;")}>
              <div style={s(`height:100%;width:${pct}%;background:linear-gradient(90deg,#12B5A5,#0FB8A9);border-radius:99px;`)} />
            </div>
          </div>
        )}

        {selectedClase && ingreso === "preinscripcion" && !existente && (
          <>
            <button
              className="ah-btn"
              onClick={() => navigate(`/alumno/reserva/${selectedClase.id}`)}
              style={s(
                "width:100%;background:#0FB8A9;color:#fff;border:none;border-radius:13px;padding:15px;font:700 16px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(15,184,169,.32);margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:9px;",
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Preinscribirme
            </button>
            <button
              disabled
              style={s(
                "width:100%;background:#EEF1F4;color:#A6B3C0;border:none;border-radius:13px;padding:15px;font:700 16px Manrope,sans-serif;cursor:not-allowed;margin-bottom:14px;",
              )}
            >
              Inscribirme
            </button>
          </>
        )}

        {selectedClase && ingreso === "preinscripcion" && existente?.estado === "PreInscripción" && (
          <>
            <button
              disabled
              style={s(
                "width:100%;background:#fff;color:#0C8576;border:1.5px solid #CBEDE7;border-radius:13px;padding:14px;font:700 15px Manrope,sans-serif;cursor:default;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;",
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              PreInscripción realizada
            </button>
            <button
              disabled
              style={s(
                "width:100%;background:#EEF1F4;color:#A6B3C0;border:none;border-radius:13px;padding:15px;font:700 16px Manrope,sans-serif;cursor:not-allowed;margin-bottom:14px;",
              )}
            >
              Inscribirme
            </button>
          </>
        )}

        {selectedClase && ingreso === "inscripcion" && (!existente || existente.estado === "Cancelada") && (
          <button
            className="ah-btn"
            onClick={() => navigate(`/alumno/inscripcion/${selectedClase.id}`)}
            style={s(
              "width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:13px;padding:15px;font:700 16px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.32);margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:9px;",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            Inscribirme y pagar
          </button>
        )}

        {selectedClase && ingreso === "inscripcion" && existente?.estado === "PreInscripción" && (
          <>
            <button
              disabled
              style={s(
                "width:100%;background:#fff;color:#0C8576;border:1.5px solid #CBEDE7;border-radius:13px;padding:14px;font:700 15px Manrope,sans-serif;cursor:default;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;",
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              PreInscripción realizada
            </button>
            <button
              className="ah-btn"
              onClick={() => navigate(`/alumno/inscripcion/${selectedClase.id}`)}
              style={s(
                "width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:13px;padding:15px;font:700 16px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.32);margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:9px;",
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Inscribirme y pagar
            </button>
          </>
        )}

        {selectedClase && existente?.estado === "PagoPendiente" && (
          <button
            disabled
            style={s(
              "width:100%;background:#FFF3E0;color:#B9741A;border:1.5px solid #F6E2C0;border-radius:13px;padding:14px;font:700 15px Manrope,sans-serif;cursor:default;margin-bottom:14px;",
            )}
          >
            Pago pendiente de confirmación
          </button>
        )}

        {selectedClase && existente?.estado === "Inscripto" && (
          <button
            disabled
            style={s(
              "width:100%;background:#E7F8F5;color:#0C8576;border:1.5px solid #CBEDE7;border-radius:13px;padding:14px;font:700 15px Manrope,sans-serif;cursor:default;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:8px;",
            )}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Ya estás inscripto/a
          </button>
        )}

        <div style={s("display:flex;gap:10px;background:#EAF1FE;border:1px solid #D5E2FB;border-radius:12px;padding:12px 14px;")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2} style={s("flex:none;margin-top:1px;")}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span style={s("font-size:12.8px;line-height:1.5;color:#2D5BC8;font-weight:600;")}>{msg}</span>
        </div>

        <div style={s("display:flex;gap:9px;margin-top:16px;")}>
          <button
            className="ah-btn"
            onClick={onToggleFav}
            style={s(
              `flex:1;background:${isFav ? "#FFF4EE" : "#fff"};border:1px solid ${isFav ? "#FFD9C4" : "#E2E9F0"};border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:${isFav ? "#FF6A2B" : "#41566B"};cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;`,
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? "#FF6A2B" : "none"} stroke={isFav ? "#FF6A2B" : "#41566B"} strokeWidth={2}>
              <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
            </svg>
            {isFav ? "Guardado" : "Guardar"}
          </button>
          <button
            className="ah-btn"
            onClick={() => {
              try {
                navigator.clipboard.writeText(window.location.href);
              } catch {
                /* clipboard unavailable */
              }
            }}
            style={s(
              "flex:1;background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
            </svg>
            Compartir
          </button>
        </div>
      </div>
      <div style={s("margin-top:16px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;")}>
        <div style={s("height:150px;background:repeating-linear-gradient(135deg,#E7EEF5 0 16px,#DFE8F1 16px 32px);position:relative;")}>
          <div style={s("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;")}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#FF6A2B" stroke="#fff" strokeWidth={1.5}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" fill="#fff" />
            </svg>
          </div>
          <div style={s("position:absolute;bottom:8px;left:10px;font:600 10px ui-monospace,Menlo,monospace;color:#7A8C9E;")}>
            MAPA · Google Maps
          </div>
        </div>
        <div style={s("padding:14px 16px;")}>
          <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;margin-bottom:3px;")}>{actividad.ubicacion}</div>
          <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;")}>Ver ubicación exacta al confirmar tu inscripción</div>
        </div>
      </div>
    </div>
  );
}
