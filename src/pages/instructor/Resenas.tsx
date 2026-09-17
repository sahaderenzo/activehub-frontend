import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { CargandoAccion, CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { ESTILO_RESALTE, useResaltado } from "../../lib/resaltado";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { ReseniaInstructor } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/mockData";

const STAR_PATH = "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z";

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div style={s("display:flex;gap:1px;")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "#FFC53D" : "#E2E9F0"} stroke="none">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export default function InstructorResenas() {
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const misActividades = useMemo(
    () => (currentUser ? data.actividades.filter((a) => a.instructorId === currentUser.id) : []),
    [data.actividades, currentUser],
  );

  const [misResenias, setMisResenias] = useState<ReseniaInstructor[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    if (!aprobado) return;
    data
      .listarResenasInstructor()
      .then((rs) => {
        setMisResenias(rs);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [aprobado, data.listarResenasInstructor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sidebar = useMemo(
    () =>
      misActividades.map((a) => {
        const rs = misResenias.filter((r) => r.actividadId === a.id);
        const prom = rs.length ? rs.reduce((s2, r) => s2 + r.puntaje, 0) / rs.length : 0;
        return { id: a.id, name: a.nombre, total: rs.length, prom };
      }),
    [misActividades, misResenias],
  );

  // "Recibiste una nueva reseña" / "se resolvió tu denuncia sobre una reseña" caen acá. Las
  // reseñas cuelgan de una actividad y la pantalla muestra una sola por vez, así que el
  // resaltado no alcanza: también hay que seleccionar la actividad dueña de esa reseña.
  const resaltado = useResaltado("resenia");
  const actividadDeLaResenia = resaltado.id
    ? misResenias.find((r) => r.id === resaltado.id)?.actividadId
    : undefined;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<Record<string, string>>({});
  const [accionError, setAccionError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- elige la actividad por defecto cuando
     llega la lista del backend. */
  useEffect(() => {
    // Si se llegó desde una notificación, manda la actividad de esa reseña por encima de
    // cualquier selección previa: es lo que el usuario pidió ver al hacer click.
    if (actividadDeLaResenia && actividadDeLaResenia !== selectedId) {
      setSelectedId(actividadDeLaResenia);
      return;
    }
    if (selectedId && misActividades.some((a) => a.id === selectedId)) return;
    if (misActividades.length > 0) {
      const conResenias = sidebar.find((s2) => s2.total > 0);
      setSelectedId(conResenias?.id ?? misActividades[0].id);
    } else {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misActividades, actividadDeLaResenia]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!currentUser || !aprobado) return null;

  const selectedActividad = misActividades.find((a) => a.id === selectedId);
  const reviews = selectedId
    ? misResenias
        .filter((r) => r.actividadId === selectedId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const total = reviews.length;
  const prom = total ? reviews.reduce((s2, r) => s2 + r.puntaje, 0) / total : 0;
  const bars = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => r.puntaje === star).length;
    return { star, n, pct: total ? Math.round((n / total) * 100) : 0 };
  });

  const toggleResponder = (id: string) => {
    setAccionError(null);
    setRespondiendo((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      // Al editar, se arranca del texto ya publicado.
      else next[id] = misResenias.find((r) => r.id === id)?.respuestaInstructor ?? "";
      return next;
    });
  };

  // Antes las dos acciones solo movían estado local: la respuesta y la denuncia
  // desaparecían al recargar la pantalla.
  const enviarRespuesta = async (id: string) => {
    const texto = (respondiendo[id] ?? "").trim();
    if (!texto) return;
    setAccionError(null);
    setEnviando(id);
    try {
      const r = await data.responderResenia(id, texto);
      setMisResenias((prev) =>
        prev.map((rv) =>
          rv.id === id
            ? { ...rv, respuestaInstructor: r.respuestaInstructor, respuestaInstructorAt: r.respuestaInstructorAt }
            : rv,
        ),
      );
      setRespondiendo((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : "No pudimos enviar tu respuesta.");
    } finally {
      setEnviando(null);
    }
  };

  const denunciar = async (id: string) => {
    const motivo = window.prompt("¿Por qué denunciás esta reseña? El equipo de ActiveHub la va a revisar.");
    if (motivo === null) return;
    if (!motivo.trim()) {
      setAccionError("Contanos por qué denunciás esta reseña.");
      return;
    }
    setAccionError(null);
    setEnviando(id);
    try {
      await data.denunciarResenia(id, motivo.trim());
      setMisResenias((prev) => prev.map((rv) => (rv.id === id ? { ...rv, denunciada: true } : rv)));
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : "No pudimos registrar la denuncia.");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <DashLayout role="instructor" active="resenias">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Reseñas de mis actividades</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;max-width:680px;")}>
          Las reseñas pertenecen a cada actividad. Elegí una para ver sus opiniones. Solo reseñan alumnos que estuvieron
          inscriptos en clases finalizadas.
        </p>
      </div>
      {cargando ? (
        // "Todavía no tenés actividades publicadas" mientras carga el catálogo es falso.
        <div style={s("padding:26px 32px 50px;")}>
          <CargandoSeccion seccion="reseñas" />
        </div>
      ) : misActividades.length === 0 ? (
        <div style={s("padding:26px 32px 50px;")}>
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            Todavía no tenés actividades publicadas.
          </div>
        </div>
      ) : (
        <div className="ah-grid-side-alt" style={s("padding:26px 32px 50px;display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:start;")}>
          <div style={s("position:sticky;top:24px;display:flex;flex-direction:column;gap:10px;")}>
            <div style={s("font:700 12px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;padding:0 4px 2px;")}>
              Mis actividades
            </div>
            {sidebar.map((a) => {
              const on = a.id === selectedId;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="ah-btn"
                  style={s(
                    `cursor:pointer;background:${on ? "#E7F8F5" : "#fff"};border:1.5px solid ${
                      on ? "#12B5A5" : "#E7EDF3"
                    };border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;`,
                  )}
                >
                  <div style={s("flex:1;min-width:0;")}>
                    <div
                      style={s(
                        `font:700 14.5px Manrope;color:${on ? "#0C8576" : "#0E2A47"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`,
                      )}
                    >
                      {a.name}
                    </div>
                    <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>{a.total} reseñas</div>
                  </div>
                  <span style={s("display:flex;align-items:center;gap:4px;font:700 13.5px Space Grotesk;color:#0E2A47;flex:none;")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
                      <path d={STAR_PATH} />
                    </svg>
                    {a.total ? a.prom.toFixed(1) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div>
            <div
              style={s(
                "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px 24px;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:16px;display:grid;grid-template-columns:170px 1fr;gap:24px;align-items:center;",
              )}
              className="ah-grid-side"
            >
              <div style={s("text-align:center;border-right:1px solid #EEF2F6;padding-right:20px;")}>
                <div style={s("font:700 46px Space Grotesk;color:#0E2A47;line-height:1;")}>{total ? prom.toFixed(1) : "—"}</div>
                <div style={s("display:flex;gap:2px;justify-content:center;margin:8px 0 6px;")}>
                  <Stars value={Math.round(prom)} size={15} />
                </div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>{total} reseñas</div>
              </div>
              <div style={s("display:flex;flex-direction:column;justify-content:center;gap:7px;")}>
                <div style={s("font:700 14px Space Grotesk;color:#0E2A47;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>
                  {selectedActividad?.nombre ?? "—"}
                </div>
                {bars.map((rb) => (
                  <div key={rb.star} style={s("display:flex;align-items:center;gap:10px;")}>
                    <span style={s("font-size:12.5px;font-weight:700;color:#7A8C9E;width:10px;")}>{rb.star}</span>
                    <div style={s("flex:1;height:7px;border-radius:99px;background:#EEF2F6;overflow:hidden;")}>
                      <div style={s(`height:100%;width:${rb.pct}%;background:#FFC53D;border-radius:99px;`)} />
                    </div>
                    <span style={s("font-size:12px;color:#9AAABA;font-weight:600;width:26px;text-align:right;")}>{rb.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={s("display:flex;flex-direction:column;gap:14px;")}>
              {errorCarga && (
                <div
                  style={s(
                    "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;",
                  )}
                >
                  <span style={s("flex:1;font-size:13px;color:#BE3A3E;font-weight:600;")}>
                    No pudimos cargar las reseñas.
                  </span>
                  <button
                    className="ah-btn"
                    onClick={cargar}
                    style={s("background:#fff;border:1px solid #F3C6C7;border-radius:9px;padding:8px 14px;font:700 12.5px Manrope;color:#BE3A3E;cursor:pointer;")}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {accionError && (
                <div style={s("background:#FBEAEB;border:1px solid #F3C6C7;border-radius:12px;padding:12px 15px;font:600 13px Manrope;color:#BE3A3E;")} role="alert">
                  {accionError}
                </div>
              )}
              {reviews.length === 0 && !errorCarga && (
                <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:30px;text-align:center;color:#90A1B2;font-weight:600;")}>
                  Esta actividad todavía no tiene reseñas.
                </div>
              )}
              {reviews.map((rv) => {
                const avatar = `${rv.alumno.nombre.charAt(0)}${rv.alumno.apellido.charAt(0)}`.toUpperCase();
                const respondiendoAbierto = rv.id in respondiendo;
                return (
                  <div
                    key={rv.id}
                    ref={resaltado.ref(rv.id)}
                    style={s(
                      `background:#fff;border:1px solid ${rv.denunciada || rv.oculta ? "#F3D2D3" : rv.enModeracion ? "#F6E2C0" : "#E7EDF3"};border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);`
                        + (resaltado.activo(rv.id) ? ESTILO_RESALTE : ""),
                    )}
                  >
                    <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:10px;")}>
                      <span
                        style={s(
                          "width:38px;height:38px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;display:flex;align-items:center;justify-content:center;font:700 15px Space Grotesk;flex:none;",
                        )}
                      >
                        {avatar}
                      </span>
                      <div style={s("flex:1;min-width:0;")}>
                        <div style={s("font:700 14.5px Manrope;color:#0E2A47;")}>{rv.alumno.nombre} {rv.alumno.apellido}</div>
                        <div style={s("font-size:12px;color:#9AAABA;font-weight:600;")}>{formatFecha(rv.createdAt)}</div>
                      </div>
                      <Stars value={rv.puntaje} />
                    </div>
                    <p style={s("font-size:14.5px;line-height:1.6;color:#54697E;margin:0 0 12px;")}>{rv.comentario?.trim() ? rv.comentario : <span style={s("color:#9AAABA;font-style:italic;")}>Sin comentario</span>}</p>

                    {rv.respuestaInstructor && (
                      <div
                        style={s(
                          "margin:0 0 12px;border-left:3px solid #12B5A5;background:#F4FBFA;border-radius:0 10px 10px 0;padding:10px 14px;",
                        )}
                      >
                        <div style={s("font:700 11.5px Manrope;color:#0C8576;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;")}>
                          Tu respuesta{rv.respuestaInstructorAt ? ` · ${formatFecha(rv.respuestaInstructorAt)}` : ""}
                        </div>
                        <div style={s("font-size:13.5px;line-height:1.5;color:#41566B;font-weight:600;")}>
                          {rv.respuestaInstructor}
                        </div>
                      </div>
                    )}

                    <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                      {/* "En moderación" y "Denunciada" son cosas distintas: la primera es que el
                          admin todavía no aprobó la reseña, la segunda que vos la reportaste.
                          Antes las dos se pintaban con el mismo cartel rojo "Reportada". */}
                      {rv.enModeracion && (
                        <span
                          style={s(
                            "font:700 11px Manrope;background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;",
                          )}
                          title="Todavía no es visible para el resto: un administrador tiene que aprobarla."
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B9741A" strokeWidth={2.4}>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          Pendiente de moderación
                        </span>
                      )}
                      {rv.denunciada && (
                        <span
                          style={s(
                            "font:700 11px Manrope;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;",
                          )}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2.4}>
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <path d="M12 9v4M12 17h.01" />
                          </svg>
                          Denunciada · en revisión
                        </span>
                      )}
                      {rv.oculta && (
                        <span style={s("font:700 11px Manrope;background:#EEF2F6;color:#65788C;border:1px solid #DDE5EC;padding:4px 10px;border-radius:99px;")}>
                          Oculta
                        </span>
                      )}
                      {rv.respuestaInstructor && (
                        <span style={s("font:700 11px Manrope;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:4px 10px;border-radius:99px;")}>
                          Respondida
                        </span>
                      )}
                      <button
                        className="ah-btn"
                        onClick={() => toggleResponder(rv.id)}
                        disabled={rv.enModeracion || rv.oculta}
                        title={
                          rv.enModeracion
                            ? "Vas a poder responder cuando el administrador apruebe la reseña."
                            : rv.oculta
                              ? "Esta reseña fue ocultada."
                              : undefined
                        }
                        style={s(
                          `background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope;color:#41566B;cursor:${
                            rv.enModeracion || rv.oculta ? "not-allowed" : "pointer"
                          };opacity:${rv.enModeracion || rv.oculta ? ".55" : "1"};display:flex;align-items:center;gap:6px;`,
                        )}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {rv.respuestaInstructor ? "Editar respuesta" : "Responder"}
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => denunciar(rv.id)}
                        disabled={rv.denunciada || rv.oculta || enviando === rv.id}
                        style={s(
                          `margin-left:auto;background:#fff;border:1px solid #F3D2D3;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope;color:#BE3A3E;cursor:${
                            rv.denunciada || rv.oculta ? "not-allowed" : "pointer"
                          };opacity:${rv.denunciada || rv.oculta ? ".55" : "1"};`,
                        )}
                      >
                        {rv.denunciada ? "Ya denunciada" : "Denunciar reseña"}
                      </button>
                    </div>
                    {respondiendoAbierto && (
                      <div style={s("margin-top:12px;display:flex;flex-direction:column;gap:8px;")}>
                        <textarea
                          value={respondiendo[rv.id]}
                          onChange={(e) => setRespondiendo((prev) => ({ ...prev, [rv.id]: e.target.value }))}
                          placeholder="Escribí tu respuesta para el alumno..."
                          style={s(
                            "width:100%;min-height:64px;border:1px solid #D9E1EA;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
                          )}
                        />
                        <div style={s("display:flex;gap:8px;")}>
                          <button
                            className="ah-btn"
                            onClick={() => enviarRespuesta(rv.id)}
                            disabled={!respondiendo[rv.id]?.trim() || enviando === rv.id}
                            style={s(
                              `background:#12B5A5;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:700 12.5px Manrope;cursor:pointer;opacity:${
                                respondiendo[rv.id]?.trim() && enviando !== rv.id ? "1" : ".55"
                              };`,
                            )}
                          >
                            {enviando === rv.id ? "Enviando…" : "Enviar respuesta"}
                          </button>
                          <button
                            className="ah-btn"
                            onClick={() => toggleResponder(rv.id)}
                            style={s("background:#fff;border:1px solid #E2E9F0;border-radius:8px;padding:8px 14px;font:700 12.5px Manrope;color:#41566B;cursor:pointer;")}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <CargandoAccion activo={enviando !== null} mensaje="Publicando tu respuesta" />
    </DashLayout>
  );
}
