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

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function inicioDeMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function diaKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return diaKey(a) === diaKey(b);
}

export default function AlumnoCalendario() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getActividad, getTipoActividad, getCategoria, instructorNombre, listarMisInscripciones } = useData();
  const [inscripciones, setInscripciones] = useState<MiInscripcion[]>([]);
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [mesCursor, setMesCursor] = useState(() => inicioDeMes(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(() => diaKey(new Date()));

  useEffect(() => {
    if (currentUser) listarMisInscripciones().then(setInscripciones).catch(() => {});
  }, [currentUser, listarMisInscripciones]);

  // Solo lo que todavía no pasó: una vez que la clase finaliza, este
  // calendario deja de mostrarla (para eso está "Mis clases" > Finalizadas).
  const proximas = useMemo(() => {
    const ahora = Date.now();
    return inscripciones
      .filter((i) => i.estado !== "Cancelada" && new Date(i.claseFechaHora).getTime() > ahora)
      .slice()
      .sort((a, b) => a.claseFechaHora.localeCompare(b.claseFechaHora));
  }, [inscripciones]);

  const grupos = useMemo(() => {
    const byDate = new Map<string, MiInscripcion[]>();
    for (const item of proximas) {
      const key = formatFecha(item.claseFechaHora);
      const arr = byDate.get(key) ?? [];
      arr.push(item);
      byDate.set(key, arr);
    }
    return Array.from(byDate.entries());
  }, [proximas]);

  const porDia = useMemo(() => {
    const map = new Map<string, MiInscripcion[]>();
    for (const item of proximas) {
      const key = diaKey(new Date(item.claseFechaHora));
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [proximas]);

  const celdas = useMemo(() => {
    const primerDia = inicioDeMes(mesCursor);
    const offset = primerDia.getDay();
    const diasEnMes = new Date(mesCursor.getFullYear(), mesCursor.getMonth() + 1, 0).getDate();
    const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;
    const hoy = new Date();
    return Array.from({ length: totalCeldas }, (_, i) => {
      const fecha = new Date(mesCursor.getFullYear(), mesCursor.getMonth(), i - offset + 1);
      return {
        fecha,
        key: diaKey(fecha),
        enMes: fecha.getMonth() === mesCursor.getMonth(),
        esHoy: mismoDia(fecha, hoy),
        items: porDia.get(diaKey(fecha)) ?? [],
      };
    });
  }, [mesCursor, porDia]);

  const etiquetaMes = mesCursor
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  const itemsDelDiaSeleccionado = celdas.find((c) => c.key === diaSeleccionado)?.items ?? [];
  const fechaSeleccionada = celdas.find((c) => c.key === diaSeleccionado)?.fecha;

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="calendario" />
      <div style={s("max-width:900px;margin:0 auto;padding:30px 28px 60px;")}>
        <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;")}>
          <div>
            <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Calendario de clases</h1>
            <p style={s("font-size:14.5px;color:#7A8C9E;margin:0;")}>Tus próximas clases y preinscripciones, agrupadas por fecha.</p>
          </div>
          <div style={s("display:flex;gap:4px;background:#EEF1F4;border-radius:11px;padding:4px;flex:none;")}>
            <button
              className="ah-btn"
              onClick={() => setVista("lista")}
              style={s(
                `border:none;border-radius:8px;padding:8px 16px;font:700 13px Manrope,sans-serif;cursor:pointer;background:${vista === "lista" ? "#fff" : "transparent"};color:${vista === "lista" ? "#0E2A47" : "#7A8C9E"};box-shadow:${vista === "lista" ? "0 1px 2px rgba(14,42,71,.08)" : "none"};`,
              )}
            >
              Lista
            </button>
            <button
              className="ah-btn"
              onClick={() => setVista("calendario")}
              style={s(
                `border:none;border-radius:8px;padding:8px 16px;font:700 13px Manrope,sans-serif;cursor:pointer;background:${vista === "calendario" ? "#fff" : "transparent"};color:${vista === "calendario" ? "#0E2A47" : "#7A8C9E"};box-shadow:${vista === "calendario" ? "0 1px 2px rgba(14,42,71,.08)" : "none"};`,
              )}
            >
              Calendario
            </button>
          </div>
        </div>

        {proximas.length === 0 && (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;",
            )}
          >
            Todavía no tenés clases próximas.{" "}
            <Link to="/alumno/explorar" className="ah-link" style={s("color:#FF6A2B;font-weight:700;text-decoration:none;")}>
              Explorá actividades →
            </Link>
          </div>
        )}

        {proximas.length > 0 && vista === "lista" && (
          <div style={s("display:flex;flex-direction:column;gap:26px;")}>
            {grupos.map(([fecha, items]) => (
              <div key={fecha}>
                <div style={s("font:700 13px Manrope,sans-serif;color:#FF6A2B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;")}>
                  {fecha}
                </div>
                <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                  {items.map((item) => (
                    <ClaseCard
                      key={item.id}
                      item={item}
                      onClick={() => navigate(`/alumno/actividad/${item.actividadId}`)}
                      getActividad={getActividad}
                      getTipoActividad={getTipoActividad}
                      getCategoria={getCategoria}
                      instructorNombre={instructorNombre}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {proximas.length > 0 && vista === "calendario" && (
          <div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;")}>
              <div style={s("display:flex;align-items:center;gap:10px;")}>
                <button
                  className="ah-btn"
                  onClick={() => setMesCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  style={s(
                    "width:32px;height:32px;border-radius:9px;border:1px solid #E2E9F0;background:#fff;color:#41566B;cursor:pointer;display:flex;align-items:center;justify-content:center;",
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;min-width:170px;text-align:center;")}>{etiquetaMes}</span>
                <button
                  className="ah-btn"
                  onClick={() => setMesCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  style={s(
                    "width:32px;height:32px;border-radius:9px;border:1px solid #E2E9F0;background:#fff;color:#41566B;cursor:pointer;display:flex;align-items:center;justify-content:center;",
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
              <button
                className="ah-btn"
                onClick={() => {
                  const hoy = new Date();
                  setMesCursor(inicioDeMes(hoy));
                  setDiaSeleccionado(diaKey(hoy));
                }}
                style={s(
                  "border:1px solid #E2E9F0;background:#fff;color:#41566B;border-radius:9px;padding:7px 14px;font:700 12.5px Manrope,sans-serif;cursor:pointer;",
                )}
              >
                Hoy
              </button>
            </div>

            <div
              style={s(
                "background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:20px;",
              )}
            >
              <div style={s("display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:8px;")}>
                {DIAS_SEMANA.map((d) => (
                  <div key={d} style={s("text-align:center;font:700 11px Manrope,sans-serif;color:#9AAABA;text-transform:uppercase;letter-spacing:.4px;padding:4px 0;")}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={s("display:grid;grid-template-columns:repeat(7,1fr);gap:6px;")}>
                {celdas.map((c) => {
                  const on = c.key === diaSeleccionado;
                  const tieneClases = c.items.length > 0;
                  return (
                    <div
                      key={c.key}
                      onClick={() => c.enMes && setDiaSeleccionado(c.key)}
                      style={s(
                        `min-height:64px;border-radius:10px;padding:6px 7px;cursor:${c.enMes ? "pointer" : "default"};background:${on ? "#0FB8A9" : c.esHoy ? "#F3FBFA" : "#fff"};border:1px solid ${on ? "#0FB8A9" : c.esHoy ? "#BFEAE3" : "#EEF2F6"};opacity:${c.enMes ? "1" : ".35"};display:flex;flex-direction:column;gap:4px;`,
                      )}
                    >
                      <span style={s(`font:700 12.5px Space Grotesk,sans-serif;color:${on ? "#fff" : "#0E2A47"};`)}>{c.fecha.getDate()}</span>
                      {tieneClases && (
                        <div style={s("display:flex;flex-wrap:wrap;gap:3px;")}>
                          {c.items.slice(0, 3).map((it) => (
                            <span
                              key={it.id}
                              style={s(`width:6px;height:6px;border-radius:99px;background:${on ? "#fff" : "#FF6A2B"};`)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s("font:700 13px Manrope,sans-serif;color:#7A8C9E;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;")}>
              {fechaSeleccionada ? formatFecha(fechaSeleccionada.toISOString()) : "Elegí un día"}
            </div>
            {itemsDelDiaSeleccionado.length === 0 ? (
              <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:14px;padding:26px 18px;text-align:center;color:#9AAABA;font-weight:600;font-size:13.5px;")}>
                No tenés clases este día.
              </div>
            ) : (
              <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                {itemsDelDiaSeleccionado.map((item) => (
                  <ClaseCard
                    key={item.id}
                    item={item}
                    onClick={() => navigate(`/alumno/actividad/${item.actividadId}`)}
                    getActividad={getActividad}
                    getTipoActividad={getTipoActividad}
                    getCategoria={getCategoria}
                    instructorNombre={instructorNombre}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ClaseCardProps {
  item: MiInscripcion;
  onClick: () => void;
  getActividad: ReturnType<typeof useData>["getActividad"];
  getTipoActividad: ReturnType<typeof useData>["getTipoActividad"];
  getCategoria: ReturnType<typeof useData>["getCategoria"];
  instructorNombre: Record<string, string>;
}

function ClaseCard({ item, onClick, getActividad, getTipoActividad, getCategoria, instructorNombre }: ClaseCardProps) {
  const actividad = getActividad(item.actividadId);
  const tipo = actividad ? getTipoActividad(actividad.tipoActividadId) : undefined;
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const instructor = actividad ? instructorNombre[actividad.instructorId] : undefined;
  return (
    <div
      className="ah-hov"
      onClick={onClick}
      style={s("cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-left:4px solid #12B5A5;border-radius:12px;padding:16px 18px;")}
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
          <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>${actividad.precio.toLocaleString("es-AR")}</span>
        </div>
      )}
    </div>
  );
}
