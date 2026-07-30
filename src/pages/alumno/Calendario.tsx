import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora, getCategoria, getTipoActividad, getUsuario } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";
import type { Actividad, Clase, Inscripcion } from "../../lib/types";

interface AgendaItem {
  inscripcion: Inscripcion;
  clase: Clase;
  actividad: Actividad;
}

/**
 * Simplification: the original prototype shows a literal month grid with a
 * day-picker sidebar. Here we render a chronological agenda of the alumno's
 * own upcoming/past reservations grouped by date, which honestly reflects
 * what the app actually has (no server-side full-month grid of every class)
 * without pretending to be pixel-identical to the mockup.
 */
export default function AlumnoCalendario() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { inscripciones, clases, actividades } = useData();

  const grupos = useMemo(() => {
    if (!currentUser) return [] as [string, AgendaItem[]][];
    const propias: AgendaItem[] = [];
    for (const i of inscripciones) {
      if (i.alumnoId !== currentUser.id || i.estado === "Cancelada") continue;
      const clase = clases.find((c) => c.id === i.claseId);
      if (!clase) continue;
      const actividad = actividades.find((a) => a.id === clase.actividadId);
      if (!actividad) continue;
      propias.push({ inscripcion: i, clase, actividad });
    }
    propias.sort((a, b) => a.clase.fechaHora.localeCompare(b.clase.fechaHora));

    const byDate = new Map<string, AgendaItem[]>();
    for (const item of propias) {
      const key = formatFecha(item.clase.fechaHora);
      const arr = byDate.get(key) ?? [];
      arr.push(item);
      byDate.set(key, arr);
    }
    return Array.from(byDate.entries());
  }, [inscripciones, clases, actividades, currentUser]);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="calendario" />
      <div style={s("max-width:900px;margin:0 auto;padding:30px 28px 60px;")}>
        <div style={s("margin-bottom:22px;")}>
          <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Calendario de clases</h1>
          <p style={s("font-size:14.5px;color:#7A8C9E;margin:0;")}>
            Tus próximas clases y preinscripciones, agrupadas por fecha.
          </p>
        </div>

        {grupos.length === 0 && (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;",
            )}
          >
            Todavía no tenés clases reservadas.{" "}
            <Link to="/alumno/explorar" className="ah-link" style={s("color:#FF6A2B;font-weight:700;text-decoration:none;")}>
              Explorá actividades →
            </Link>
          </div>
        )}

        <div style={s("display:flex;flex-direction:column;gap:26px;")}>
          {grupos.map(([fecha, items]) => (
            <div key={fecha}>
              <div style={s("font:700 13px Manrope,sans-serif;color:#FF6A2B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;")}>
                {fecha}
              </div>
              <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                {items.map(({ inscripcion, clase, actividad }) => {
                  const tipo = getTipoActividad(actividad.tipoActividadId);
                  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
                  const instructor = getUsuario(actividad.instructorId);
                  const libres = clase.cuposMax - clase.cuposOcupados;
                  return (
                    <div
                      key={inscripcion.id}
                      className="ah-hov"
                      onClick={() => navigate(`/alumno/actividad/${actividad.id}`)}
                      style={s(
                        "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-left:4px solid #12B5A5;border-radius:12px;padding:16px 18px;",
                      )}
                    >
                      <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;")}>
                        <span style={s("font:700 15px Space Grotesk,sans-serif;color:#0E2A47;")}>{formatHora(clase.fechaHora)} hs</span>
                        <StatusBadge type={inscripcionStatusType(inscripcion.estado)} />
                      </div>
                      <div style={s("font:700 14.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:3px;")}>
                        {actividad.nombre} <span style={s("color:#9AAABA;font-weight:600;")}>· {cat?.nombre}</span>
                      </div>
                      <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:9px;")}>
                        {instructor ? `${instructor.nombre} ${instructor.apellido}` : ""}
                      </div>
                      <div style={s("display:flex;align-items:center;justify-content:space-between;font-size:13px;")}>
                        <span style={s("color:#65788C;font-weight:700;display:flex;align-items:center;gap:5px;")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          {libres > 0 ? `${libres} cupos libres` : "Sin cupos"}
                        </span>
                        <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>
                          ${actividad.precio.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
