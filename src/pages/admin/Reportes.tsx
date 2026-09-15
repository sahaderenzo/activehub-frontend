import { useCallback, useEffect, useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAhora } from "../../lib/ahora";
import { siPuede } from "../../lib/cargaParcial";
import ErrorReintentar from "../../components/ErrorReintentar";
import GraficoBarras from "../../components/GraficoBarras";
import Modal from "../../components/Modal";
import { exportarPdf } from "../../lib/exportPdf";
import { descargarCsv } from "../../lib/exportCsv";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { ClaseAdmin, DenunciaAdmin, InscripcionAdmin, PenalizacionAdmin, UsuarioAdmin } from "../../context/DataContext";

type ReportTab = "desempeno" | "financiero" | "actividades" | "reclamos";

const TABS: { key: ReportTab; label: string; title: string }[] = [
  { key: "desempeno", label: "Desempeño", title: "Desempeño operativo de la plataforma" },
  { key: "financiero", label: "Financiero", title: "Reporte financiero de la plataforma" },
  { key: "actividades", label: "Actividades", title: "Ranking de actividades" },
  { key: "reclamos", label: "Reclamos y penalizaciones", title: "Reclamos y penalizaciones" },
];

const DONUT_COLORS = ["#12B5A5", "#FF6A2B", "#2D5BC8", "#7A52D9", "#F5A623"];

const PERIODOS: { dias: number; label: string }[] = [
  { dias: 7, label: "Últimos 7 días" },
  { dias: 30, label: "Últimos 30 días" },
  { dias: 90, label: "Últimos 90 días" },
  { dias: 365, label: "Último año" },
  { dias: 0, label: "Todo el histórico" },
];


