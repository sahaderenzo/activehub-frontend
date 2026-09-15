import { useEffect, useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import Modal from "../../components/Modal";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { AuditoriaEntry } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha, formatHora } from "../../lib/mockData";
import { exportarPdf } from "../../lib/exportPdf";
import type { RolNombre } from "../../lib/types";

type RolFiltro = RolNombre | "SISTEMA" | "TODOS";

/**
 * Eventos por página. La auditoría es de sólo-append y crece para siempre: con unos miles
 * de filas, renderizarlas todas de una hace que la pantalla tarde en pintar y que exportar
 * genere un PDF de cientos de hojas que nadie va a leer.
 */
const POR_PAGINA = 15;

const ROL_STYLE: Record<RolNombre | "SISTEMA", [string, string]> = {
  ALUMNO: ["#EAF1FE", "#2D5BC8"],
  INSTRUCTOR: ["#E7F8F5", "#0C8576"],
  ADMIN: ["#FFF3E0", "#B9741A"],
  SISTEMA: ["#EFEAFB", "#6A3FC4"],
};

const ROL_LABEL: Record<RolNombre | "SISTEMA", string> = {
  ALUMNO: "Alumno",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
  SISTEMA: "Sistema",
};

const ACCION_PALETTE: [string, string, string, string][] = [
  ["#EAF1FE", "#2D5BC8", "#D5E2FB", "#3A6FF0"],
  ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5"],
  ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623"],
  ["#EFEAFB", "#6A3FC4", "#DCD2F3", "#7A52D9"],
  ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D"],
];

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function accionStyle(accion: string): [string, string, string, string] {
  if (/FALLID|RECHAZ|SUSPEND/i.test(accion)) return ACCION_PALETTE[4];
  if (/VALIDAD|APROBAD/i.test(accion)) return ACCION_PALETTE[1];
  if (/REGISTRO/i.test(accion)) return ACCION_PALETTE[0];
  if (/CREADO|NUEVO/i.test(accion)) return ACCION_PALETTE[3];
  return ACCION_PALETTE[hashStr(accion) % ACCION_PALETTE.length];
}

/**
 * Las columnas de la tabla, en orden. Vive acá y no inline en el JSX porque la misma lista
 * arma el encabezado clickeable y decide por qué campo se ordena.
 */
type CampoOrden = "fecha" | "usuario" | "accion" | "entidad" | "detalle";

const COLUMNAS: { campo: CampoOrden; label: string }[] = [
  { campo: "fecha", label: "Fecha y hora" },
  { campo: "usuario", label: "Usuario" },
  { campo: "accion", label: "Acción" },
  { campo: "entidad", label: "Entidad" },
  { campo: "detalle", label: "Detalle" },
];

