import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import GraficoBarras from "../../components/GraficoBarras";
import { useAhora } from "../../lib/ahora";
import { descargarCsv } from "../../lib/exportCsv";
import { exportarPdf } from "../../lib/exportPdf";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { InscripcionMiClase, MiClaseInstructor } from "../../context/DataContext";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Mismos rangos que Dashboard y Reportes del admin: el instructor tiene derecho al mismo
 * control. El encabezado decía "Últimos 12 meses" y era un div de texto fijo — los KPIs, en
 * cambio, se calculaban sobre TODO el histórico, así que además mentía.
 */
const PERIODOS: { dias: number; label: string }[] = [
  { dias: 7, label: "Últimos 7 días" },
  { dias: 30, label: "Últimos 30 días" },
  { dias: 90, label: "Últimos 90 días" },
  { dias: 365, label: "Último año" },
  { dias: 0, label: "Todo el histórico" },
];
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

  const [misClases, setMisClases] = useState<MiClaseInstructor[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionMiClase[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback(() => {
    if (!aprobado) return;
    Promise.all([data.listarMisClases(), data.listarInscripcionesMisClases()])
      .then(([clases, inscs]) => {
        setMisClases(clases);
        setInscripciones(inscs);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true));
  }, [aprobado, data.listarMisClases, data.listarInscripcionesMisClases]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ahora = useAhora();
  const [periodoDias, setPeriodoDias] = useState(365);
  const periodoLabel = PERIODOS.find((p) => p.dias === periodoDias)?.label ?? "Todo el histórico";

  const stats = useMemo(() => {
    if (!currentUser) return null;
    // Todo sale de los endpoints del instructor: `misClases` e `inscripciones` ya vienen
    // acotados a este instructor por el backend. Antes esto se derivaba de la caché
    // parcial `data.clases` y del dataset mock `data.inscripciones`/`data.pagos`, cuyos
    // ids ni siquiera podían cruzarse con los reales, así que todo daba cero.
    // El período recorta un FLUJO (las inscripciones que entraron en la ventana). La
    // ocupación de cupos se calcula sobre las clases del mismo tramo, más abajo.
    const desde = periodoDias > 0 ? ahora - periodoDias * 24 * 60 * 60 * 1000 : null;
    const misInscripciones = inscripciones.filter(
      (i) => i.estado !== "Cancelada" && (desde === null || new Date(i.createdAt).getTime() >= desde),
    );

    // Nombres de actividad únicos a partir de las clases propias.
    const nombrePorActividad = new Map<string, string>();
    for (const c of misClases) nombrePorActividad.set(c.actividadId, c.actividadNombre);
    const misActividades = Array.from(nombrePorActividad, ([id, nombre]) => ({ id, nombre }));

    const totalAlumnos = new Set(misInscripciones.map((i) => i.alumnoId)).size;

    // E2I-HU10 criterio 6: los ingresos consideran ÚNICAMENTE los pagos ya acreditados
    // al instructor — Liberado (Mercado Pago, tras finalizar la clase y pasar el período
    // de denuncias) o Efectivo (cobrado mano a mano). Los Retenido todavía no son plata
    // del instructor y los Cancelado se reintegraron.
    const ingresosAcreditados = inscripciones.reduce(
      (sum, i) => (i.pagoEstado === "Liberado" || i.pagoEstado === "Efectivo" ? sum + (i.pagoMonto ?? 0) : sum),
      0,
    );

    // Lo que está por acreditarse: se muestra aparte para que un instructor con pagos
    // retenidos no lea un cero y crea que perdió la plata.
    const ingresosPendientes = inscripciones.reduce(
      (sum, i) => (i.pagoEstado === "Retenido" ? sum + (i.pagoMonto ?? 0) : sum),
      0,
    );

    const ocupacionProm = misClases.length
      ? Math.round(
          (misClases.reduce((s, c) => s + (c.cuposMax ? c.cuposOcupados / c.cuposMax : 0), 0) / misClases.length) * 100,
        )
      : 0;

    // La granularidad sale del período, igual que en Reportes del admin: 7 días → un tramo
    // por día, 30 → por semana, el resto → por mes. Doce barras mensuales para "últimos 7
    // días" serían once barras vacías.
    const now = new Date(ahora);
    const dia = 24 * 60 * 60 * 1000;
    const entre = (a: Date, b: Date) =>
      misInscripciones.filter((i) => {
        const d = new Date(i.createdAt);
        return d >= a && d < b;
      }).length;

    let monthBars: { label: string; valor: number; detalle: string }[];
    if (periodoDias === 7) {
      monthBars = Array.from({ length: 7 }, (_, i) => {
        const desdeD = new Date(now.getTime() - (6 - i) * dia);
        desdeD.setHours(0, 0, 0, 0);
        const hastaD = new Date(desdeD.getTime() + dia);
        return {
          label: desdeD.toLocaleDateString("es-AR", { weekday: "short" }),
          valor: entre(desdeD, hastaD),
          detalle: desdeD.toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
        };
      });
    } else if (periodoDias === 30) {
      monthBars = Array.from({ length: 5 }, (_, i) => {
        const hastaD = new Date(now.getTime() - (4 - i) * 7 * dia);
        const desdeD = new Date(hastaD.getTime() - 7 * dia);
        const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
        return { label: fmt(desdeD), valor: entre(desdeD, hastaD), detalle: fmt(desdeD) + " al " + fmt(hastaD) };
      });
    } else {
      const meses = periodoDias === 90 ? 3 : 12;
      monthBars = Array.from({ length: meses }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - (meses - 1 - i), 1);
        const siguiente = new Date(now.getFullYear(), now.getMonth() - (meses - 1 - i) + 1, 1);
        return {
          label: MESES[m.getMonth()],
          valor: entre(m, siguiente),
          detalle: m.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
        };
      });
    }

    const porActividad = misActividades
      .map((a, i) => {
        const count = misInscripciones.filter((insc) => insc.actividadId === a.id).length;
        return { l: a.nombre, count, c: PALETTE[i % PALETTE.length] };
      })
      .sort((a, b) => b.count - a.count);
    const totalInscripciones = porActividad.reduce((s, d) => s + d.count, 0);
    const inscripcionesPorActividad = porActividad.map((d) => ({
      l: d.l,
      c: d.c,
      // Se conserva el conteo ademas del porcentaje: la exportacion necesita el numero, no "18%".
      count: d.count,
      p: `${totalInscripciones ? Math.round((d.count / totalInscripciones) * 100) : 0}%`,
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
      ingresosAcreditados,
      ingresosPendientes,
      ocupacionProm,
      monthBars,
      inscripcionesPorActividad,
      ocupacionPorActividad,
    };
  }, [currentUser, misClases, inscripciones, periodoDias, ahora]);

  /**
   * Las dos exportaciones salen de `stats`, o sea exactamente de lo que se ve en pantalla.
   * Antes la pantalla no tenia ninguna: la unica forma de sacar los numeros era copiarlos a
   * mano. El CSV y el PDF usan los helpers compartidos (`lib/exportCsv`, `lib/exportPdf`), los
   * mismos que Reportes y Trazabilidad del admin.
   */
  const nombreInstructor = [currentUser?.nombre, currentUser?.apellido].filter(Boolean).join(' ');
  const emision = new Date().toLocaleString('es-AR');

  const filasExport = (): (string | number)[][] => {
    if (!stats) return [];
    return [
      ['Métricas del instructor', nombreInstructor],
      ['Emitido', emision],
      ['Período', periodoLabel],
      [],
      ['Alumnos distintos', stats.totalAlumnos],
      ['Ingresos acreditados', stats.ingresosAcreditados],
      ['Ingresos pendientes de acreditar', stats.ingresosPendientes],
      ['Ocupación promedio (%)', stats.ocupacionProm],
      [],
      ['Actividad', 'Inscripciones', 'Ocupación'],
      ...stats.inscripcionesPorActividad.map((d, i) => [
        d.l,
        d.count,
        stats.ocupacionPorActividad[i]?.p ?? '—',
      ]),
      [],
      ['Mes', 'Inscripciones'],
      ...stats.monthBars.map((b) => [b.detalle, b.valor]),
    ];
  };

  const exportarCsv = () => {
    descargarCsv('activehub-metricas-' + new Date().toISOString().slice(0, 10) + '.csv', filasExport());
  };

  const exportarPdfMetricas = () => {
    if (!stats) return;
    const filas = stats.inscripcionesPorActividad.map((d, i) => ({
      actividad: d.l,
      inscripciones: String(d.count),
      ocupacion: stats.ocupacionPorActividad[i]?.p ?? '—',
    }));
    const ok = exportarPdf({
      titulo: 'Métricas del instructor',
      subtitulo: nombreInstructor,
      meta: [
        { etiqueta: 'Emitido', valor: emision },
        { etiqueta: 'Período', valor: periodoLabel },
        { etiqueta: 'Alumnos distintos', valor: String(stats.totalAlumnos) },
        { etiqueta: 'Ingresos acreditados', valor: '$' + stats.ingresosAcreditados.toLocaleString('es-AR') },
        { etiqueta: 'Pendiente de acreditar', valor: '$' + stats.ingresosPendientes.toLocaleString('es-AR') },
        { etiqueta: 'Ocupación promedio', valor: stats.ocupacionProm + '%' },
      ],
      grafico: {
        titulo: periodoDias === 7 ? 'Inscripciones por día' : periodoDias === 30 ? 'Inscripciones por semana' : 'Inscripciones por mes',
        barras: stats.monthBars.map((b) => ({ label: b.label, valor: b.valor })),
        unidad: 'inscripciones',
      },
      columnas: [
        { encabezado: 'Actividad', ancho: '50%', valor: (f: (typeof filas)[number]) => f.actividad },
        { encabezado: 'Inscripciones', ancho: '25%', valor: (f: (typeof filas)[number]) => f.inscripciones },
        { encabezado: 'Ocupación', ancho: '25%', valor: (f: (typeof filas)[number]) => f.ocupacion },
      ],
      filas,
      pie: 'Documento generado por ActiveHub a partir de tus clases e inscripciones. Uso interno.',
    });
    if (!ok) {
      window.alert('El navegador bloqueó la ventana de exportación. Habilitá las ventanas emergentes para este sitio.');
    }
  };

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
      value: `$${stats.ingresosAcreditados.toLocaleString("es-AR")}`,
      label: "Ingresos acreditados",
      caption:
        stats.ingresosPendientes > 0
          ? `$${stats.ingresosPendientes.toLocaleString("es-AR")} pendientes de acreditación`
          : "Pagos liberados y cobros en efectivo",
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
        <div style={s("margin-left:auto;display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
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
              aria-label="Período de las métricas"
              value={periodoDias}
              onChange={(e) => setPeriodoDias(Number(e.target.value))}
              style={s(
                "border:none;outline:none;background:transparent;font:700 13.5px Manrope;color:#41566B;cursor:pointer;padding:7px 2px;",
              )}
            >
              {PERIODOS.map((p) => (
                <option key={p.dias} value={p.dias}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="ah-btn"
            onClick={exportarPdfMetricas}
            title="Abre la vista de impresión: el destino por defecto es Guardar como PDF"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            PDF
          </button>
          <button
            className="ah-btn"
            onClick={exportarCsv}
            title="Descarga un CSV que se abre en Excel"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Excel / CSV
          </button>
        </div>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        {errorCarga && (
          <div
            style={s(
              "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;",
            )}
          >
            <span style={s("color:#BE3A3E;font-weight:700;font-size:13.5px;")}>
              No se pudieron cargar las métricas.
            </span>
            <button
              className="ah-btn"
              onClick={cargar}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:8px 14px;font:700 13px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Reintentar
            </button>
          </div>
        )}
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
            <div style={s("margin-bottom:18px;")}>
              <div style={s("font:700 16px Space Grotesk;")}>
                {periodoDias === 7 ? "Inscripciones por día" : periodoDias === 30 ? "Inscripciones por semana" : "Inscripciones por mes"}
              </div>
              <div style={s("font-size:12px;color:#90A1B2;font-weight:600;margin-top:2px;")}>{periodoLabel}</div>
            </div>
            <GraficoBarras barras={stats.monthBars} alto={170} unidad="inscripciones" />
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("font:700 16px Space Grotesk;margin-bottom:20px;")}>Inscripciones por actividad</div>
            {stats.inscripcionesPorActividad.length === 0 ? (
              <p style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>Todavía no tenés inscripciones.</p>
            ) : (
              <div style={s("display:flex;flex-direction:column;gap:13px;")}>
                {stats.inscripcionesPorActividad.map((d) => (
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
