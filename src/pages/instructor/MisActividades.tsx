import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { getCategoria, getTipoActividad } from "../../lib/mockData";
import type { NivelIntensidad } from "../../lib/types";

const NIVEL_COLORS: Record<NivelIntensidad, [bg: string, fg: string, bd: string]> = {
  "Física baja": ["#E7F8F5", "#0C8576", "#CBEDE7"],
  "Física media": ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "Física alta": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

export default function InstructorMisActividades() {
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

  const eliminar = (id: string, nombre: string) => {
    if (window.confirm(`¿Eliminar la actividad "${nombre}"? Esta acción no se puede deshacer.`)) {
      data.eliminarActividad(id);
    }
  };

  if (!currentUser || !aprobado) return null;

  return (
    <DashLayout role="instructor" active="misactividades">
      <div
        style={s(
          "background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;",
        )}
      >
        <div>
          <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Mis actividades</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Creá y administrá tus actividades. Entrá a una para ver y crear sus clases.
          </p>
        </div>
        <button
          className="ah-btn"
          onClick={() => navigate("/instructor/actividades/nueva")}
          style={s(
            "margin-left:auto;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 18px rgba(255,106,43,.26);",
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Crear actividad
        </button>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        {misActividades.length === 0 ? (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px;text-align:center;color:#7A8C9E;font-weight:600;",
            )}
          >
            Todavía no creaste ninguna actividad.
          </div>
        ) : (
          <div className="ah-grid-auto" style={s("display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:18px;")}>
            {misActividades.map((a) => {
              const tipo = getTipoActividad(a.tipoActividadId);
              const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
              const [nivelBg, nivelFg, nivelBd] = NIVEL_COLORS[a.nivelIntensidad];
              const clasesCount = data.clases.filter((c) => c.actividadId === a.id).length;
              return (
                <div
                  key={a.id}
                  style={s(
                    "background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);display:flex;",
                  )}
                >
                  <div style={s(`width:120px;flex:none;background:${a.photoTint};position:relative;`)}>
                    <div
                      style={s(
                        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.55);font:600 9px ui-monospace,Menlo,monospace;",
                      )}
                    >
                      FOTO
                    </div>
                  </div>
                  <div style={s("flex:1;padding:18px 20px;min-width:0;")}>
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
                          `font:700 11px Manrope;padding:2px 8px;border-radius:99px;background:${nivelBg};color:${nivelFg};border:1px solid ${nivelBd};`,
                        )}
                      >
                        {a.nivelIntensidad}
                      </span>
                    </div>
                    <div style={s("font:700 18px Manrope;color:#0E2A47;margin-bottom:10px;")}>{a.nombre}</div>
                    <div
                      style={s(
                        "display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#65788C;font-weight:600;margin-bottom:14px;",
                      )}
                    >
                      <span style={s("display:flex;align-items:center;gap:5px;")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        {clasesCount} clases
                      </span>
                      <span style={s("display:flex;align-items:center;gap:5px;")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
                          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                        </svg>
                        {a.rating.toFixed(1)}
                      </span>
                      <span style={s("font:700 14px Space Grotesk;color:#0E2A47;")}>
                        ${a.precio.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div style={s("display:flex;flex-wrap:wrap;gap:8px;")}>
                      <button
                        className="ah-btn"
                        onClick={() => navigate(`/instructor/actividades/${a.id}`)}
                        style={s(
                          "background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:9px 15px;font:700 13px Manrope;cursor:pointer;",
                        )}
                      >
                        Ver clases
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => navigate(`/instructor/actividades/${a.id}/editar`)}
                        style={s(
                          "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:9px 14px;font:700 13px Manrope;color:#41566B;cursor:pointer;",
                        )}
                      >
                        Editar
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => eliminar(a.id, a.nombre)}
                        style={s(
                          "background:#fff;border:1px solid #F3D2D3;border-radius:10px;padding:9px 14px;font:700 13px Manrope;color:#BE3A3E;cursor:pointer;",
                        )}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