function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString("es-AR")}`;
}

export default function AdminReportes() {
  const ahora = useAhora();
  const { currentUser, puede } = useAuth();
  const {
    actividades,
    tiposActividad,
    categorias,
    listarPenalizaciones,
    listarDenunciasAdmin,
    listarUsuariosAdmin,
    listarInscripcionesAdmin,
    listarClasesAdmin,
  } = useData();
  const [reportTab, setReportTab] = useState<ReportTab>("desempeno");
  const [modalOpen, setModalOpen] = useState(false);
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionAdmin[]>([]);
  const [clasesAdmin, setClasesAdmin] = useState<ClaseAdmin[]>([]);
  // Real desde que existe GET /api/admin/penalizaciones; antes el KPI contaba el dataset mock.
  const [penalizaciones, setPenalizaciones] = useState<PenalizacionAdmin[]>([]);

  const [errorCarga, setErrorCarga] = useState(false);

  /**
   * Pestañas visibles. "Reclamos y penalizaciones" sale de dos módulos que no son reportes
   * (`denuncias.resolver` y `penalizaciones.gestionar`); sin ninguno de los dos mostraría
   * ceros, que se leen como "no hubo reclamos" en vez de "no tenés permiso".
   *
   * <p>`tab` — y no `reportTab` — es lo que lee el resto de la pantalla: si la pestaña
   * guardada en el estado deja de estar disponible, cae sola en la primera en vez de quedar
   * seleccionada una que ya no se muestra.
   */
  const tabsVisibles = TABS.filter(
    (t) => t.key !== "reclamos" || puede("denuncias.resolver") || puede("penalizaciones.gestionar"),
  );
  const activeTab = tabsVisibles.find((t) => t.key === reportTab) ?? tabsVisibles[0];
  const tab = activeTab.key;

  // Un reporte con datos a medias miente: si falla una consulta que el rol SÍ podía hacer,
  // se muestra el error con "Reintentar" en vez de KPIs calculados sobre listas vacías.
  //
  // Ahora bien, esta pantalla cruza cinco módulos y sólo dos de las cinco consultas son
  // `reportes.ver`: las otras tres (denuncias, usuarios, penalizaciones) pertenecen a
  // módulos que un rol con permiso de reportes puede perfectamente no tener. Sin envolverlas,
  // ese 403 tiraba el `Promise.all` entero y la pantalla de Reportes quedaba en error para
  // alguien que tenía justamente el permiso de verla. Lo que no se puede pedir queda vacío y
  // la pestaña correspondiente se oculta (ver lib/cargaParcial.ts).
  const cargar = useCallback(() => {
    Promise.all([
      siPuede(puede("denuncias.resolver"), listarDenunciasAdmin, []),
      siPuede(puede("usuarios.gestionar"), listarUsuariosAdmin, []),
      siPuede(puede("reportes.ver"), listarInscripcionesAdmin, []),
      siPuede(puede("reportes.ver"), listarClasesAdmin, []),
      siPuede(puede("penalizaciones.gestionar"), listarPenalizaciones, []),
    ])
      .then(([den, us, insc, clases, pen]) => {
        setDenuncias(den);
        setUsuarios(us);
        setInscripciones(insc);
        setClasesAdmin(clases);
        setPenalizaciones(pen);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true));
  }, [puede, listarDenunciasAdmin, listarUsuariosAdmin, listarInscripcionesAdmin, listarClasesAdmin, listarPenalizaciones]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Los filtros se editan en un borrador y recién se aplican al presionar "Aplicar", que es
  // lo que pide el criterio 5. Antes los chips eran divs de texto fijo y el botón no tenía
  // handler, pero el encabezado del reporte igual afirmaba "Últimos 30 días".
  const [borradorPeriodo, setBorradorPeriodo] = useState(30);
  const [borradorCategoria, setBorradorCategoria] = useState("");
  const [periodoDias, setPeriodoDias] = useState(30);
  const [categoriaId, setCategoriaId] = useState("");

  const periodoLabel = PERIODOS.find((p) => p.dias === periodoDias)?.label ?? "Todo el histórico";
  const categoriaLabel = categoriaId
    ? categorias.find((c) => c.id === categoriaId)?.nombre ?? "Categoría"
    : "Todas las categorías";

  /** Actividades que caen dentro de la categoría filtrada (todas si no hay filtro). */
  const actividadIdsFiltradas = useMemo(() => {
    if (!categoriaId) return null;
    const tipoIds = tiposActividad.filter((t) => t.categoriaId === categoriaId).map((t) => t.id);
    return new Set(actividades.filter((a) => tipoIds.includes(a.tipoActividadId)).map((a) => a.id));
  }, [categoriaId, tiposActividad, actividades]);

  const inscripcionesFiltradas = useMemo(() => {
    const desde = periodoDias > 0 ? ahora - periodoDias * 24 * 60 * 60 * 1000 : null;
    return inscripciones.filter((i) => {
      if (desde !== null && new Date(i.createdAt).getTime() < desde) return false;
      if (actividadIdsFiltradas && !actividadIdsFiltradas.has(i.actividadId)) return false;
      return true;
    });
  }, [inscripciones, periodoDias, actividadIdsFiltradas, ahora]);

  const pagos = useMemo(
    () => inscripcionesFiltradas.map((i) => i.pago).filter((p): p is NonNullable<InscripcionAdmin["pago"]> => p !== null),
    [inscripcionesFiltradas],
  );

  // --- Datos reales de la plataforma (page-level, siempre visibles) --------
  const globalKpis = useMemo(() => {
    const totalInscripciones = inscripcionesFiltradas.length;
    const canceladas = inscripcionesFiltradas.filter((i) => i.estado === "Cancelada").length;
    const ingresos = pagos.filter((p) => p.estado === "Liberado" || p.estado === "Efectivo").reduce((sum, p) => sum + p.monto, 0);
    const cancelPct = totalInscripciones > 0 ? (canceladas / totalInscripciones) * 100 : 0;
    return { totalInscripciones, ingresos, cancelPct };
  }, [inscripcionesFiltradas, pagos]);

  /**
   * La serie temporal del reporte.
   *
   * <p>Antes eran 8 barras rotuladas `S1`…`S8`, ocho semanas hacia atrás **fijas**, sin
   * relación con el período elegido ni con el calendario. De ahí venían las dos preguntas
   * razonables que nadie podía responder mirando el gráfico: qué semana es "S1" (ninguna en
   * particular: la octava contando desde hoy hacia atrás) y qué significa una "semana 7" si
   * un mes tiene cuatro (nada: no eran semanas del mes). Encima faltaba el eje Y, así que una
   * barra más alta que otra no decía cuántas inscripciones más eran.
   *
   * <p>Ahora los tramos salen del período seleccionado, con la granularidad que lo hace
   * legible, y cada uno lleva su fecha real y su valor:
   * <ul>
   *   <li>7 días → un tramo por día ("lun 8").</li>
   *   <li>30 días → un tramo por semana, rotulado con el día en que arranca ("8 sep").</li>
   *   <li>90 días, un año o todo el histórico → un tramo por mes ("sep").</li>
   * </ul>
   */
  const serie = useMemo(() => {
    const dia = 24 * 60 * 60 * 1000;
    const fin = new Date(ahora);
    fin.setHours(23, 59, 59, 999);

    type Tramo = { label: string; detalle: string; desde: Date; hasta: Date };
    const tramos: Tramo[] = [];

    const fmtDiaMes = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

    if (periodoDias === 7) {
      for (let i = 6; i >= 0; i--) {
        const desde = new Date(fin.getTime() - i * dia);
        desde.setHours(0, 0, 0, 0);
        const hasta = new Date(desde.getTime() + dia);
        tramos.push({
          label: desde.toLocaleDateString("es-AR", { weekday: "short" }),
          detalle: fmtDiaMes(desde),
          desde,
          hasta,
        });
      }
    } else if (periodoDias === 30) {
      for (let i = 4; i >= 0; i--) {
        const hasta = new Date(fin.getTime() - i * 7 * dia);
        const desde = new Date(hasta.getTime() - 7 * dia);
        tramos.push({ label: fmtDiaMes(desde), detalle: `${fmtDiaMes(desde)} al ${fmtDiaMes(hasta)}`, desde, hasta });
      }
    } else {
      // 90 días → 3 meses; un año → 12; todo el histórico → los 12 últimos, que es lo que
      // entra sin que las etiquetas se pisen.
      const meses = periodoDias === 90 ? 3 : 12;
      for (let i = meses - 1; i >= 0; i--) {
        const desde = new Date(fin.getFullYear(), fin.getMonth() - i, 1);
        const hasta = new Date(fin.getFullYear(), fin.getMonth() - i + 1, 1);
        tramos.push({
          label: desde.toLocaleDateString("es-AR", { month: "short" }),
          detalle: desde.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
          desde,
          hasta,
        });
      }
    }

    const barras = tramos.map((t) => ({
      label: t.label,
      detalle: t.detalle,
      count: inscripcionesFiltradas.filter((insc) => {
        const d = new Date(insc.createdAt);
        return d >= t.desde && d < t.hasta;
      }).length,
    }));

    // El eje Y, las alturas y los valores los arma `GraficoBarras`: acá solo se cuenta.
    return { barras: barras.map((b) => ({ label: b.label, valor: b.count, detalle: b.detalle })) };
  }, [inscripcionesFiltradas, periodoDias, ahora]);

  const serieTitulo =
    periodoDias === 7 ? "Inscripciones por día" : periodoDias === 30 ? "Inscripciones por semana" : "Inscripciones por mes";

  const categoriaStats = useMemo(() => {
    return categorias.map((cat, i) => {
      const tipoIds = tiposActividad.filter((t) => t.categoriaId === cat.id).map((t) => t.id);
      const actIds = actividades.filter((a) => tipoIds.includes(a.tipoActividadId)).map((a) => a.id);
      const inscripcionesCat = inscripcionesFiltradas.filter((insc) => actIds.includes(insc.actividadId));
      // Mismo criterio que el KPI de arriba: solo plata efectivamente acreditada. Antes esta
      // columna sumaba TODOS los pagos, incluidos Cancelado y Retenido, así que la tabla no
      // cerraba con el KPI y convivían dos definiciones de "ingresos" en la misma pantalla.
      const ingresosCat = inscripcionesCat.reduce(
        (sum, insc) =>
          insc.pago && (insc.pago.estado === "Liberado" || insc.pago.estado === "Efectivo")
            ? sum + insc.pago.monto
            : sum,
        0,
      );
      // Top instructor por INSCRIPCIONES de la categoría, no por cantidad de actividades
      // publicadas: antes ganaba quien más publicaba aunque no tuviera una sola inscripción.
      const instructorCounts = new Map<string, number>();
      inscripcionesCat.forEach((insc) => {
        const act = actividades.find((a) => a.id === insc.actividadId);
        if (!act) return;
        instructorCounts.set(act.instructorId, (instructorCounts.get(act.instructorId) ?? 0) + 1);
      });
      let topInstructorId: string | null = null;
      let topCount = 0;
      instructorCounts.forEach((count, id) => {
        if (count > topCount) {
          topCount = count;
          topInstructorId = id;
        }
      });
      const topInstructor = topInstructorId ? usuarios.find((u) => u.id === topInstructorId) : undefined;
      return {
        cat: cat.nombre,
        inscripciones: inscripcionesCat.length,
        ingreso: ingresosCat,
        top: topInstructor ? `${topInstructor.nombre} ${topInstructor.apellido}` : "—",
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });
  }, [categorias, actividades, tiposActividad, inscripcionesFiltradas, usuarios]);

  const donut = useMemo(() => {
    const total = Math.max(1, categoriaStats.reduce((sum, c) => sum + c.inscripciones, 0));
    return categoriaStats.map((c) => ({ l: c.cat, p: `${Math.round((c.inscripciones / total) * 100)}%`, c: c.color }));
  }, [categoriaStats]);

  // --- Datos del reporte de detalle (modal), según pestaña seleccionada ---
  const actividadRanking = useMemo(
    () =>
      [...actividades]
        .map((a) => ({
          nombre: a.nombre,
          instructor: usuarios.find((u) => u.id === a.instructorId),
          inscripciones: inscripciones.filter((insc) => insc.actividadId === a.id).length,
          rating: a.rating,
        }))
        .sort((x, y) => y.inscripciones - x.inscripciones),
    [actividades, inscripciones, usuarios],
  );

  const reclamosStats = useMemo(() => {
    const pendientes = denuncias.filter((d) => d.estado === "Pendiente").length;
    const auditoria = denuncias.filter((d) => d.estado === "En Auditoría").length;
    const resueltas = denuncias.filter((d) => d.estado === "Resuelta").length;
    return { total: denuncias.length, pendientes, auditoria, resueltas };
  }, [denuncias]);

  /**
   * KPIs de la pestaña activa. Sin `useMemo`: es un switch sobre valores ya calculados, y un
   * memo que devuelve arrays literales desde un switch hace que el compilador de React se
   * saltee la optimización del componente entero (regla `preserve-manual-memoization`).
   */
  const dKpis = (() => {
    switch (tab) {
      case "desempeno":
        return [
          { l: "Total de inscripciones", v: String(globalKpis.totalInscripciones) },
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
        const cuposTotales = clasesAdmin.reduce((s, c) => s + c.cuposMax, 0);
        const cuposOcupados = clasesAdmin.reduce((s, c) => s + c.cuposOcupados, 0);
        return [
          { l: "Actividades publicadas", v: String(actividades.length) },
          { l: "Actividad con más inscripciones", v: top ? top.nombre : "—" },
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
  })();

  /**
   * Qué tabla se muestra bajo los KPIs. Es la misma decisión que ya tomaba el PDF; el bug era
   * que sólo la tomaba **ahí**: en la pantalla las cuatro pestañas mostraban exactamente lo
   * mismo (KPIs fijos + detalle por categoría), así que hacer click no cambiaba nada a la
   * vista y parecían botones muertos.
   */
  /**
   * Tabla de detalle de la pestaña activa: encabezados, anchos y filas ya formateadas.
   * Sin `useMemo`: es un mapeo barato sobre listas ya calculadas, y un segundo memo que
   * devuelve un objeto literal dentro de un `switch` hace que el compilador de React se saltee
   * la optimización de todo el componente (regla `preserve-manual-memoization`).
   */
  const detalle = (() => {
    switch (tab) {
      case "actividades":
        return {
          titulo: "Ranking de actividades",
          grid: "1.8fr 1.3fr .9fr .7fr",
          columnas: ["Actividad", "Instructor", "Inscripciones", "Rating"],
          filas: actividadRanking.map((a) => ({
            clave: a.nombre,
            celdas: [
              a.nombre,
              a.instructor ? `${a.instructor.nombre} ${a.instructor.apellido}` : "—",
              String(a.inscripciones),
              `★ ${a.rating.toFixed(1)}`,
            ],
          })),
        };
      case "reclamos":
        return {
          titulo: "Reclamos registrados",
          grid: "2fr 1fr 1fr 1fr",
          columnas: ["Motivo", "Estado", "Resolución", "Fecha"],
          filas: denuncias.map((d) => ({
            clave: d.id,
            celdas: [
              d.motivo,
              d.estado,
              d.resolucion ?? "—",
              new Date(d.createdAt).toLocaleDateString("es-AR"),
            ],
          })),
        };
      case "financiero":
        return {
          titulo: "Ingresos por categoría",
          grid: "1.5fr 1fr 1fr 1.3fr",
          columnas: ["Categoría", "Inscripciones", "Ingresos acreditados", "Top instructor"],
          filas: categoriaStats.map((r) => ({
            clave: r.cat,
            celdas: [r.cat, String(r.inscripciones), money(r.ingreso), r.top],
          })),
        };
      default:
        return {
          titulo: "Detalle por categoría",
          grid: "1.5fr 1fr 1fr 1.3fr",
          columnas: ["Categoría", "Inscripciones", "Ingresos", "Top instructor"],
          filas: categoriaStats.map((r) => ({
            clave: r.cat,
            celdas: [r.cat, String(r.inscripciones), money(r.ingreso), r.top],
          })),
        };
    }
  })();


  /**
   * El CSV sigue la pestaña activa, igual que los KPIs y la tabla de la pantalla. Antes
   * exportaba siempre el detalle por categoría, así que desde "Reclamos" bajabas un archivo
   * que no tenía nada que ver con lo que estabas mirando.
   */
  /**
   * El PDF ahora sale por el mismo helper que Trazabilidad y Metricas, e incluye el grafico.
   * Antes el boton llamaba a `window.print()` sobre el modal: imprimia la pantalla tal cual,
   * con el fondo oscuro y la barra de botones adentro del papel.
   */
  const exportarPdfReporte = () => {
    const ok = exportarPdf({
      titulo: activeTab.title,
      subtitulo: `${periodoLabel} · ${categoriaLabel}`,
      meta: [
        { etiqueta: "Generado por", valor: generadoPor },
        { etiqueta: "Emisión", valor: emision },
        ...(dKpis ?? []).map((k) => ({ etiqueta: k.l, valor: k.v })),
      ],
      grafico: {
        titulo: serieTitulo,
        barras: serie.barras.map((b) => ({ label: b.label, valor: b.valor })),
        unidad: "inscripciones",
      },
      columnas: detalle.columnas.map((c, i) => ({
        encabezado: c,
        valor: (f: (typeof detalle.filas)[number]) => f.celdas[i] ?? "",
      })),
      filas: detalle.filas,
      pie: "Documento generado automáticamente por ActiveHub a partir de datos operativos de la plataforma · Uso interno / confidencial.",
    });
    if (!ok) {
      window.alert("El navegador bloqueó la ventana de exportación. Habilitá las ventanas emergentes para este sitio.");
    }
  };

  const exportarCsv = () => {
    const filas: (string | number)[][] = [
      ["Reporte ActiveHub", activeTab.title],
      ["Período", periodoLabel],
      ["Alcance", categoriaLabel],
      [],
      ...(dKpis ?? []).map((k) => [k.l, k.v]),
      [],
      detalle.columnas,
      ...detalle.filas.map((f) => f.celdas),
      [],
      // La serie del gráfico va como filas: un CSV no puede llevar una imagen, pero sí los
      // números con los que está hecho, que es lo que alguien va a querer para rehacerlo.
      [serieTitulo, "Inscripciones"],
      ...serie.barras.map((b) => [b.detalle ?? b.label, b.valor]),
    ];
    descargarCsv(`activehub-reporte-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, filas);
  };
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
            title="Abre la vista previa lista para imprimir o guardar como PDF"
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
            onClick={exportarCsv}
            className="ah-btn"
            title="Descarga un CSV con el período y la categoría seleccionados (se abre en Excel)"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
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

      <div style={s("padding:24px 32px 50px;")}>
        {errorCarga && (
          <div style={s("margin-bottom:20px;")}>
            <ErrorReintentar
              mensaje="No pudimos cargar los datos del reporte. Lo que ves abajo puede estar incompleto."
              onReintentar={cargar}
              variant="banner"
            />
          </div>
        )}
        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;")}>
          <span style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>Filtros</span>
          <select
            value={borradorPeriodo}
            onChange={(e) => setBorradorPeriodo(Number(e.target.value))}
            style={s("background:#F2F5F9;border:1px solid #E7EDF3;border-radius:10px;padding:9px 13px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
          >
            {PERIODOS.map((p) => (
              <option key={p.dias} value={p.dias}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={borradorCategoria}
            onChange={(e) => setBorradorCategoria(e.target.value)}
            style={s("background:#F2F5F9;border:1px solid #E7EDF3;border-radius:10px;padding:9px 13px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button
            className="ah-btn"
            onClick={() => {
              setPeriodoDias(borradorPeriodo);
              setCategoriaId(borradorCategoria);
            }}
            style={s("margin-left:auto;background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:9px 18px;font:700 13px Manrope,sans-serif;cursor:pointer;")}
          >
            Aplicar
          </button>
        </div>

        <div style={s("display:flex;gap:6px;background:#F1F4F8;border-radius:12px;padding:5px;width:fit-content;margin-bottom:20px;flex-wrap:wrap;")}>
          {tabsVisibles.map((t) => (
            <span
              key={t.key}
              onClick={() => setReportTab(t.key)}
              className="ah-btn"
              style={s(
                `padding:10px 20px;border-radius:9px;font:700 13.5px Manrope,sans-serif;cursor:pointer;color:${tab === t.key ? "#0E2A47" : "#65788C"};background:${tab === t.key ? "#fff" : "transparent"};`,
              )}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div style={s("font:700 17px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:3px;")}>{activeTab.title}</div>
        <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-bottom:14px;")}>
          {periodoLabel} · {categoriaLabel}
        </div>

        {/* Los KPIs son los de la pestaña: son los que cambian al elegir Financiero,
            Actividades o Reclamos. Antes esta fila era fija y sólo el PDF los respetaba. */}
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;")}>
          {dKpis?.map((k) => (
            <div key={k.l} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px;")}>
              <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:8px;line-height:1.35;")}>{k.l}</div>
              <div style={s("font:700 22px Space Grotesk,sans-serif;color:#0E2A47;line-height:1.2;word-break:break-word;")}>{k.v}</div>
            </div>
          ))}
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-bottom:20px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;")}>
            <div style={s("margin-bottom:18px;")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;")}>{serieTitulo}</div>
              <div style={s("font-size:12px;color:#90A1B2;font-weight:600;margin-top:2px;")}>
                {periodoLabel} · cantidad de inscripciones creadas en cada tramo
              </div>
            </div>
            <GraficoBarras barras={serie.barras} color="naranja" alto={180} unidad="inscripciones" />
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
          <div style={s("padding:18px 22px;font:700 16px Space Grotesk,sans-serif;")}>{detalle.titulo}</div>
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:680px;")}>
              <div
                style={s(
                  `display:grid;grid-template-columns:${detalle.grid};padding:12px 22px;background:#F7FAFC;border-top:1px solid #EEF2F6;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;gap:12px;`,
                )}
              >
                {detalle.columnas.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              {detalle.filas.map((fila, i) => (
                <div
                  key={fila.clave}
                  style={s(
                    `display:grid;grid-template-columns:${detalle.grid};padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;gap:12px;background:${i % 2 === 1 ? "#FCFDFE" : "#fff"};`,
                  )}
                >
                  {fila.celdas.map((celda, j) => (
                    <span
                      key={j}
                      style={s(
                        j === 0
                          ? "font:700 14px Manrope,sans-serif;color:#0E2A47;min-width:0;word-break:break-word;"
                          : "font-size:13.5px;color:#41566B;font-weight:600;min-width:0;word-break:break-word;",
                      )}
                    >
                      {celda}
                    </span>
                  ))}
                </div>
              ))}
              {detalle.filas.length === 0 && (
                <div style={s("padding:34px 22px;text-align:center;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
                  Sin datos para esta pestaña con los filtros aplicados.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal layout="columna" fondo="rgba(8,22,38,.64)">
          <div style={s("flex:none;background:#0E2A47;color:#fff;padding:12px 22px;display:flex;align-items:center;gap:13px;border-bottom:1px solid #1C3A5A;")}>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FF6A2B;display:flex;align-items:center;justify-content:center;font:800 13px Space Grotesk,sans-serif;color:#fff;")}>
              AH
            </span>
            <span style={s("font:700 14.5px Manrope,sans-serif;")}>Vista previa del reporte</span>
            <span style={s("font:600 12px Manrope,sans-serif;color:#9DB3C9;")}>Generado el {emision}</span>
            <div style={s("margin-left:auto;display:flex;align-items:center;gap:8px;")}>
              <button
                onClick={exportarPdfReporte}
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
                      RP-{tab.slice(0, 3).toUpperCase()}-{now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div style={s("margin-top:26px;")}>
                  <div style={s("font:700 11.5px Manrope,sans-serif;color:#0FB8A9;letter-spacing:.7px;text-transform:uppercase;margin-bottom:7px;")}>
                    Reporte de indicadores y gráficos
                  </div>
                  <h1 style={s("font:700 28px Space Grotesk,sans-serif;margin:0;letter-spacing:-.6px;")}>{activeTab.title}</h1>
                  <p style={s("font:600 13.5px Manrope,sans-serif;color:#A9BDD2;margin:8px 0 0;")}>
                    Inscripciones, ingresos y ocupación de cupos · {periodoLabel} · {categoriaLabel}
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
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>{periodoLabel}</div>
                </div>
                <div style={s("padding:14px 22px;")}>
                  <div style={s("font:700 10px Manrope,sans-serif;color:#90A1B2;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;")}>Alcance</div>
                  <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;")}>{categoriaLabel}</div>
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

                {/* El PDF ya distinguía por pestaña; se deja como estaba para no tocar el
                    formato del documento, pero ahora coincide con lo que se ve en pantalla. */}
                {(tab === "desempeno" || tab === "financiero") && (
                  <div style={s("border:1px solid #E7EDF3;border-radius:14px;overflow:hidden;")}>
                    <div
                      style={s(
                        "display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:10px 16px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                      )}
                    >
                      <span>Categoría</span>
                      <span>Inscripciones</span>
                      <span>Ingresos</span>
                      <span>Top instructor</span>
                    </div>
                    {categoriaStats.map((r) => (
                      <div key={r.cat} style={s("display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;padding:11px 16px;border-bottom:1px solid #F1F4F8;font-size:12.5px;color:#33485E;font-weight:600;")}>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{r.cat}</span>
                        <span>{r.inscripciones}</span>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{money(r.ingreso)}</span>
                        <span>{r.top}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "actividades" && (
                  <div style={s("border:1px solid #E7EDF3;border-radius:14px;overflow:hidden;")}>
                    <div
                      style={s(
                        "display:grid;grid-template-columns:1.6fr 1.2fr 1fr 0.8fr;padding:10px 16px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 10.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                      )}
                    >
                      <span>Actividad</span>
                      <span>Instructor</span>
                      <span>Inscripciones</span>
                      <span>Rating</span>
                    </div>
                    {actividadRanking.slice(0, 8).map((a) => (
                      <div key={a.nombre} style={s("display:grid;grid-template-columns:1.6fr 1.2fr 1fr 0.8fr;padding:11px 16px;border-bottom:1px solid #F1F4F8;font-size:12.5px;color:#33485E;font-weight:600;")}>
                        <span style={s("font-weight:700;color:#0E2A47;")}>{a.nombre}</span>
                        <span>{a.instructor ? `${a.instructor.nombre} ${a.instructor.apellido}` : "—"}</span>
                        <span>{a.inscripciones}</span>
                        <span>★ {a.rating.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "reclamos" && (
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
        </Modal>
      )}
    </DashLayout>
  );
}
