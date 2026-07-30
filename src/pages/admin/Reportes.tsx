import { useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { categorias } from "../../lib/mockData";

type ReportTab = "desempeno" | "financiero" | "actividades" | "reclamos";

const TABS: { key: ReportTab; label: string; title: string }[] = [
  { key: "desempeno", label: "Desempeño", title: "Desempeño operativo de la plataforma" },
  { key: "financiero", label: "Financiero", title: "Reporte financiero de la plataforma" },
  { key: "actividades", label: "Actividades", title: "Ranking de actividades" },
  { key: "reclamos", label: "Reclamos y penalizaciones", title: "Reclamos y penalizaciones" },
];

const DONUT_COLORS = ["#12B5A5", "#FF6A2B", "#2D5BC8", "#7A52D9", "#F5A623"];

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString("es-AR")}`;
}

export default function AdminReportes() {
  const { currentUser, users } = useAuth();
  const { actividades, tiposActividad, clases, inscripciones, pagos, denuncias, penalizaciones } = useData();
  const [reportTab, setReportTab] = useState<ReportTab>("desempeno");
  const [modalOpen, setModalOpen] = useState(false);

  // --- Datos reales de la plataforma (page-level, siempre visibles) --------
  const globalKpis = useMemo(() => {
    const totalReservas = inscripciones.length;
    const canceladas = inscripciones.filter((i) => i.estado === "Cancelada").length;
    const ingresos = pagos.filter((p) => p.estado === "Liberado" || p.estado === "Efectivo").reduce((sum, p) => sum + p.monto, 0);
    const cancelPct = totalReservas > 0 ? (canceladas / totalReservas) * 100 : 0;
    return { totalReservas, ingresos, cancelPct };
  }, [inscripciones, pagos]);

  const weekBars = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (7 - i) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const count = inscripciones.filter((insc) => {
        const d = new Date(insc.createdAt);
        return d >= start && d < end;
      }).length;
      return { label: `S${i + 1}`, count };
    });
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({ label: b.label, h: `${Math.max(6, Math.round((b.count / max) * 100))}%` }));
  }, [inscripciones]);

  const categoriaStats = useMemo(() => {
    return categorias.map((cat, i) => {
      const tipoIds = tiposActividad.filter((t) => t.categoriaId === cat.id).map((t) => t.id);
      const actIds = actividades.filter((a) => tipoIds.includes(a.tipoActividadId)).map((a) => a.id);
      const claseIds = clases.filter((c) => actIds.includes(c.actividadId)).map((c) => c.id);
      const reservasCat = inscripciones.filter((insc) => claseIds.includes(insc.claseId));
      const ingresosCat = reservasCat.reduce((sum, insc) => {
        const pago = insc.pagoId ? pagos.find((p) => p.id === insc.pagoId) : undefined;
        return sum + (pago ? pago.monto : 0);
      }, 0);
      const instructorCounts = new Map<string, number>();
      actividades.filter((a) => actIds.includes(a.id)).forEach((a) => instructorCounts.set(a.instructorId, (instructorCounts.get(a.instructorId) ?? 0) + 1));
      let topInstructorId: string | null = null;
      let topCount = 0;
      instructorCounts.forEach((count, id) => {
        if (count > topCount) {
          topCount = count;
          topInstructorId = id;
        }
      });
      const topInstructor = topInstructorId ? users.find((u) => u.id === topInstructorId) : undefined;
      return {
        cat: cat.nombre,
        reservas: reservasCat.length,
        ingreso: ingresosCat,
        top: topInstructor ? `${topInstructor.nombre} ${topInstructor.apellido}` : "—",
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });
  }, [actividades, tiposActividad, clases, inscripciones, pagos, users]);

  const donut = useMemo(() => {
    const total = Math.max(1, categoriaStats.reduce((sum, c) => sum + c.reservas, 0));
    return categoriaStats.map((c) => ({ l: c.cat, p: `${Math.round((c.reservas / total) * 100)}%`, c: c.color }));
  }, [categoriaStats]);

  // --- Datos del reporte de detalle (modal), según pestaña seleccionada ---
  const actividadRanking = useMemo(
    () =>
      [...actividades]
        .map((a) => ({
          nombre: a.nombre,
          instructor: users.find((u) => u.id === a.instructorId),
          reservas: clases.filter((c) => c.actividadId === a.id).reduce((sum, c) => sum + c.cuposOcupados, 0),
          rating: a.rating,
        }))
        .sort((x, y) => y.reservas - x.reservas),
    [actividades, clases, users],
  );

  const reclamosStats = useMemo(() => {
    const pendientes = denuncias.filter((d) => d.estado === "Pendiente").length;
    const auditoria = denuncias.filter((d) => d.estado === "En Auditoría").length;
    const resueltas = denuncias.filter((d) => d.estado === "Resuelta").length;
    return { total: denuncias.length, pendientes, auditoria, resueltas };
  }, [denuncias]);

  const dKpis = useMemo(() => {
    switch (reportTab) {
      case "desempeno":
        return [
          { l: "Total de reservas", v: String(globalKpis.totalReservas) },
          { l: "Ingresos totales", v: money(globalKpis.ingresos) },
          { l: "Tasa de cancelación", v: `${globalKpis.cancelPct.toFixed(1)}%` },
          { l: "Actividades publicadas", v: String(actividades.length) },
        ];
      case "financiero": {
        const retenidos = pagos.filter((p) => p.estado === "Retenido");
        const liberados = pagos.filter((p) => p.estado === "Liberado" || p.estado === "Efectivo");
        const ticketProm = pagos.length > 0 ? pagos.reduce((sum, p) => sum + p.monto, 0) / pagos.length : 0;
        return [
          { l: "Ingresos totales", v: money(globalKpis.ingresos) },
          { l: "Ticket promedio", v: money(ticketProm) },
          { l: "Pagos retenidos", v: `${retenidos.length} · ${money(retenidos.reduce((s, p) => s + p.monto, 0))}` },
          { l: "Pagos liberados", v: `${liberados.length} · ${money(liberados.reduce((s, p) => s + p.monto, 0))}` },
        ];
      }
      case "actividades": {
        const top = actividadRanking[0];
        const ratingProm = actividades.length > 0 ? actividades.reduce((s, a) => s + a.rating, 0) / actividades.length : 0;
        const cuposTotales = clases.reduce((s, c) => s + c.cuposMax, 0);
        const cuposOcupados = clases.reduce((s, c) => s + c.cuposOcupados, 0);
        return [
          { l: "Actividades publicadas", v: String(actividades.length) },
          { l: "Actividad más reservada", v: top ? top.nombre : "—" },
          { l: "Rating promedio", v: ratingProm.toFixed(1) },
          { l: "Ocupación de cupos", v: cuposTotales > 0 ? `${Math.round((cuposOcupados / cuposTotales) * 100)}%` : "0%" },
        ];
      }
      case "reclamos":
        return [
          { l: "Total de reclamos", v: String(reclamosStats.total) },
          { l: "Pendientes", v: String(reclamosStats.pendientes) },
          { l: "En auditoría", v: String(reclamosStats.auditoria) },
          { l: "Penalizaciones aplicadas", v: String(penalizaciones.length) },
        ];
    }
  }, [reportTab, globalKpis, actividades, pagos, actividadRanking, clases, reclamosStats, penalizaciones]);

  const activeTab = TABS.find((t) => t.key === reportTab)!;
  const now = new Date();
  const generadoPor = currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : "Administrador";
  const emision = now.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DashLayout role="admin" active="reportes">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Reportes</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Analizá el desempeño de la plataforma.</p>
        </div>
        <div style={s("margin-left:auto;display:flex;gap:9px;")}>
          <button
            onClick={() => setModalOpen(true)}
            className="ah-btn"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="ah-btn"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Excel
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="ah-btn"
            style={s("background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
          >
            CSV
          </button>
        </div>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
          <span style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>Filtros</span>
          <div style={s("display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:10px;padding:9px 13px;font:700 13px Manrope,sans-serif;color:#41566B;")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Últimos 30 días
          </div>
          <div style={s("display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:10px;padding:9px 13px;font:700 13px Manrope,sans-serif;color:#41566B;")}>
            Todas las categorías
          </div>
          <div style={s("display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:10px;padding:9px 13px;font:700 13px Manrope,sans-serif;color:#41566B;")}>
            Todos los instructores
          </div>
          <button
            className="ah-btn"
            title="Los filtros son informativos en este demo"
            style={s("margin-left:auto;background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:9px 18px;font:700 13px Manrope,sans-serif;cursor:pointer;")}
          >
            Aplicar
          </button>
        </div>

        <div style={s("display:flex;gap:6px;background:#F1F4F8;border-radius:12px;padding:5px;width:fit-content;margin-bottom:20px;flex-wrap:wrap;")}>
          {TABS.map((t) => (
            <span
              key={t.key}
              onClick={() => setReportTab(t.key)}
              className="ah-btn"
              style={s(
                `padding:10px 20px;border-radius:9px;font:700 13.5px Manrope,sans-serif;cursor:pointer;color:${reportTab === t.key ? "#0E2A47" : "#65788C"};background:${reportTab === t.key ? "#fff" : "transparent"};`,
              )}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px;")}>
            <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>Total reservas</div>
            <div style={s("font:700 26px Space Grotesk,sans-serif;color:#0E2A47;")}>{globalKpis.totalReservas.toLocaleString("es-AR")}</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px;")}>
            <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>Ingresos totales</div>
            <div style={s("font:700 26px Space Grotesk,sans-serif;color:#0E2A47;")}>{money(globalKpis.ingresos)}</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px;")}>
            <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>Cancelaciones</div>
            <div style={s("font:700 26px Space Grotesk,sans-serif;color:#BE3A3E;")}>{globalKpis.cancelPct.toFixed(1)}%</div>
          </div>
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-bottom:20px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:20px;")}>Reservas por semana</div>
            <div style={s("display:flex;align-items:flex-end;gap:12px;height:170px;")}>
              {weekBars.map((b) => (
                <div key={b.label} style={s("flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;justify-content:flex-end;height:100%;")}>
                  <div style={s(`width:100%;border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,#FF8A5C,#FF6A2B);height:${b.h};`)} />
                  <span style={s("font-size:10px;color:#90A1B2;font-weight:700;")}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:20px;")}>Distribución por categoría</div>
            <div style={s("display:flex;flex-direction:column;gap:14px;")}>
              {donut.map((d) => (
                <div key={d.l}>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;")}>
                    <span style={s("font-size:13px;font-weight:600;color:#41566B;")}>{d.l}</span>
                    <span style={s("font:700 13px Space Grotesk,sans-serif;color:#0E2A47;")}>{d.p}</span>
                  </div>
                  <div style={s("height:7px;border-radius:99px;background:#EEF2F6;overflow:hidden;")}>
                    <div style={s(`height:100%;width:${d.p};background:${d.c};border-radius:99px;`)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:18px 22px;font:700 16px Space Grotesk,sans-serif;")}>Detalle por categoría</div>
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:640px;")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:12px 22px;background:#F7FAFC;border-top:1px solid #EEF2F6;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Categoría</span>
                <span>Reservas</span>
                <span>Ingresos</span>
                <span>Top instructor</span>
              </div>
              {categoriaStats.map((r) => (
                <div key={r.cat} style={s("display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}>
                  <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{r.cat}</span>
                  <span style={s("font-size:14px;color:#41566B;font-weight:600;")}>{r.reservas}</span>
                  <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>{money(r.ingreso)}</span>
                  <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{r.top}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={s("position:fixed;inset:0;z-index:80;background:rgba(8,22,38,.64);backdrop-filter:blur(4px);display:flex;flex-direction:column;")}>
          <div style={s("flex:none;background:#0E2A47;color:#fff;padding:12px 22px;display:flex;align-items:center;gap:13px;border-bottom:1px solid #1C3A5A;")}>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FF6A2B;display:flex;align-items:center;justify-content:center;font:800 13px Space Grotesk,sans-serif;color:#fff;")}>
              AH
            </span>
            <span style={s("font:700 14.5px Manrope,sans-serif;")}>Vista previa del reporte</span>
            <span style={s("font:600 12px Manrope,sans-serif;color:#9DB3C9;")}>Generado el {emision}</span>
            <div style={s("margin-left:auto;display:flex;align-items:center;gap:8px;")}>
              <button
                onClick={() => window.print()}
                className="ah-btn"
                style={s("display:flex;align-items:center;gap:7px;background:#FF6A2B;color:#fff;border:none;border-radius:9px;padding:9px 15px;font:700 13px Manrope,sans-serif;cursor:pointer;")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
                Descargar PDF
              </button>
              <button
                title="Exportación a Excel no disponible en este demo"
                className="ah-btn"
                style={s("display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);color:#fff;border:1px solid #2B496B;border-radius:9px;padding:9px 14px;font:700 13px Manrope,sans-serif;cursor:pointer;")}
              >
                Excel
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="ah-btn"
                style={s("display:flex;align-items:center;gap:7px;background:transparent;color:#9DB3C9;border:1px solid #2B496B;border-radius:9px;padding:9px 13px;font:700 13px Manrope,sans-serif;cursor:pointer;")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                Cerrar
              </button>
            </div>
          </div>

          <div style={s("flex:1;min-height:0;overflow-y:auto;padding:30px 20px 64px;")}>
            <div style={s("max-width:880px;margin:0 auto;background:#fff;border-radius:7px;box-shadow:0 26px 64px rgba(0,0,0,.42);overflow:hidden;")}>
              <div style={s("background:#0E2A47;color:#fff;padding:34px 46px 30px;")}>
                <div style={s("display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;")}>
                  <div style={s("display:flex;align-items:center;gap:12px;")}>
                    <span style={s("width:40px;height:40px;border-radius:10px;background:#FF6A2B;display:flex;align-items:center;justify-content:center;font:800 16px Space Grotesk,sans-serif;color:#fff;")}>
                      AH
                    </span>
                    <div>
                      <div style={s("font:800 18px Space Grotesk,sans-serif;letter-spacing:-.3px;")}>ActiveHub</div>
                      <div style={s("font:600 11px Manrope,sans-serif;color:#9DB3C9;letter-spacing:.3px;")}>Gestión de actividades · Mendoza</div>
                    </div>
                  </div>
                  <div style={s("text-align:right;")}>
                    <div style={s("font:700 10px Manrope,sans-serif;color:#9DB3C9;letter-spacing:.6px;text-transform:uppercase;margin-bottom:3px;")}>Reporte N.º</div>
                    <div style={s("font:700 13px ui-monospace,Menlo,monospace;color:#0FB8A9;")}>
                      RP-{reportTab.slice(0, 3).toUpperCase()}-{now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div style={s("margin-top:26px;")}>
                  <div style={s("font:700 11.5px Manrope,sans-serif;color:#0FB8A9;letter-spacing:.7px;text-transform:uppercase;margin-bottom:7px;")}>
                    Reporte de indicadores y gráficos
                  </div>
                  <h1 style={s("font:700 28px Space Grotesk,sans-serif;margin:0;letter-spacing:-.6px;")}>{activeTab.title}</h1>
                  <p style={s("font:600 13.5px Manrope,sans-serif;color:#A9BDD2;margin:8px 0 0;")}>
                    Reservas, ingresos y ocupación de cupos · Período de los últimos 30 días
                  </p>
                </div>
              </div>

              <div style={s("display:grid;grid-template-columns:repeat(4,1fr);background:#F7FAFC;border-bottom:1px solid #E7EDF3;")} className="ah-grid-4">
                <div style={s("padding:14px 22px;border-right:1px solid #E7EDF3;")}>
                  <div style={s("font:700 10px Manrope,sans-serif;color:#90A1B2;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;")}>Generado por</div>
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>{generadoPor}</div>
                </div>
                <div style={s("padding:14px 22px;border-right:1px solid #E7EDF3;")}>
                  <div style={s("font:700 10px Manrope,sans-serif;color:#90A1B2;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;")}>Emisión</div>
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>{emision}</div>
                </div>
                <div style={s("padding:14px 22px;border-right:1px solid #E7EDF3;")}>
                  <div style={s("font:700 10px Manrope,sans-serif;color:#90A1B2;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;")}>Período</div>
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>Últimos 30 días</div>
                </div>
                <div style={s("padding:14px 22px;")}>
                  <div style={s("font:700 10px Manrope,sans-serif;color:#90A1B2;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;")}>Alcance</div>
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>Todas las categorías</div>
                </div>
              </div>

              <div style={s("padding:30px 46px 40px;")}>
                <div style={s("font:700 11px Manrope,sans-serif;color:#90A1B2;letter-spacing:.6px;text-transform:uppercase;margin-bottom:13px;")}>
                  01 · Resumen ejecutivo
                </div>
                <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:34px;")}>
                  {dKpis?.map((k) => (
                    <div key={k.l} style={s("border:1px solid #E7EDF3;border-radius:14px;padding:16px 18px;")}>
                      <div style={s("font-size:12px;color:#7A8C9E;font-weight:600;margin-bottom:8px;line-height:1.35;")}>{k.l}</div>
                      <div style={s("font:700 19px Space Grotesk,sans-serif;color:#0E2A47;line-height:1.15;")}>{k.v}</div>
                    </div>
                  ))}
                </div>

                <div style={s("font:700 11px Manrope,sans-serif;color:#90A1B2;letter-spacing:.6px;text-transform:uppercase;margin-bottom:13px;")}>
                  02 · Detalle
                </div>

                {(reportTab === "desempeno" || reportTab === "financiero") && (
                  <div style={s("border:1px solid #E7EDF3;border-radius:14px;overflow:hidden;")}>
                    <div
                      style={s(
                        "display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:10px 16px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                      )}
                    >
                      <span>Categoría</span>
                      <span>Reservas</span>
                      <span>Ingresos</span>
                      <span>Top instructor</span>
                    </div>
                    {categoriaStats.map((r) => (
                      <div key={r.cat} style={s("display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:11px 16px;border-bottom:1px solid #F1F4F8;font-size:12.5px;color:#33485E;font-weight:600;")}>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{r.cat}</span>
                        <span>{r.reservas}</span>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{money(r.ingreso)}</span>
                        <span>{r.top}</span>
                      </div>
                    ))}
                  </div>
                )}

                {reportTab === "actividades" && (
                  <div style={s("border:1px solid #E7EDF3;border-radius:14px;overflow:hidden;")}>
                    <div
                      style={s(
                        "display:grid;grid-template-columns:1.6fr 1.2fr 1fr 0.8fr;padding:10px 16px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                      )}
                    >
                      <span>Actividad</span>
                      <span>Instructor</span>
                      <span>Reservas</span>
                      <span>Rating</span>
                    </div>
                    {actividadRanking.slice(0, 8).map((a) => (
                      <div key={a.nombre} style={s("display:grid;grid-template-columns:1.6fr 1.2fr 1fr 0.8fr;padding:11px 16px;border-bottom:1px solid #F1F4F8;font-size:12.5px;color:#33485E;font-weight:600;")}>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{a.nombre}</span>
                        <span>{a.instructor ? `${a.instructor.nombre} ${a.instructor.apellido}` : "—"}</span>
                        <span>{a.reservas}</span>
                        <span>★ {a.rating.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {reportTab === "reclamos" && (
                  <div style={s("border:1px solid #E7EDF3;border-radius:14px;overflow:hidden;")}>
                    <div
                      style={s(
                        "display:grid;grid-template-columns:1fr 2fr 1fr 1fr;padding:10px 16px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                      )}
                    >
                      <span>ID</span>
                      <span>Motivo</span>
                      <span>Estado</span>
                      <span>Fecha</span>
                    </div>
                    {denuncias.map((d) => (
                      <div key={d.id} style={s("display:grid;grid-template-columns:1fr 2fr 1fr 1fr;padding:11px 16px;border-bottom:1px solid #F1F4F8;font-size:12.5px;color:#33485E;font-weight:600;")}>
                        <span style={s("font:700 11.5px ui-monospace,Menlo,monospace;color:#0E2A47;")}>{d.id}</span>
                        <span>{d.motivo}</span>
                        <span>{d.estado}</span>
                        <span>{new Date(d.createdAt).toLocaleDateString("es-AR")}</span>
                      </div>
                    ))}
                    {denuncias.length === 0 && <div style={s("padding:20px;text-align:center;color:#90A1B2;")}>Sin reclamos registrados.</div>}
                  </div>
                )}

                <div style={s("margin-top:30px;padding-top:16px;border-top:1px dashed #E2E9F0;font-size:11px;color:#9AAABA;font-weight:600;line-height:1.6;")}>
                  Documento generado automáticamente por ActiveHub a partir de datos operativos de la plataforma · Uso interno / confidencial.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
