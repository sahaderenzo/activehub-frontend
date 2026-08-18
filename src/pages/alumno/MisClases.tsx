import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { MiInscripcion } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha, formatHora } from "../../lib/mockData";
import { claseStatusType, inscripcionStatusType } from "../../lib/status";
import type { EstadoClase, EstadoInscripcion } from "../../lib/types";

type TabKey = EstadoInscripcion | "todas" | "finalizadas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "PreInscripción", label: "Preinscripto" },
  { key: "PagoPendiente", label: "Pago pendiente" },
  { key: "Inscripto", label: "Inscripto" },
  { key: "finalizadas", label: "Finalizadas" },
  { key: "Cancelada", label: "Canceladas" },
];

export default function AlumnoMisClases() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getActividad, getTipoActividad, getCategoria, instructorNombre, cancelarInscripcion, crearDenuncia, listarMisInscripciones } =
    useData();
  const [tab, setTab] = useState<TabKey>("todas");
  const [reportadas, setReportadas] = useState<Set<string>>(new Set());
  const [todasFilas, setTodasFilas] = useState<MiInscripcion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    listarMisInscripciones()
      .then((filas) => setTodasFilas([...filas].sort((a, b) => b.claseFechaHora.localeCompare(a.claseFechaHora))))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar tus clases."));
  };

  useEffect(() => {
    if (currentUser) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Una vez que la clase finaliza, una inscripción "Inscripto" deja de ser
  // algo vigente (no hay nada para pagar/cancelar) y pasa a ser pura
  // historia: cuenta para "Finalizadas", no para "Inscripto".
  const esInscriptoVigente = (r: MiInscripcion) => r.estado === "Inscripto" && r.claseEstado !== "Finalizada";

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      todas: todasFilas.length,
      finalizadas: todasFilas.filter((r) => r.claseEstado === "Finalizada").length,
    };
    for (const r of todasFilas) {
      if (r.estado === "Inscripto" && !esInscriptoVigente(r)) continue;
      c[r.estado] = (c[r.estado] ?? 0) + 1;
    }
    return c;
  }, [todasFilas]);

  const filas =
    tab === "todas"
      ? todasFilas
      : tab === "finalizadas"
        ? todasFilas.filter((r) => r.claseEstado === "Finalizada")
        : tab === "Inscripto"
          ? todasFilas.filter(esInscriptoVigente)
          : todasFilas.filter((r) => r.estado === tab);

  const reportarInasistencia = (r: MiInscripcion) => {
    if (!currentUser) return;
    crearDenuncia(r.claseId, `El instructor no se presentó a la clase de ${r.actividadNombre} del ${formatFecha(r.claseFechaHora)}.`)
      .then(() => setReportadas((prev) => new Set(prev).add(r.id)))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos enviar el reporte."));
  };

  const cancelar = async (id: string) => {
    setError(null);
    try {
      await cancelarInscripcion(id);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cancelar la inscripción.");
    }
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="misreservas" />
      <div style={s("max-width:1000px;margin:0 auto;padding:30px 28px 60px;")}>
        <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Mis clases</h1>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 24px;")}>
          Gestioná tus preinscripciones, inscripciones, pagos y clases finalizadas.
        </p>

        <div style={s("display:flex;gap:4px;border-bottom:1px solid #E2E9F0;margin-bottom:24px;flex-wrap:wrap;")}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <span
                key={t.key}
                onClick={() => setTab(t.key)}
                className="ah-btn"
                style={s(
                  `display:flex;align-items:center;gap:8px;padding:13px 18px;cursor:pointer;font:700 14.5px Manrope,sans-serif;color:${on ? "#0E2A47" : "#65788C"};border-bottom:2.5px solid ${on ? "#FF6A2B" : "transparent"};margin-bottom:-1px;`,
                )}
              >
                {t.label}
                <span
                  style={s(
                    `font:700 11px Manrope,sans-serif;background:${on ? "#FFE4D5" : "#EEF1F4"};color:${on ? "#FF6A2B" : "#7A8C9E"};border-radius:99px;padding:2px 8px;min-width:20px;text-align:center;`,
                  )}
                >
                  {counts[t.key] ?? 0}
                </span>
              </span>
            );
          })}
        </div>

        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}

        {filas.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            No hay clases en esta categoría.
          </div>
        ) : (
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {filas.map((r) => {
              const actividad = getActividad(r.actividadId);
              const tipo = actividad ? getTipoActividad(actividad.tipoActividadId) : undefined;
              const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
              const instructor = actividad ? instructorNombre[actividad.instructorId] : undefined;
              const claseFutura = new Date(r.claseFechaHora).getTime() > Date.now();
              const diasHasta = (new Date(r.claseFechaHora).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
              const ingreso: "preinscripcion" | "inscripcion" = diasHasta > 4 ? "preinscripcion" : "inscripcion";

              let note = "";
              if (r.estado === "PreInscripción") {
                note = ingreso === "inscripcion" ? "Ya podés inscribirte y pagar tu lugar." : "Esperá a que falten 4 días para inscribirte.";
              } else if (r.estado === "PagoPendiente") {
                note = "Pago pendiente: aboná en efectivo al instructor antes de la clase.";
              } else if (r.estado === "Inscripto") {
                note = r.pago?.metodo === "Mercado Pago" ? "Pago confirmado con Mercado Pago." : "Asistencia confirmada por el instructor.";
              } else {
                note = "Inscripción cancelada.";
              }

              const primaryLabel = r.estado === "PreInscripción" && ingreso === "inscripcion" ? "Inscribirme y pagar" : "Ver actividad";
              const primaryAction = () =>
                r.estado === "PreInscripción" && ingreso === "inscripcion"
                  ? navigate(`/alumno/inscripcion/${r.claseId}`)
                  : navigate(`/alumno/actividad/${r.actividadId}`);

              const puedeCancelar = claseFutura && (r.estado === "PreInscripción" || r.estado === "PagoPendiente" || r.estado === "Inscripto");

              const horasDesdeInicio = (Date.now() - new Date(r.claseFechaHora).getTime()) / (1000 * 60 * 60);
              const yaReportada = reportadas.has(r.id);
              const repEnabled = r.estado === "Inscripto" && horasDesdeInicio >= 1 && !yaReportada;
              const repDisabled = r.estado === "Inscripto" && horasDesdeInicio < 1 && !yaReportada;

              return (
                <div
                  key={r.id}
                  style={s(
                    "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:18px 20px;display:flex;align-items:center;gap:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;",
                  )}
                >
                  <div style={s(`width:88px;height:88px;border-radius:14px;flex:none;background:${actividad?.photoTint ?? "#0E2A47"};position:relative;`)}>
                    <div style={s("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);font:600 9px ui-monospace,Menlo,monospace;")}>
                      FOTO
                    </div>
                  </div>
                  <div style={s("flex:1;min-width:220px;")}>
                    <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;")}>
                      <span style={s("font:700 11px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>{cat?.nombre}</span>
                      <StatusBadge type={inscripcionStatusType(r.estado)} />
                      {r.claseEstado === "Finalizada" && <StatusBadge type={claseStatusType(r.claseEstado as EstadoClase)} />}
                    </div>
                    <div style={s("font:700 18px Manrope,sans-serif;color:#0E2A47;margin-bottom:6px;")}>{r.actividadNombre}</div>
                    <div style={s("display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#65788C;font-weight:600;")}>
                      <span style={s("display:flex;align-items:center;gap:6px;")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        {formatFecha(r.claseFechaHora)} · {formatHora(r.claseFechaHora)}
                      </span>
                      <span style={s("display:flex;align-items:center;gap:6px;")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
                        </svg>
                        {instructor ?? ""}
                      </span>
                    </div>
                    <div style={s("display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12.5px;color:#8194A8;font-weight:600;")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A6B3C0" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      {note}
                    </div>
                  </div>
                  <div style={s("display:flex;flex-direction:column;gap:9px;width:180px;flex:none;")}>
                    <button
                      className="ah-btn"
                      onClick={primaryAction}
                      style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
                    >
                      {primaryLabel}
                    </button>
                    {puedeCancelar && (
                      <button
                        className="ah-btn"
                        onClick={() => {
                          if (window.confirm("¿Seguro que querés cancelar esta inscripción?")) cancelar(r.id);
                        }}
                        style={s("background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#65788C;cursor:pointer;")}
                      >
                        Cancelar
                      </button>
                    )}
                    {repEnabled && (
                      <button
                        className="ah-btn"
                        onClick={() => reportarInasistencia(r)}
                        style={s(
                          "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:10px;font:700 12.5px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;",
                        )}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2.2}>
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <path d="M12 9v4M12 17h.01" />
                        </svg>
                        Inasistencia
                      </button>
                    )}
                    {yaReportada && (
                      <div style={s("border:1px dashed #D5DEE7;border-radius:11px;padding:8px 10px;text-align:center;")}>
                        <div style={s("font-size:11px;font-weight:700;color:#A6B3C0;line-height:1.35;")}>Reporte enviado</div>
                      </div>
                    )}
                    {repDisabled && (
                      <div style={s("border:1px dashed #D5DEE7;border-radius:11px;padding:8px 10px;text-align:center;")}>
                        <div style={s("font-size:11px;font-weight:700;color:#A6B3C0;line-height:1.35;")}>
                          Reportar inasistencia
                          <br />
                          disponible 1 h tras el inicio
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
