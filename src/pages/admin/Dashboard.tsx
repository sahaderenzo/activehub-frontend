import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { categorias, getTipoActividad } from "../../lib/mockData";

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DONUT_COLORS = ["#12B5A5", "#FF6A2B", "#2D5BC8", "#7A52D9", "#F5A623"];

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <g dangerouslySetInnerHTML={{ __html: d }} />
    </svg>
  );
}

const ICONS = {
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  check: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  activity: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 1-1h13.5a.5.5 0 0 1 .4.8L15 9l3.9 5.2a.5.5 0 0 1-.4.8H5"/>',
};

interface KpiDef {
  label: string;
  value: number;
  icon: string;
  tint: string;
  color: string;
  delta: string;
  deltaColor: string;
}

interface AccesoDef {
  label: string;
  desc: string;
  icon: string;
  tint: string;
  color: string;
  path: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { users } = useAuth();
  const { actividades, tiposActividad, clases, inscripciones, denuncias } = useData();

  const stats = useMemo(() => {
    const activos = users.filter((u) => u.estado === "ACTIVO").length;
    const suspendidos = users.length - activos;
    const instructoresPendientes = users.filter(
      (u) => u.rol === "INSTRUCTOR" && u.perfilInstructor?.estadoVerificacion === "PENDIENTE",
    ).length;
    const reclamosPendientes = denuncias.filter((d) => d.estado === "Pendiente").length;
    return { activos, suspendidos, instructoresPendientes, reclamosPendientes };
  }, [users, denuncias]);

  const kpis: KpiDef[] = [
    {
      label: "Usuarios activos",
      value: stats.activos,
      icon: ICONS.people,
      tint: "#EAF1FE",
      color: "#2D5BC8",
      delta: `${stats.suspendidos} suspendidos`,
      deltaColor: stats.suspendidos > 0 ? "#BE3A3E" : "#0C8576",
    },
    {
      label: "Instructores por validar",
      value: stats.instructoresPendientes,
      icon: ICONS.check,
      tint: "#FFF3E0",
      color: "#B9741A",
      delta: stats.instructoresPendientes > 0 ? "Acción requerida" : "Al día",
      deltaColor: stats.instructoresPendientes > 0 ? "#B9741A" : "#0C8576",
    },
    {
      label: "Actividades publicadas",
      value: actividades.length,
      icon: ICONS.activity,
      tint: "#E7F8F5",
      color: "#0C8576",
      delta: `${tiposActividad.length} tipos`,
      deltaColor: "#2D5BC8",
    },
    {
      label: "Reclamos pendientes",
      value: stats.reclamosPendientes,
      icon: ICONS.flag,
      tint: "#FBEAEB",
      color: "#BE3A3E",
      delta: stats.reclamosPendientes > 0 ? "Revisar" : "Sin pendientes",
      deltaColor: stats.reclamosPendientes > 0 ? "#BE3A3E" : "#0C8576",
    },
  ];

