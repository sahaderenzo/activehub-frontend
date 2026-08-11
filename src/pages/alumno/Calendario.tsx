import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { MiInscripcion } from "../../context/DataContext";
import { formatFecha, formatHora } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";

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
  const { getActividad, getTipoActividad, getCategoria, instructorNombre, listarMisInscripciones } = useData();
  const [inscripciones, setInscripciones] = useState<MiInscripcion[]>([]);

  useEffect(() => {
    if (currentUser) listarMisInscripciones().then(setInscripciones).catch(() => {});
  }, [currentUser, listarMisInscripciones]);

  const grupos = useMemo(() => {
    const propias = inscripciones
      .filter((i) => i.estado !== "Cancelada")
      .slice()
      .sort((a, b) => a.claseFechaHora.localeCompare(b.claseFechaHora));

    const byDate = new Map<string, MiInscripcion[]>();
    for (const item of propias) {
      const key = formatFecha(item.claseFechaHora);
      const arr = byDate.get(key) ?? [];
      arr.push(item);
      byDate.set(key, arr);
    }
    return Array.from(byDate.entries());
  }, [inscripciones]);

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
                {items.map((item) => {
                  const actividad = getActividad(item.actividadId);
                  const tipo = actividad ? getTipoActividad(actividad.tipoActividadId) : undefined;
                  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
                  const instructor = actividad ? instructorNombre[actividad.instructorId] : undefined;
                  return (
                    <div
                      key={item.id}
                      className="ah-hov"
                      onClick={() => navigate(`/alumno/actividad/${item.actividadId}`)}
                      style={s(
                        "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-left:4px solid #12B5A5;border-radius:12px;padding:16px 18px;",
                      )}
                    >
                      <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;")}>
                        <span style={s("font:700 15px Space Grotesk,sans-serif;color:#0E2A47;")}>{formatHora(item.claseFechaHora)} hs</span>
                        <StatusBadge type={inscripcionStatusType(item.estado)} />
                      </div>
                      <div style={s("font:700 14.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:3px;")}>
                        {item.actividadNombre} <span style={s("color:#9AAABA;font-weight:600;")}>· {cat?.nombre}</span>
                      </div>
                      <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:9px;")}>{instructor ?? ""}</div>
                      {actividad && (
                        <div style={s("display:flex;align-items:center;justify-content:flex-end;font-size:13px;")}>
                          <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>
                            ${actividad.precio.toLocaleString("es-AR")}
                          </span>
                        </div>
                      )}
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
