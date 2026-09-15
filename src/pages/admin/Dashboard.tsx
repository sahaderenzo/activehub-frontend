import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAhora } from "../../lib/ahora";
import { siPuede } from "../../lib/cargaParcial";
import { useAuth } from "../../context/AuthContext";
import ErrorReintentar from "../../components/ErrorReintentar";
import GraficoBarras from "../../components/GraficoBarras";
import { useData } from "../../context/DataContext";
import type { InscripcionAdmin, UsuarioAdmin } from "../../context/DataContext";

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DONUT_COLORS = ["#12B5A5", "#FF6A2B", "#2D5BC8", "#7A52D9", "#F5A623"];

/**
 * El encabezado decia "Ultimos 30 dias" y no se podia cambiar: era un div de texto fijo y,
 * peor, mentia — los KPIs y los dos graficos se calculaban sobre TODO el historico. Ahora es
 * un selector real y el periodo filtra de verdad. Mismos rangos que Reportes, para que las
 * dos pantallas del admin se lean igual.
 */
const PERIODOS: { dias: number; label: string }[] = [
  { dias: 7, label: "Últimos 7 días" },
  { dias: 30, label: "Últimos 30 días" },
  { dias: 90, label: "Últimos 90 días" },
  { dias: 365, label: "Último año" },
  { dias: 0, label: "Todo el histórico" },
];

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
  /**
   * A donde lleva la tarjeta. Reemplaza a la grilla de "Accesos rapidos", que repetia estos
   * mismos destinos mas abajo con otro nombre: el numero y el lugar donde se resuelve eran
   * dos tarjetas distintas.
   */
  path: string;
  /** Que se va a ver al llegar, para que el click no sea una sorpresa. */
  destino: string;
  /** Permiso que hace falta para que el número exista. Sin él la tarjeta no se muestra. */
  requiere: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const ahora = useAhora();
  const { puede } = useAuth();
  const { actividades, tiposActividad, categorias, getTipoActividad, listarDenunciasAdmin, listarUsuariosAdmin, listarInstructores, listarInscripcionesAdmin } =
    useData();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [instructoresPendientes, setInstructoresPendientes] = useState(0);
  const [reclamosPendientes, setReclamosPendientes] = useState(0);
  const [inscripciones, setInscripciones] = useState<InscripcionAdmin[]>([]);

  const [errorCarga, setErrorCarga] = useState(false);
  const [periodoDias, setPeriodoDias] = useState(30);
  const periodoLabel = PERIODOS.find((p) => p.dias === periodoDias)?.label ?? "Todo el histórico";

  // Promise.all: si cualquiera de las cuatro consultas falla, el dashboard muestra el estado
  // de error con "Reintentar" en vez de KPIs en cero — que se veían idénticos a una
  // plataforma sin datos.
  // Cada consulta va detrás de SU permiso: el panel cruza cuatro módulos y un rol puede
  // tener sólo uno. Sin esto, un 403 de cualquiera de las cuatro tiraba todo el Promise.all
  // y el panel entero quedaba en error (ver lib/cargaParcial.ts).
  const cargar = useCallback(() => {
    Promise.all([
      siPuede(puede("usuarios.gestionar"), listarUsuariosAdmin, []),
      siPuede(puede("instructores.validar"), () => listarInstructores("PENDIENTE"), []),
      siPuede(puede("denuncias.resolver"), listarDenunciasAdmin, []),
      siPuede(puede("reportes.ver"), listarInscripcionesAdmin, []),
    ])
      .then(([us, pendientes, denuncias, insc]) => {
        setUsuarios(us);
        setInstructoresPendientes(pendientes.length);
        setReclamosPendientes(denuncias.filter((d) => d.estado === "Pendiente").length);
        setInscripciones(insc);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true));
  }, [puede, listarUsuariosAdmin, listarInstructores, listarDenunciasAdmin, listarInscripcionesAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Inicio del periodo elegido; null = sin corte (todo el historico). */
  const desde = useMemo(
    () => (periodoDias > 0 ? ahora - periodoDias * 24 * 60 * 60 * 1000 : null),
    [periodoDias, ahora],
  );

  // El periodo recorta lo que ENTRO en la ventana. "Usuarios activos" y "Actividades
  // publicadas" son un estado actual, no un flujo: esos no se recortan (recortarlos daria
  // "2 usuarios activos" en una plataforma con 17). La leyenda de cada tarjeta lo aclara.
  const inscripcionesPeriodo = useMemo(
    () => (desde === null ? inscripciones : inscripciones.filter((i) => new Date(i.createdAt).getTime() >= desde)),
    [inscripciones, desde],
  );

  const stats = useMemo(() => {
    const activos = usuarios.filter((u) => u.estado === "ACTIVO").length;
    const suspendidos = usuarios.length - activos;
    const nuevos =
      desde === null ? usuarios.length : usuarios.filter((u) => new Date(u.createdAt).getTime() >= desde).length;
    return { activos, suspendidos, nuevos, instructoresPendientes, reclamosPendientes };
  }, [usuarios, desde, instructoresPendientes, reclamosPendientes]);

  // Una tarjeta cuyo número no se pudo pedir mostraría 0, que se lee como "no hay" en vez de
  // "no tenés permiso". Se oculta.
  const kpis: KpiDef[] = [
    {
      label: "Usuarios activos",
      value: stats.activos,
      icon: ICONS.people,
      tint: "#EAF1FE",
      color: "#2D5BC8",
      delta: `${stats.suspendidos} suspendidos · ${stats.nuevos} nuevos`,
      deltaColor: stats.suspendidos > 0 ? "#BE3A3E" : "#0C8576",
      path: "/admin/gestion/usuarios",
      destino: "Gestión · Usuarios",
      requiere: "usuarios.gestionar",
    },
    {
      label: "Instructores por validar",
      value: stats.instructoresPendientes,
      icon: ICONS.check,
      tint: "#FFF3E0",
      color: "#B9741A",
      delta: stats.instructoresPendientes > 0 ? "Acción requerida" : "Al día",
      deltaColor: stats.instructoresPendientes > 0 ? "#B9741A" : "#0C8576",
      path: "/admin/gestion/instructores",
      destino: "Gestión · Instructores",
      requiere: "instructores.validar",
    },
    {
      label: "Actividades publicadas",
      value: actividades.length,
      icon: ICONS.activity,
      tint: "#E7F8F5",
      color: "#0C8576",
      delta: `${tiposActividad.length} tipos`,
      deltaColor: "#2D5BC8",
      path: "/admin/gestion/actividades",
      destino: "Gestión · Actividades",
      // El número sale del catálogo público, pero la pestaña a la que lleva es moderación.
      requiere: "actividades.moderar",
    },
    {
      label: "Reclamos pendientes",
      value: stats.reclamosPendientes,
      icon: ICONS.flag,
      tint: "#FBEAEB",
      color: "#BE3A3E",
      delta: stats.reclamosPendientes > 0 ? "Revisar" : "Sin pendientes",
      deltaColor: stats.reclamosPendientes > 0 ? "#BE3A3E" : "#0C8576",
      path: "/admin/gestion/reclamos",
      destino: "Gestión · Reclamos",
      requiere: "denuncias.resolver",
    },
  ];

  const monthlyBars = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const count = inscripcionesPeriodo.filter((insc) => {
        const ic = new Date(insc.createdAt);
        return ic.getFullYear() === d.getFullYear() && ic.getMonth() === d.getMonth();
      }).length;
      return { m: MONTH_ABBR[d.getMonth()], count };
    });
    // El eje Y, las alturas y los valores los arma `GraficoBarras`: acá solo se cuenta.
    return buckets.map((b) => ({ label: b.m, valor: b.count, detalle: `${b.m} (mes)` }));
  }, [inscripcionesPeriodo]);

  const donut = useMemo(() => {
    const counts = categorias.map((cat) => {
      const n = inscripcionesPeriodo.filter((insc) => {
        const act = actividades.find((a) => a.id === insc.actividadId);
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
  }, [categorias, inscripcionesPeriodo, actividades, getTipoActividad]);

  return (
    <DashLayout role="admin" active="admin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Dashboard general</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Resumen de la plataforma</p>
        </div>
        <div style={s("margin-left:auto;display:flex;gap:10px;align-items:center;")}>
          <div
            style={s(
              "display:flex;align-items:center;gap:8px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:11px;padding:4px 12px 4px 14px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <select
              aria-label="Período del panel"
              value={periodoDias}
              onChange={(e) => setPeriodoDias(Number(e.target.value))}
              style={s(
                "border:none;outline:none;background:transparent;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;padding:7px 2px;",
              )}
            >
              {PERIODOS.map((p) => (
                <option key={p.dias} value={p.dias}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {puede("reportes.ver") && (
          <button
            className="ah-btn"
            onClick={() => navigate("/admin/reportes")}
            style={s("background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:10px 18px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
          >
            Ver reportes
          </button>
          )}
        </div>
      </div>

      <div style={s("padding:26px 32px 50px;")}>
        {errorCarga && (
          <div style={s("margin-bottom:20px;")}>
            <ErrorReintentar
              mensaje="No pudimos cargar los datos del panel. Los números de abajo pueden estar incompletos."
              onReintentar={cargar}
              variant="banner"
            />
          </div>
        )}
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;")}>
          {kpis.filter((k) => puede(k.requiere)).map((k) => (
            <div
              key={k.label}
              className="ah-hov"
              role="link"
              tabIndex={0}
              title={`Ir a ${k.destino}`}
              onClick={() => navigate(k.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(k.path);
                }
              }}
              style={s(
                "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);display:flex;align-items:flex-start;gap:16px;",
              )}
            >
              <div
                style={s(
                  `width:46px;height:46px;border-radius:12px;background:${k.tint};display:flex;align-items:center;justify-content:center;flex:none;`,
                )}
              >
                <Icon d={k.icon} color={k.color} />
              </div>
              <div style={s("flex:1;min-width:0;")}>
                <div style={s("font:700 26px Space Grotesk,sans-serif;color:#0E2A47;line-height:1;margin-bottom:6px;")}>{k.value}</div>
                <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>{k.label}</div>
                <div style={s("font:700 11.5px Manrope,sans-serif;color:#90A1B2;margin-top:7px;display:flex;align-items:center;gap:4px;")}>
                  {k.destino}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#90A1B2" strokeWidth={2.6}>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
              <span style={s(`font:700 12px Manrope,sans-serif;color:${k.deltaColor};white-space:nowrap;`)}>{k.delta}</span>
            </div>
          ))}
        </div>

        {/* Los dos gráficos salen de inscripciones, que es `reportes.ver`. */}
        {puede("reportes.ver") && (
        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.6fr 1fr;gap:18px;margin-bottom:24px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;")}>
              <div>
                <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Inscripciones por mes</div>
                <div style={s("font-size:12px;color:#90A1B2;font-weight:600;margin-top:2px;")}>{periodoLabel}</div>
              </div>
              <div style={s("display:flex;gap:14px;")}>
                <span style={s("display:flex;align-items:center;gap:6px;font-size:12.5px;color:#65788C;font-weight:600;")}>
                  <span style={s("width:10px;height:10px;border-radius:3px;background:#12B5A5;")} />
                  Inscripciones
                </span>
              </div>
            </div>
            <GraficoBarras barras={monthlyBars} alto={170} unidad="inscripciones" />
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:20px;")}>Inscripciones por categoría</div>
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
        )}

        {kpis.every((k) => !puede(k.requiere)) && !puede("reportes.ver") && (
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:34px;text-align:center;")}>
            <div style={s("font:700 15.5px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:5px;")}>
              Nada que mostrar en el panel
            </div>
            <div style={s("font-size:13.5px;color:#90A1B2;font-weight:600;line-height:1.5;")}>
              Tu rol no tiene habilitados los módulos que alimentan este resumen. Usá el menú de la izquierda para
              ir a los módulos que sí tenés.
            </div>
          </div>
        )}

      </div>
    </DashLayout>
  );
}