const GRID_COLUMNAS =
  "grid-template-columns:130px minmax(150px,1.3fr) minmax(196px,1.1fr) minmax(104px,.8fr) minmax(190px,1.9fr);";

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AdminTrazabilidad() {
  const { listarAuditoria } = useData();
  const [auditLog, setAuditLog] = useState<AuditoriaEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>("TODOS");
  const [accFiltro, setAccFiltro] = useState<string>("TODAS");
  const [rolOpen, setRolOpen] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [accOpen, setAccOpen] = useState(false);
  // `null` = el orden que devuelve el backend (más reciente primero). Sólo se ordena a mano
  // cuando el usuario hace click en un encabezado: al cargar la pantalla no se toca nada.
  const [orden, setOrden] = useState<{ campo: CampoOrden; dir: "asc" | "desc" } | null>(null);
  // El número de página es editable: con 200 páginas, llegar a la 137 a fuerza de "Siguiente"
  // no es navegación.
  const [editandoPagina, setEditandoPagina] = useState(false);
  const [paginaInput, setPaginaInput] = useState("");
  const [confirmarExport, setConfirmarExport] = useState(false);

  useEffect(() => {
    listarAuditoria()
      .then(setAuditLog)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar la auditoría."));
  }, [listarAuditoria]);

  const accionesUnicas = useMemo(() => Array.from(new Set(auditLog.map((e) => e.accion))).sort(), [auditLog]);

  const entries = useMemo(
    () =>
      auditLog.map((e) => ({
        ...e,
        rol: (e.actorRol ?? "SISTEMA") as RolNombre | "SISTEMA",
        nombre: e.actorNombre,
      })),
    [auditLog],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (rolFiltro !== "TODOS" && e.rol !== rolFiltro) return false;
      if (accFiltro !== "TODAS" && e.accion !== accFiltro) return false;
      if (!q) return true;
      return (
        e.nombre.toLowerCase().includes(q) ||
        e.entidad.toLowerCase().includes(q) ||
        e.accion.toLowerCase().includes(q) ||
        e.entidadId.toLowerCase().includes(q) ||
        (e.metadata ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, rolFiltro, accFiltro]);

  /**
   * Orden client-side, como todo el resto del proyecto (no hay ordenamiento server-side en
   * ningún endpoint). Se ordena **lo filtrado**, no la página visible: ordenar sólo las 15
   * filas de la pantalla daría un orden distinto en cada página.
   *
   * <p>El texto se compara con `Intl.Collator` en es-AR y no con `<`: comparando códigos
   * UTF-16, "Ñandú" y "álvarez" caen después de "Zapata".
   */
  const ordenados = useMemo(() => {
    if (!orden) return filtered;
    const collator = new Intl.Collator("es-AR", { sensitivity: "base", numeric: true });
    const texto = (e: (typeof filtered)[number]) =>
      orden.campo === "usuario"
        ? e.nombre
        : orden.campo === "accion"
          ? e.accion
          : orden.campo === "entidad"
            ? e.entidad
            : e.descripcion;
    const copia = [...filtered];
    copia.sort((a, b) => {
      const r =
        orden.campo === "fecha"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : collator.compare(texto(a), texto(b));
      return orden.dir === "asc" ? r : -r;
    });
    return copia;
  }, [filtered, orden]);

  /**
   * Primer click: las fechas arrancan por la más reciente (que es lo que alguien espera de un
   * log) y el texto por la A. Del segundo click en adelante alterna.
   */
  const toggleOrden = (campo: CampoOrden) => {
    setOrden((o) =>
      !o || o.campo !== campo
        ? { campo, dir: campo === "fecha" ? "desc" : "asc" }
        : { campo, dir: o.dir === "asc" ? "desc" : "asc" },
    );
    setPagina(1);
  };

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  // Si un filtro deja menos páginas que la actual, se vuelve a la primera en vez de mostrar
  // una página vacía.
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => ordenados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [ordenados, paginaActual],
  );

  const irAPagina = (n: number) => setPagina(Math.min(totalPaginas, Math.max(1, n)));

  const confirmarPaginaEscrita = () => {
    const n = parseInt(paginaInput, 10);
    if (!Number.isNaN(n)) irAPagina(n);
    setEditandoPagina(false);
  };

  const kpis = useMemo(() => {
    const now = new Date();
    const hoy = auditLog.filter((e) => sameDay(new Date(e.createdAt), now)).length;
    const usuarios = new Set(auditLog.filter((e) => e.actorId).map((e) => e.actorId)).size;
    return [
      { l: "Total de eventos", v: auditLog.length, c: "#0E2A47" },
      { l: "Eventos de hoy", v: hoy, c: "#2D5BC8" },
      { l: "Usuarios distintos", v: usuarios, c: "#0C8576" },
    ];
  }, [auditLog]);

  const clearFiltros = () => {
    setQuery("");
    setRolFiltro("TODOS");
    setAccFiltro("TODAS");
    setPagina(1);
  };

  const rolOptions: { key: RolFiltro; label: string }[] = [
    { key: "TODOS", label: "Todos los roles" },
    { key: "ALUMNO", label: "Alumno" },
    { key: "INSTRUCTOR", label: "Instructor" },
    { key: "ADMIN", label: "Admin" },
    { key: "SISTEMA", label: "Sistema" },
  ];

  const rolBtnLabel = rolOptions.find((o) => o.key === rolFiltro)?.label ?? "Todos los roles";
  const rolActive = rolFiltro !== "TODOS";

  const accBtnLabel = accFiltro === "TODAS" ? "Todas las acciones" : accFiltro;
  const accActive = accFiltro !== "TODAS";

  /**
   * El botón "Exportar" no tenía `onClick`: era decorativo, y su `title` decía "no disponible
   * en este demo". Ahora exporta a PDF lo **filtrado**, no la tabla entera — un registro de
   * auditoría que exporta algo distinto de lo que se está mirando no sirve como respaldo.
   */
  const generarPdf = (alcance: "pagina" | "todo") => {
    const filas = alcance === "pagina" ? visibles : ordenados;

    const ok = exportarPdf({
      titulo: "Registro de auditoría y trazabilidad",
      subtitulo: "Listado inalterable de las operaciones del sistema",
      meta: [
        { etiqueta: "Emitido", valor: new Date().toLocaleString("es-AR") },
        {
          etiqueta: "Alcance",
          valor:
            alcance === "pagina"
              ? `Página ${paginaActual} de ${totalPaginas} · ${filas.length} eventos`
              : `${filas.length} eventos (todos los filtrados)`,
        },
        { etiqueta: "Total registrado", valor: String(auditLog.length) },
        { etiqueta: "Rol", valor: rolBtnLabel },
        { etiqueta: "Acción", valor: accBtnLabel },
        { etiqueta: "Búsqueda", valor: query.trim() || "sin filtro" },
      ],
      columnas: [
        { encabezado: "Fecha y hora", ancho: "13%", valor: (e) => `${formatFecha(e.createdAt)} ${formatHora(e.createdAt)}` },
        { encabezado: "Usuario", ancho: "17%", valor: (e) => `${e.nombre} (${ROL_LABEL[e.rol]})` },
        { encabezado: "Acción", ancho: "17%", valor: (e) => e.accion },
        { encabezado: "Entidad", ancho: "12%", valor: (e) => e.entidad },
        { encabezado: "ID de entidad", ancho: "20%", valor: (e) => e.entidadId },
        { encabezado: "Detalle", ancho: "21%", valor: (e) => e.descripcion },
      ],
      filas,
      pie: "Documento generado por ActiveHub a partir del registro de auditoría. Uso interno / confidencial.",
    });
    if (!ok) {
      setError("El navegador bloqueó la ventana de exportación. Habilitá las ventanas emergentes para este sitio.");
    }
  };

  /**
   * Por qué la confirmación de "Exportar todo" es un modal propio y no `window.confirm`.
   *
   * <p>`exportarPdf` abre una pestaña con `window.open`, y eso el navegador sólo lo permite
   * mientras dura la **activación de usuario** del click. `window.confirm` es un diálogo modal
   * del navegador: al cerrarlo esa activación ya se consumió, así que el `window.open` que
   * venía después salía bloqueado y no pasaba absolutamente nada. Por eso "Exportar esta
   * página" —que no confirma nada— funcionaba y "Exportar todo" no.
   *
   * <p>Con un modal de la propia app, el click en "Exportar" es un gesto de usuario nuevo y el
   * `window.open` sale desde adentro de su handler, igual que en el otro botón.
   */
  const exportar = (alcance: "pagina" | "todo") => {
    if (alcance === "todo" && ordenados.length > POR_PAGINA) {
      setConfirmarExport(true);
      return;
    }
    generarPdf(alcance);
  };

  const navBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      className="ah-btn"
      onClick={onClick}
      disabled={disabled}
      style={s(
        `background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:9px 14px;font:700 12.5px Manrope,sans-serif;color:${disabled ? "#C2CCD6" : "#41566B"};cursor:${disabled ? "default" : "pointer"};`,
      )}
    >
      {label}
    </button>
  );

  return (
    <DashLayout role="admin" active="trazabilidad">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <div style={s("display:flex;align-items:center;gap:9px;")}>
            <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Registro de auditoría y trazabilidad</h1>
          </div>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Listado inalterable de todas las operaciones del sistema. Buscá por palabra clave y filtrá por rol o tipo de acción.
          </p>
        </div>
        <div style={s("margin-left:auto;display:flex;gap:9px;flex-wrap:wrap;")}>
          <button
            className="ah-btn"
            onClick={() => exportar("pagina")}
            title="Exporta a PDF sólo los eventos de esta página"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            Exportar esta página
          </button>
          <button
            className="ah-btn"
            onClick={() => exportar("todo")}
            title="Exporta a PDF todos los eventos que pasan los filtros actuales"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#65788C;cursor:pointer;display:flex;align-items:center;gap:7px;",
            )}
          >
            Exportar todo ({filtered.length})
          </button>
        </div>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}

        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;")}>
          {kpis.map((k) => (
            <div key={k.l} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px;")}>
              <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>{k.l}</div>
              <div style={s(`font:700 26px Space Grotesk,sans-serif;color:${k.c};`)}>{k.v}</div>
            </div>
          ))}
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;margin-bottom:18px;")}>
          <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap;")}>
            <div
              style={s(
                "flex:1;min-width:240px;display:flex;align-items:center;gap:10px;background:#F4F7FA;border:1px solid #E2E9F0;border-radius:11px;padding:11px 14px;",
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#90A1B2" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPagina(1); }}
                placeholder="Buscar por usuario, entidad, acción o palabra clave…"
                style={s("border:none;outline:none;background:transparent;font:600 14px Manrope,sans-serif;color:#0E2A47;width:100%;")}
              />
            </div>

            <div style={s("position:relative;")}>
              <button
                onClick={() => {
                  setRolOpen((v) => !v);
                  setAccOpen(false);
                }}
                className="ah-btn"
                style={s(
                  `display:flex;align-items:center;gap:8px;background:${rolActive ? "#EAF1FE" : "#fff"};color:${rolActive ? "#2D5BC8" : "#41566B"};border:1px solid ${rolActive ? "#D5E2FB" : "#E2E9F0"};border-radius:11px;padding:11px 14px;font:700 13px Manrope,sans-serif;cursor:pointer;white-space:nowrap;`,
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
                {rolBtnLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {rolOpen && (
                <>
                  <div onClick={() => setRolOpen(false)} style={s("position:fixed;inset:0;z-index:20;")} />
                  <div
                    style={s(
                      "position:absolute;top:calc(100% + 6px);left:0;min-width:210px;background:#fff;border:1px solid #E2E9F0;border-radius:12px;box-shadow:0 12px 32px rgba(14,42,71,.18);padding:6px;z-index:30;",
                    )}
                  >
                    {rolOptions.map((o) => (
                      <div
                        key={o.key}
                        onClick={() => {
                          setRolFiltro(o.key);
                          setPagina(1);
                          setRolOpen(false);
                        }}
                        className="ah-btn"
                        style={s(
                          `cursor:pointer;padding:9px 12px;border-radius:8px;font:700 13px Manrope,sans-serif;background:${rolFiltro === o.key ? "#F4F7FA" : "transparent"};color:${rolFiltro === o.key ? "#0E2A47" : "#41566B"};`,
                        )}
                      >
                        {o.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={s("position:relative;")}>
              <button
                onClick={() => {
                  setAccOpen((v) => !v);
                  setRolOpen(false);
                }}
                className="ah-btn"
                style={s(
                  `display:flex;align-items:center;gap:8px;background:${accActive ? "#EAF1FE" : "#fff"};color:${accActive ? "#2D5BC8" : "#41566B"};border:1px solid ${accActive ? "#D5E2FB" : "#E2E9F0"};border-radius:11px;padding:11px 14px;font:700 13px Manrope,sans-serif;cursor:pointer;white-space:nowrap;`,
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
                </svg>
                {accBtnLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {accOpen && (
                <>
                  <div onClick={() => setAccOpen(false)} style={s("position:fixed;inset:0;z-index:20;")} />
                  <div
                    style={s(
                      "position:absolute;top:calc(100% + 6px);left:0;min-width:220px;max-height:280px;overflow-y:auto;background:#fff;border:1px solid #E2E9F0;border-radius:12px;box-shadow:0 12px 32px rgba(14,42,71,.18);padding:6px;z-index:30;",
                    )}
                  >
                    <div
                      onClick={() => {
                        setAccFiltro("TODAS");
                        setPagina(1);
                        setAccOpen(false);
                      }}
                      className="ah-btn"
                      style={s(
                        `display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 12px;border-radius:8px;font:700 13px Manrope,sans-serif;background:${accFiltro === "TODAS" ? "#F4F7FA" : "transparent"};color:${accFiltro === "TODAS" ? "#0E2A47" : "#41566B"};`,
                      )}
                    >
                      <span style={s("width:8px;height:8px;border-radius:99px;flex:none;background:#90A1B2;")} />
                      Todas las acciones
                    </div>
                    {accionesUnicas.map((acc) => {
                      const [, , , dot] = accionStyle(acc);
                      return (
                        <div
                          key={acc}
                          onClick={() => {
                            setAccFiltro(acc);
                            setPagina(1);
                            setAccOpen(false);
                          }}
                          className="ah-btn"
                          style={s(
                            `display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 12px;border-radius:8px;font:700 13px Manrope,sans-serif;background:${accFiltro === acc ? "#F4F7FA" : "transparent"};color:${accFiltro === acc ? "#0E2A47" : "#41566B"};`,
                          )}
                        >
                          <span style={s(`width:8px;height:8px;border-radius:99px;flex:none;background:${dot};`)} />
                          {acc}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={s("margin-top:13px;padding-top:13px;border-top:1px solid #F1F4F8;display:flex;align-items:center;gap:12px;")}>
            <span style={s("font:700 12.5px Manrope,sans-serif;color:#90A1B2;")}>
              {filtered.length} de {auditLog.length} eventos
              {totalPaginas > 1 && ` · mostrando ${visibles.length} en esta página`}
            </span>
            <button
              onClick={clearFiltros}
              className="ah-btn"
              style={s("margin-left:auto;background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:9px 14px;font:700 12.5px Manrope,sans-serif;color:#65788C;cursor:pointer;")}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:980px;")}>
              <div
                style={s(
                  `display:grid;${GRID_COLUMNAS}gap:14px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;`,
                )}
              >
                {COLUMNAS.map((c) => {
                  const activa = orden?.campo === c.campo;
                  const asc = activa && orden.dir === "asc";
                  return (
                    <button
                      key={c.campo}
                      type="button"
                      onClick={() => toggleOrden(c.campo)}
                      title={`Ordenar por ${c.label}`}
                      style={s(
                        `display:flex;align-items:center;gap:5px;justify-self:start;background:none;border:none;padding:0;margin:0;cursor:pointer;font:inherit;text-transform:inherit;letter-spacing:inherit;color:${activa ? "#2D5BC8" : "#90A1B2"};`,
                      )}
                    >
                      {c.label}
                      {/* La flecha sólo se pinta en la columna por la que se está ordenando:
                          marcarlas todas convierte el encabezado en ruido. */}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        style={{ opacity: activa ? 1 : 0.28, transform: asc ? "rotate(180deg)" : "none" }}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              {visibles.map((l) => {
                const [rolBg, rolFg] = ROL_STYLE[l.rol];
                const [accBg, accFg, accBd] = accionStyle(l.accion);
                // "Detalle" es la descripción legible que arma el backend (ver
                // DescripcionAuditoria). El id de la entidad tiene su propia columna, así que la
                // evidencia técnica no se pierde: lo que se sacó de acá es el texto crudo, que
                // era un UUID seguido de una clave de permiso y no le decía nada a nadie.
                const detalle = l.descripcion;
                return (
                  <div
                    key={l.id}
                    className="ah-row"
                    style={s(`display:grid;${GRID_COLUMNAS}gap:14px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;`)}
                  >
                    <span style={s("font:700 12px ui-monospace,Menlo,monospace;color:#0E2A47;line-height:1.5;")}>
                      {formatFecha(l.createdAt)}
                      <br />
                      <span style={s("color:#90A1B2;font-weight:600;")}>{formatHora(l.createdAt)}</span>
                    </span>
                    <div style={s("display:flex;align-items:center;gap:9px;min-width:0;")}>
                      <span
                        style={s(
                          `width:30px;height:30px;flex:none;border-radius:99px;background:${rolBg};color:${rolFg};display:flex;align-items:center;justify-content:center;font:700 12px Space Grotesk,sans-serif;`,
                        )}
                      >
                        {l.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span style={s("min-width:0;")}>
                        <span style={s("display:block;font:700 13px Manrope,sans-serif;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>
                          {l.nombre}
                        </span>
                        <span style={s("font-size:11px;color:#90A1B2;font-weight:600;")}>{ROL_LABEL[l.rol]}</span>
                      </span>
                    </div>
                    <span
                      title={l.accion}
                      style={s(
                        `justify-self:start;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 11.5px Manrope,sans-serif;padding:4px 11px;border-radius:99px;background:${accBg};color:${accFg};border:1px solid ${accBd};`,
                      )}
                    >
                      {l.accion}
                    </span>
                    <span
                      title={l.entidad}
                      style={s("min-width:0;font:700 12.5px Manrope,sans-serif;color:#33485E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}
                    >
                      {l.entidad}
                    </span>
                    <span
                      title={detalle}
                      style={s("min-width:0;font-size:12.5px;color:#65788C;font-weight:600;line-height:1.45;word-break:break-word;")}
                    >
                      {detalle}
                    </span>
                  </div>
                );
              })}
              {visibles.length === 0 && (
                <div style={s("padding:46px 22px;text-align:center;")}>
                  <div style={s("font:700 15px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>Sin resultados</div>
                  <div style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>No se encontraron operaciones con esos criterios de búsqueda.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {totalPaginas > 1 && (
          <div
            style={s(
              "margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;",
            )}
          >
            {/*
              "Primera" y "Última" existen porque con cientos de páginas volver al principio a
              fuerza de "Anterior" no es navegación. Por la misma razón el número del medio es
              un input: se hace click y se escribe la página a la que se quiere ir.
            */}
            {navBtn("« Primera", () => irAPagina(1), paginaActual === 1)}
            {navBtn("Anterior", () => irAPagina(paginaActual - 1), paginaActual === 1)}
            <span style={s("display:flex;align-items:center;gap:6px;font:700 12.5px Manrope,sans-serif;color:#65788C;")}>
              Página
              {editandoPagina ? (
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={totalPaginas}
                  value={paginaInput}
                  onChange={(e) => setPaginaInput(e.target.value)}
                  onBlur={confirmarPaginaEscrita}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmarPaginaEscrita();
                    if (e.key === "Escape") setEditandoPagina(false);
                  }}
                  style={s(
                    "width:64px;text-align:center;border:1.5px solid #2D5BC8;border-radius:8px;padding:6px 4px;font:700 12.5px Manrope,sans-serif;color:#0E2A47;outline:none;",
                  )}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPaginaInput(String(paginaActual));
                    setEditandoPagina(true);
                  }}
                  title="Escribir el número de página"
                  className="ah-btn"
                  style={s(
                    "background:#fff;border:1px solid #E2E9F0;border-radius:8px;padding:6px 12px;font:700 12.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
                  )}
                >
                  {paginaActual}
                </button>
              )}
              de {totalPaginas}
            </span>
            {navBtn("Siguiente", () => irAPagina(paginaActual + 1), paginaActual === totalPaginas)}
            {navBtn("Última »", () => irAPagina(totalPaginas), paginaActual === totalPaginas)}
          </div>
        )}

        <div style={s("margin-top:16px;display:flex;align-items:center;gap:12px;background:#F6F9FC;border:1px solid #EAF0F6;border-radius:12px;padding:14px 18px;")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B45C8" strokeWidth={2} style={{ flex: "none" }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span style={s("font-size:12.5px;color:#5A6B7D;font-weight:600;line-height:1.5;")}>
            Registro inalterable: cada operación crítica guarda quién la ejecutó, cuándo y sobre qué entidad. La trazabilidad garantiza integridad y no
            repudio para justificar reintegros, penalizaciones e inhabilitaciones con respaldo legal.
          </span>
        </div>
      </div>

      {confirmarExport && (
        <Modal onClose={() => setConfirmarExport(false)}>
          <div
            style={s(
              "background:#fff;border-radius:18px;padding:24px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(14,42,71,.25);",
            )}
          >
            <div style={s("font:700 17px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:8px;")}>
              Exportar {ordenados.length} eventos
            </div>
            <p style={s("font-size:13.5px;color:#65788C;font-weight:600;line-height:1.55;margin:0 0 18px;")}>
              Son {totalPaginas} páginas de la tabla. Con muchos registros el documento puede tardar unos segundos
              en abrirse.
            </p>
            <div style={s("display:flex;gap:10px;justify-content:flex-end;")}>
              <button
                className="ah-btn"
                onClick={() => setConfirmarExport(false)}
                style={s(
                  "background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;color:#65788C;cursor:pointer;",
                )}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={() => {
                  setConfirmarExport(false);
                  generarPdf("todo");
                }}
                style={s(
                  "background:#0FB8A9;border:none;border-radius:11px;padding:10px 18px;font:700 13px Manrope,sans-serif;color:#fff;cursor:pointer;",
                )}
              >
                Exportar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashLayout>
  );
}
