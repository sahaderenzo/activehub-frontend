import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora, getCategoria, getTipoActividad } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateInputLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputLocal(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InstructorActividadDetalle() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const actividad = data.actividades.find((a) => a.id === id);

  useEffect(() => {
    if (!actividad) {
      navigate("/instructor/actividades", { replace: true });
      return;
    }
    if (currentUser && actividad.instructorId !== currentUser.id) {
      navigate("/instructor/actividades", { replace: true });
    }
  }, [actividad, currentUser, navigate]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClaseId, setEditingClaseId] = useState<string | null>(null);
  const [fechaStr, setFechaStr] = useState("");
  const [horaStr, setHoraStr] = useState("");
  const [cuposStr, setCuposStr] = useState("");

  if (!currentUser || !aprobado) return null;
  if (!actividad) return null;

  const tipo = getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const clases = data.clases
    .filter((c) => c.actividadId === actividad.id)
    .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

  const openCrear = () => {
    setEditingClaseId(null);
    setFechaStr("");
    setHoraStr("");
    setCuposStr(String(actividad.cuposMax));
    setFormOpen(true);
  };

  const openEditar = (claseId: string) => {
    const c = clases.find((x) => x.id === claseId);
    if (!c) return;
    const d = new Date(c.fechaHora);
    setEditingClaseId(claseId);
    setFechaStr(toDateInputLocal(d));
    setHoraStr(toTimeInputLocal(d));
    setCuposStr(String(c.cuposMax));
    setFormOpen(true);
  };

  const submitClase = (e: FormEvent) => {
    e.preventDefault();
    if (!fechaStr || !horaStr) return;
    const dt = new Date(`${fechaStr}T${horaStr}:00`);
    const cupos = Number(cuposStr) || actividad.cuposMax;
    if (editingClaseId) {
      data.actualizarClase(editingClaseId, { fechaHora: dt.toISOString(), cuposMax: cupos });
    } else {
      data.crearClase({ actividadId: actividad.id, fechaHora: dt.toISOString(), estado: "Programada", cuposMax: cupos });
    }
    setFormOpen(false);
  };

  const eliminarClase = (claseId: string) => {
    if (window.confirm("¿Eliminar esta clase? Esta acción no se puede deshacer.")) {
      data.eliminarClase(claseId);
    }
  };

  const eliminarActividad = () => {
    if (window.confirm(`¿Eliminar la actividad "${actividad.nombre}" y todas sus clases? Esta acción no se puede deshacer.`)) {
      clases.forEach((c) => data.eliminarClase(c.id));
      data.eliminarActividad(actividad.id);
      navigate("/instructor/actividades");
    }
  };

  return (
    <DashLayout role="instructor" active="misactividades">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <span
          className="ah-link"
          onClick={() => navigate("/instructor/actividades")}
          style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope;color:#41566B;cursor:pointer;")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Mis actividades
        </span>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        <div
          style={s(
            "display:flex;align-items:flex-start;gap:18px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;margin-bottom:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;",
          )}
        >
          <div style={s(`width:96px;height:96px;border-radius:14px;flex:none;background:${actividad.photoTint};`)} />
          <div style={s("flex:1;min-width:0;")}>
            <div style={s("display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;")}>
              <span style={s("font:700 11px Manrope;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>
                {cat?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:2px 8px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;border:1px solid #D5E2FB;",
                )}
              >
                {tipo?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:2px 8px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;",
                )}
              >
                {actividad.nivelIntensidad}
              </span>
            </div>
            <h1 style={s("font:700 24px Space Grotesk;margin:0 0 6px;")}>{actividad.nombre}</h1>
            <p style={s("font-size:14px;line-height:1.55;color:#65788C;margin:0 0 8px;max-width:560px;")}>{actividad.descripcion}</p>
            <div style={s("display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px;color:#65788C;font-weight:600;")}>
              <span>💵 ${actividad.precio.toLocaleString("es-AR")} / clase</span>
              <span>📍 {actividad.ubicacion}</span>
              <span>📅 {clases.length} clases</span>
            </div>
          </div>
          <div style={s("display:flex;gap:9px;flex:none;")}>
            <button
              className="ah-btn"
              onClick={() => navigate(`/instructor/actividades/${actividad.id}/editar`)}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Editar actividad
            </button>
            <button
              className="ah-btn"
              onClick={eliminarActividad}
              style={s(
                "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#BE3A3E;cursor:pointer;",
              )}
            >
              Eliminar
            </button>
          </div>
        </div>

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;")}>
          <div>
            <div style={s("font:700 18px Space Grotesk;")}>Clases de esta actividad</div>
            <p style={s("font-size:13px;color:#7A8C9E;margin:3px 0 0;")}>Cada clase es un horario concreto al que los alumnos se inscriben.</p>
          </div>
          <button
            className="ah-btn"
            onClick={openCrear}
            style={s(
              "background:#0FB8A9;color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 14px Manrope;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 18px rgba(15,184,169,.28);",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear clase
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={submitClase}
            style={s(
              "background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 22px;margin-bottom:18px;display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;box-shadow:0 1px 2px rgba(14,42,71,.04);",
            )}
          >
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Fecha</label>
              <input
                type="date"
                required
                value={fechaStr}
                onChange={(e) => setFechaStr(e.target.value)}
                style={s("border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Hora</label>
              <input
                type="time"
                required
                value={horaStr}
                onChange={(e) => setHoraStr(e.target.value)}
                style={s("border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Cupos máximos</label>
              <input
                value={cuposStr}
                onChange={(e) => setCuposStr(e.target.value.replace(/[^\d]/g, ""))}
                style={s("width:100px;border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
            <button
              type="submit"
              className="ah-btn"
              style={s("background:#0FB8A9;color:#fff;border:none;border-radius:9px;padding:10px 18px;font:700 13.5px Manrope;cursor:pointer;")}
            >
              {editingClaseId ? "Guardar cambios" : "Crear clase"}
            </button>
            <button
              type="button"
              className="ah-btn"
              onClick={() => setFormOpen(false)}
              style={s("background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:10px 18px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;")}
            >
              Cancelar
            </button>
          </form>
        )}

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div
            className="ah-grid-5"
            style={s(
              "display:grid;grid-template-columns:1.3fr 1.3fr 1fr 1fr 170px;padding:11px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
            )}
          >
            <span>Fecha</span>
            <span>Horario</span>
            <span>Cupos</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {clases.length === 0 && (
            <div style={s("padding:30px 22px;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
              Todavía no creaste ninguna clase para esta actividad.
            </div>
          )}
          {clases.map((c) => (
            <div
              key={c.id}
              className="ah-grid-5"
              style={s(
                "display:grid;grid-template-columns:1.3fr 1.3fr 1fr 1fr 170px;padding:13px 22px;border-bottom:1px solid #F1F4F8;align-items:center;",
              )}
            >
              <span style={s("font:700 13.5px Manrope;color:#0E2A47;")}>{formatFecha(c.fechaHora)}</span>
              <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatHora(c.fechaHora)}</span>
              <span style={s("font-size:13px;color:#41566B;font-weight:700;")}>
                {c.cuposOcupados}/{c.cuposMax}
              </span>
              <StatusBadge type={claseStatusType(c.estado)} />
              <div style={s("display:flex;gap:6px;")}>
                <button
                  className="ah-btn"
                  onClick={() => navigate(`/instructor/clases/${c.id}`)}
                  style={s("background:#EEF4FB;border:none;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#2D5BC8;cursor:pointer;")}
                >
                  Ver
                </button>
                <button
                  className="ah-btn"
                  onClick={() => openEditar(c.id)}
                  style={s(
                    "background:#fff;border:1px solid #E2E9F0;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#41566B;cursor:pointer;",
                  )}
                >
                  Editar
                </button>
                <button
                  className="ah-btn"
                  onClick={() => eliminarClase(c.id)}
                  style={s(
                    "background:#fff;border:1px solid #F3D2D3;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#BE3A3E;cursor:pointer;",
                  )}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
