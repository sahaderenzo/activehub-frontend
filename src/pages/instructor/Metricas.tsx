import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const PALETTE = ["#12B5A5", "#3A6FF0", "#F5A623", "#7A52D9", "#FF6A2B", "#0FB8A9"];

/**
 * Simplification note: the prototype's charts (bar chart, distribution bars,
 * occupancy bars) are recreated here as plain CSS bars driven by real numbers
 * derived from useData() (no chart library in this app). KPI captions
 * describe what the number means instead of a fabricated week-over-week
 * delta, since the mock dataset is too small to produce a trustworthy trend.
 */
export default function InstructorMetricas() {
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const stats = useMemo(() => {
    if (!currentUser) return null;
    const misActividades = data.actividades.filter((a) => a.instructorId === currentUser.id);
    const misActividadIds = new Set(misActividades.map((a) => a.id));
    const misClases = data.clases.filter((c) => misActividadIds.has(c.actividadId));
    const misClaseIds = new Set(misClases.map((c) => c.id));
    const misInscripciones = data.inscripciones.filter((i) => misClaseIds.has(i.claseId) && i.estado !== "Cancelada");

    const totalAlumnos = new Set(misInscripciones.map((i) => i.alumnoId)).size;

    const ingresosEstimados = data.pagos.reduce((sum, p) => {
      if (p.estado === "Cancelado") return sum;
      const insc = data.inscripciones.find((i) => i.id === p.inscripcionId);
      if (!insc || !misClaseIds.has(insc.claseId)) return sum;
      return sum + p.monto;
    }, 0);

    const ocupacionProm = misClases.length
      ? Math.round(
          (misClases.reduce((s, c) => s + (c.cuposMax ? c.cuposOcupados / c.cuposMax : 0), 0) / misClases.length) * 100,
        )
      : 0;

    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (11 - i), 1));
    const monthCounts = months.map(
      (m) =>
        misInscripciones.filter((i) => {
          const d = new Date(i.createdAt);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        }).length,
    );
    const maxMonth = Math.max(1, ...monthCounts);
    const monthBars = months.map((m, i) => ({
      m: MESES[m.getMonth()],
      h: `${Math.max(6, Math.round((monthCounts[i] / maxMonth) * 100))}%`,
    }));

    const porActividad = misActividades
      .map((a, i) => {
        const count = misInscripciones.filter((insc) => {
          const clase = data.clases.find((c) => c.id === insc.claseId);
          return clase?.actividadId === a.id;
        }).length;
        return { l: a.nombre, count, c: PALETTE[i % PALETTE.length] };
      })
      .sort((a, b) => b.count - a.count);
    const totalReservas = porActividad.reduce((s, d) => s + d.count, 0);
    const reservasPorActividad = porActividad.map((d) => ({
      l: d.l,
      c: d.c,
      p: `${totalReservas ? Math.round((d.count / totalReservas) * 100) : 0}%`,
    }));

    const ocupacionPorActividad = misActividades.map((a, i) => {
      const clasesAct = misClases.filter((c) => c.actividadId === a.id);
      const prom = clasesAct.length
        ? Math.round((clasesAct.reduce((s, c) => s + (c.cuposMax ? c.cuposOcupados / c.cuposMax : 0), 0) / clasesAct.length) * 100)
        : 0;
      return { l: a.nombre, p: `${prom}%`, c: PALETTE[i % PALETTE.length] };
    });

    return {
      totalAlumnos,
      ingresosEstimados,
      ocupacionProm,
      monthBars,
      reservasPorActividad,
      ocupacionPorActividad,
    };
  }, [currentUser, data.actividades, data.clases, data.inscripciones, data.pagos]);

  if (!currentUser || !aprobado || !stats) return null;

  const kpis = [
    {
      tint: "#EAF1FE",
      value: String(stats.totalAlumnos),
      label: "Alumnos activos",
      caption: "Alumnos únicos inscriptos en tus clases",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      tint: "#E7F8F5",
      value: `$${stats.ingresosEstimados.toLocaleString("es-AR")}`,
      label: "Ingresos estimados",
      caption: "Suma de pagos registrados",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      tint: "#FFF3E0",
      value: `${stats.ocupacionProm}%`,
      label: "Ocupación promedio",
      caption: "Promedio de cupos ocupados en tus clases",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B9741A" strokeWidth={2}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
  ];

  return (
    <DashLayout role="instructor" active="metricas">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Métricas del instructor</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Desempeño de tus actividades</p>
        </div>
        <div
          style={s(
            "margin-left:auto;display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:11px;padding:10px 14px;font:700 13.5px Manrope;color:#41566B;",
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Últimos 12 meses
        </div>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px;")}>
          {kpis.map((k) => (
            <div
              key={k.label}
              style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}
            >
              <div
                style={s(
                  `width:42px;height:42px;border-radius:11px;background:${k.tint};display:flex;align-items:center;justify-content:center;margin-bottom:14px;`,
                )}
              >
                {k.icon}
              </div>
              <div style={s("font:700 24px Space Grotesk;color:#0E2A47;margin-bottom:3px;")}>{k.value}</div>
              <div style={s("font-size:13px;color:#65788C;font-weight:600;margin-bottom:6px;")}>{k.label}</div>
              <div style={s("font-size:12px;color:#0C8576;font-weight:700;")}>{k.caption}</div>
            </div>
          ))}
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.6fr 1fr;gap:18px;margin-bottom:24px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("font:700 16px Space Grotesk;margin-bottom:22px;")}>Reservas por mes</div>
            <div style={s("display:flex;align-items:flex-end;gap:9px;height:170px;")}>
              {stats.monthBars.map((b, i) => (
                <div key={i} style={s("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;justify-content:flex-end;height:100%;")}>
                  <div style={s(`width:100%;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,#12B5A5,#0FB8A9);height:${b.h};`)} />
                  <span style={s("font-size:10.5px;color:#90A1B2;font-weight:700;")}>{b.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("font:700 16px Space Grotesk;margin-bottom:20px;")}>Reservas por actividad</div>
            {stats.reservasPorActividad.length === 0 ? (
              <p style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>Todavía no tenés reservas.</p>
            ) : (
              <div style={s("display:flex;flex-direction:column;gap:13px;")}>
                {stats.reservasPorActividad.map((d) => (
                  <div key={d.l}>
                    <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;")}>
                      <span style={s("font-size:13px;font-weight:600;color:#41566B;display:flex;align-items:center;gap:8px;min-width:0;")}>
                        <span style={s(`width:10px;height:10px;border-radius:3px;background:${d.c};flex:none;`)} />
                        <span style={s("white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{d.l}</span>
                      </span>
                      <span style={s("font:700 13px Space Grotesk;color:#0E2A47;flex:none;")}>{d.p}</span>
                    </div>
                    <div style={s("height:7px;border-radius:99px;background:#EEF2F6;overflow:hidden;")}>
                      <div style={s(`height:100%;width:${d.p};background:${d.c};border-radius:99px;`)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 16px Space Grotesk;margin-bottom:18px;")}>Ocupación promedio por actividad</div>
          {stats.ocupacionPorActividad.length === 0 ? (
            <p style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>Todavía no tenés actividades.</p>
          ) : (
            <div style={s("display:flex;flex-direction:column;gap:15px;")}>
              {stats.ocupacionPorActividad.map((o) => (
                <div key={o.l} style={s("display:flex;align-items:center;gap:14px;")}>
                  <span style={s("font-size:13.5px;font-weight:700;color:#41566B;width:180px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>
                    {o.l}
                  </span>
                  <div style={s("flex:1;height:10px;border-radius:99px;background:#EEF2F6;overflow:hidden;")}>
                    <div style={s(`height:100%;width:${o.p};background:${o.c};border-radius:99px;`)} />
                  </div>
                  <span style={s("font:700 13.5px Space Grotesk;color:#0E2A47;width:44px;text-align:right;flex:none;")}>{o.p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  );
}
