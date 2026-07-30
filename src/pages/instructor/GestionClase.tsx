import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { disponibilidad, formatFecha, formatHora, getCategoria, getTipoActividad, getUsuario } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";

export default function InstructorGestionClase() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const clase = data.clases.find((c) => c.id === id);
  const actividad = clase ? data.actividades.find((a) => a.id === clase.actividadId) : undefined;

  useEffect(() => {
    if (!clase || !actividad) {
      navigate("/instructor/actividades", { replace: true });
      return;
    }
    if (currentUser && actividad.instructorId !== currentUser.id) {
      navigate("/instructor/actividades", { replace: true });
    }
  }, [clase, actividad, currentUser, navigate]);

  const [asistencia, setAsistencia] = useState<Record<string, boolean>>({});

  if (!currentUser || !aprobado) return null;
  if (!clase || !actividad) return null;

  const tipo = getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const disp = disponibilidad(clase);

  const roster = data.inscripciones.filter(
    (i) => i.claseId === clase.id && (i.estado === "Inscripto" || i.estado === "PagoPendiente"),
  );
  const pagoAprobado = roster.filter((i) => i.estado === "Inscripto").length;
  const pendienteDePago = roster.filter((i) => i.estado === "PagoPendiente").length;

  const cancelarClase = () => {
    if (window.confirm("¿Cancelar esta clase? Se notificará a los alumnos inscriptos.")) {
      data.actualizarClase(clase.id, { estado: "Cancelada" });
    }
  };

  const toggleAsistencia = (inscripcionId: string) => {
    setAsistencia((prev) => ({ ...prev, [inscripcionId]: !prev[inscripcionId] }));
  };

  return (
    <DashLayout role="instructor" active="misactividades">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <span
          className="ah-link"
          onClick={() => navigate(`/instructor/actividades/${actividad.id}`)}
          style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope;color:#41566B;cursor:pointer;")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a la actividad
        </span>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        <div
          style={s(
            "display:flex;align-items:flex-start;gap:18px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;margin-bottom:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;",
          )}
        >
          <div style={s(`width:96px;height:96px;border-radius:14px;flex:none;background:${actividad.photoTint};`)} />
          <div style={s("flex:1;min-width:0;")}>
            <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:7px;flex-wrap:wrap;")}>
              <span style={s("font:700 11px Manrope;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>
                {cat?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:3px 9px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;",
                )}
              >
                {actividad.nivelIntensidad}
              </span>
              <StatusBadge type={disp.type} label={disp.label} />
            </div>
            <h1 style={s("font:700 24px Space Grotesk;margin:0 0 8px;")}>{actividad.nombre}</h1>
            <div style={s("display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px;color:#65788C;font-weight:600;")}>
              <span>
                📅 {formatFecha(clase.fechaHora)} · {formatHora(clase.fechaHora)} hs
              </span>
              <span>📍 {actividad.ubicacion}</span>
              <span>💵 ${actividad.precio.toLocaleString("es-AR")} / clase</span>
            </div>
          </div>
          <div style={s("display:flex;gap:9px;flex:none;")}>
            <button
              className="ah-btn"
              onClick={() => navigate(`/instructor/actividades/${actividad.id}`)}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Editar
            </button>
            <button
              className="ah-btn"
              onClick={cancelarClase}
              disabled={clase.estado === "Cancelada"}
              style={s(
                `background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#BE3A3E;cursor:pointer;opacity:${
                  clase.estado === "Cancelada" ? ".55" : "1"
                };`,
              )}
            >
              {clase.estado === "Cancelada" ? "Clase cancelada" : "Cancelar clase"}
            </button>
          </div>
        </div>

        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{roster.length}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Inscriptos</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0C8576;")}>{pagoAprobado}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Pago aprobado</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#B9741A;")}>{pendienteDePago}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Pendiente de pago</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>
              {clase.cuposMax - clase.cuposOcupados}/{clase.cuposMax}
            </div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Cupos libres</div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:18px 22px;")}>
            <div style={s("font:700 16px Space Grotesk;")}>Alumnos inscriptos</div>
          </div>
          <div
            className="ah-grid-5"
            style={s(
              "display:grid;grid-template-columns:1.6fr 1fr 1fr 130px 110px;padding:11px 22px;background:#F7FAFC;border-top:1px solid #EEF2F6;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
            )}
          >
            <span>Alumno</span>
            <span>Contacto</span>
            <span>Estado inscripción</span>
            <span>Pago efectivo</span>
            <span>Asistencia</span>
          </div>
          {roster.length === 0 && (
            <div style={s("padding:26px 22px;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
              Todavía no hay alumnos inscriptos en esta clase.
            </div>
          )}
          {roster.map((insc) => {
            const u = getUsuario(insc.alumnoId);
            const avatar = u ? `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase() : "?";
            const esPendiente = insc.estado === "PagoPendiente";
            return (
              <div
                key={insc.id}
                className="ah-grid-5"
                style={s(
                  "display:grid;grid-template-columns:1.6fr 1fr 1fr 130px 110px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;",
                )}
              >
                <div style={s("display:flex;align-items:center;gap:11px;")}>
                  <span
                    style={s(
                      "width:36px;height:36px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;display:flex;align-items:center;justify-content:center;font:700 14px Space Grotesk;flex:none;",
                    )}
                  >
                    {avatar}
                  </span>
                  <span style={s("font:700 14px Manrope;color:#0E2A47;")}>
                    {u ? `${u.nombre} ${u.apellido}` : "Alumno"}
                  </span>
                </div>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{u?.telefono ?? "—"}</span>
                <StatusBadge type={inscripcionStatusType(insc.estado)} />
                <div>
                  {esPendiente && (
                    <button
                      className="ah-btn"
                      onClick={() => data.confirmarCobroEfectivo(insc.id)}
                      style={s(
                        "background:#E7F8F5;border:1px solid #CBEDE7;border-radius:9px;padding:8px 12px;font:700 12px Manrope;color:#0C8576;cursor:pointer;display:flex;align-items:center;gap:6px;",
                      )}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.6}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Confirmar cobro
                    </button>
                  )}
                </div>
                <label style={s("display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12.5px;color:#41566B;font-weight:600;")}>
                  <input
                    type="checkbox"
                    checked={!!asistencia[insc.id]}
                    onChange={() => toggleAsistencia(insc.id)}
                    style={s("width:16px;height:16px;accent-color:#12B5A5;cursor:pointer;")}
                  />
                  Presente
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </DashLayout>
  );
}
