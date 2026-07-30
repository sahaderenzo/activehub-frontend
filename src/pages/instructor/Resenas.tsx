import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, getUsuario } from "../../lib/mockData";

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

  const misResenias = useMemo(() => {
    const misActividadIds = new Set(misActividades.map((a) => a.id));
    const misClases = data.clases.filter((c) => misActividadIds.has(c.actividadId));
    const claseToActividad = new Map(misClases.map((c) => [c.id, c.actividadId]));
    return data.resenias
      .filter((r) => claseToActividad.has(r.claseId))
      .map((r) => ({ ...r, actividadId: claseToActividad.get(r.claseId)! }));
  }, [misActividades, data.clases, data.resenias]);

  const sidebar = useMemo(
    () =>
      misActividades.map((a) => {
        const rs = misResenias.filter((r) => r.actividadId === a.id);
        const prom = rs.length ? rs.reduce((s2, r) => s2 + r.puntaje, 0) / rs.length : 0;
        return { id: a.id, name: a.nombre, total: rs.length, prom };
      }),
    [misActividades, misResenias],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<Record<string, string>>({});
  const [respondidas, setRespondidas] = useState<Record<string, boolean>>({});
  const [denunciadas, setDenunciadas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedId && misActividades.some((a) => a.id === selectedId)) return;
    if (misActividades.length > 0) {
      const conResenias = sidebar.find((s2) => s2.total > 0);
      setSelectedId(conResenias?.id ?? misActividades[0].id);
    } else {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misActividades]);

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
    setRespondiendo((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  };

  const enviarRespuesta = (id: string) => {
    setRespondidas((prev) => ({ ...prev, [id]: true }));
    setRespondiendo((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const denunciar = (id: string) => {
    if (window.confirm("¿Denunciar esta reseña para revisión del equipo de ActiveHub?")) {
      setDenunciadas((prev) => ({ ...prev, [id]: true }));
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
      {misActividades.length === 0 ? (
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
              {reviews.length === 0 && (
                <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:30px;text-align:center;color:#90A1B2;font-weight:600;")}>
                  Esta actividad todavía no tiene reseñas.
                </div>
              )}
              {reviews.map((rv) => {
                const u = getUsuario(rv.alumnoId);
                const avatar = u ? `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase() : "?";
                const respondiendoAbierto = rv.id in respondiendo;
                return (
                  <div
                    key={rv.id}
                    style={s(
                      `background:#fff;border:1px solid ${rv.enModeracion ? "#F3D2D3" : "#E7EDF3"};border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);`,
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
                        <div style={s("font:700 14.5px Manrope;color:#0E2A47;")}>{u ? `${u.nombre} ${u.apellido}` : "Alumno"}</div>
                        <div style={s("font-size:12px;color:#9AAABA;font-weight:600;")}>{formatFecha(rv.createdAt)}</div>
                      </div>
                      <Stars value={rv.puntaje} />
                    </div>
                    <p style={s("font-size:14.5px;line-height:1.6;color:#54697E;margin:0 0 12px;")}>{rv.comentario}</p>
                    <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                      {rv.enModeracion && (
                        <span
                          style={s(
                            "font:700 11px Manrope;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;",
                          )}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2.4}>
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <path d="M12 9v4M12 17h.01" />
                          </svg>
                          Reportada · en revisión
                        </span>
                      )}
                      {respondidas[rv.id] && (
                        <span style={s("font:700 11px Manrope;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:4px 10px;border-radius:99px;")}>
                          Respuesta enviada
                        </span>
                      )}
                      {denunciadas[rv.id] && (
                        <span style={s("font:700 11px Manrope;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;padding:4px 10px;border-radius:99px;")}>
                          Denunciada
                        </span>
                      )}
                      <button
                        className="ah-btn"
                        onClick={() => toggleResponder(rv.id)}
                        style={s(
                          "background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:6px;",
                        )}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        Responder
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => denunciar(rv.id)}
                        disabled={!!denunciadas[rv.id]}
                        style={s(
                          `margin-left:auto;background:#fff;border:1px solid #F3D2D3;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope;color:#BE3A3E;cursor:pointer;opacity:${
                            denunciadas[rv.id] ? ".55" : "1"
                          };`,
                        )}
                      >
                        Denunciar reseña
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
                            disabled={!respondiendo[rv.id]?.trim()}
                            style={s(
                              `background:#12B5A5;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:700 12.5px Manrope;cursor:pointer;opacity:${
                                respondiendo[rv.id]?.trim() ? "1" : ".55"
                              };`,
                            )}
                          >
                            Enviar respuesta
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
    </DashLayout>
  );
}