  const monthlyBars = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const count = inscripciones.filter((insc) => {
        const ic = new Date(insc.createdAt);
        return ic.getFullYear() === d.getFullYear() && ic.getMonth() === d.getMonth();
      }).length;
      return { m: MONTH_ABBR[d.getMonth()], count };
    });
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return buckets.map((b) => ({ m: b.m, h: `${Math.max(6, Math.round((b.count / max) * 100))}%` }));
  }, [inscripciones]);

  const donut = useMemo(() => {
    const counts = categorias.map((cat) => {
      const n = inscripciones.filter((insc) => {
        const clase = clases.find((c) => c.id === insc.claseId);
        const act = clase && actividades.find((a) => a.id === clase.actividadId);
        const tipo = act && getTipoActividad(act.tipoActividadId);
        return tipo?.categoriaId === cat.id;
      }).length;
      return { l: cat.nombre, n };
    });
    const total = Math.max(1, counts.reduce((sum, c) => sum + c.n, 0));
    return counts.map((c, i) => ({
      l: c.l,
      p: `${Math.round((c.n / total) * 100)}%`,
      c: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [inscripciones, clases, actividades]);

  const accesos: AccesoDef[] = [
    {
      label: "Gestión administrativa",
      desc: "Usuarios, instructores, actividades",
      icon: ICONS.people,
      tint: "#EAF1FE",
      color: "#2D5BC8",
      path: "/admin/gestion",
    },
    {
      label: "Validar instructores",
      desc: `${stats.instructoresPendientes} solicitudes pendientes`,
      icon: ICONS.check,
      tint: "#FFF3E0",
      color: "#B9741A",
      path: "/admin/gestion/instructores",
    },
    {
      label: "Tipos y niveles",
      desc: "Taxonomía de actividades",
      icon: ICONS.activity,
      tint: "#E7F8F5",
      color: "#0C8576",
      path: "/admin/taxonomia",
    },
    {
      label: "Reportes",
      desc: "Indicadores de la plataforma",
      icon: ICONS.flag,
      tint: "#EFEAFB",
      color: "#6A3FC4",
      path: "/admin/reportes",
    },
  ];

  return (
    <DashLayout role="admin" active="admin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Dashboard general</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Resumen de la plataforma</p>
        </div>
        <div style={s("margin-left:auto;display:flex;gap:10px;")}>
          <div
            style={s(
              "display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:11px;padding:10px 14px;font:700 13.5px Manrope,sans-serif;color:#41566B;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Últimos 30 días
          </div>
          <button
            className="ah-btn"
            onClick={() => navigate("/admin/reportes")}
            style={s("background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:10px 18px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
          >
            Ver reportes
          </button>
        </div>
      </div>

      <div style={s("padding:26px 32px 50px;")}>
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;")}>
          {kpis.map((k) => (
            <div
              key={k.label}
              style={s(
                "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);display:flex;align-items:flex-start;gap:16px;",
              )}
            >
              <div
                style={s(
                  `width:46px;height:46px;border-radius:12px;background:${k.tint};display:flex;align-items:center;justify-content:center;flex:none;`,
                )}
              >
                <Icon d={k.icon} color={k.color} />
              </div>
              <div style={s("flex:1;")}>
                <div style={s("font:700 26px Space Grotesk,sans-serif;color:#0E2A47;line-height:1;margin-bottom:6px;")}>{k.value}</div>
                <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>{k.label}</div>
              </div>
              <span style={s(`font:700 12px Manrope,sans-serif;color:${k.deltaColor};white-space:nowrap;`)}>{k.delta}</span>
            </div>
          ))}
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.6fr 1fr;gap:18px;margin-bottom:24px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Reservas por mes</div>
              <div style={s("display:flex;gap:14px;")}>
                <span style={s("display:flex;align-items:center;gap:6px;font-size:12.5px;color:#65788C;font-weight:600;")}>
                  <span style={s("width:10px;height:10px;border-radius:3px;background:#12B5A5;")} />
                  Reservas
                </span>
              </div>
            </div>
            <div style={s("display:flex;align-items:flex-end;gap:9px;height:170px;")}>
              {monthlyBars.map((b) => (
                <div key={b.m} style={s("flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;justify-content:flex-end;height:100%;")}>
                  <div style={s(`width:100%;border-radius:6px 6px 3px 3px;background:linear-gradient(180deg,#12B5A5,#0FB8A9);height:${b.h};`)} />
                  <span style={s("font-size:10.5px;color:#90A1B2;font-weight:700;")}>{b.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:20px;")}>Reservas por categoría</div>
            <div style={s("display:flex;flex-direction:column;gap:13px;")}>
              {donut.map((d) => (
                <div key={d.l}>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;")}>
                    <span style={s("font-size:13px;font-weight:600;color:#41566B;display:flex;align-items:center;gap:8px;")}>
                      <span style={s(`width:10px;height:10px;border-radius:3px;background:${d.c};`)} />
                      {d.l}
                    </span>
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

        <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Accesos rápidos</div>
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;")}>
          {accesos.map((a) => (
            <div
              key={a.label}
              className="ah-hov"
              onClick={() => navigate(a.path)}
              style={s("cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}
            >
              <div
                style={s(
                  `width:46px;height:46px;border-radius:12px;background:${a.tint};display:flex;align-items:center;justify-content:center;margin-bottom:14px;`,
                )}
              >
                <Icon d={a.icon} color={a.color} />
              </div>
              <div style={s("font:700 15.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:3px;")}>{a.label}</div>
              <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;")}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
