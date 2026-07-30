import { useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { auditLog, formatFecha, formatHora } from "../../lib/mockData";
import type { RolNombre } from "../../lib/types";

type RolFiltro = RolNombre | "SISTEMA" | "TODOS";

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

function pseudoIp(seed: string): string {
  const h = hashStr(seed);
  return `192.168.${(h >> 8) % 255}.${h % 255}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AdminTrazabilidad() {
  const { users } = useAuth();
  const [query, setQuery] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>("TODOS");
  const [accFiltro, setAccFiltro] = useState<string>("TODAS");
  const [rolOpen, setRolOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);

  const accionesUnicas = useMemo(() => Array.from(new Set(auditLog.map((e) => e.accion))).sort(), []);

  const entries = useMemo(
    () =>
      auditLog.map((e) => {
        const actor = e.actorId ? users.find((u) => u.id === e.actorId) : undefined;
        const rol: RolNombre | "SISTEMA" = e.actorId === null ? "SISTEMA" : actor?.rol ?? "SISTEMA";
        const nombre = actor ? `${actor.nombre} ${actor.apellido}` : e.actorNombre;
        return { ...e, rol, nombre };
      }),
    [users],
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

  const kpis = useMemo(() => {
    const now = new Date();
    const hoy = auditLog.filter((e) => sameDay(new Date(e.timestamp), now)).length;
    const usuarios = new Set(auditLog.filter((e) => e.actorId).map((e) => e.actorId)).size;
    return [
      { l: "Total de eventos", v: auditLog.length, c: "#0E2A47" },
      { l: "Eventos de hoy", v: hoy, c: "#2D5BC8" },
      { l: "Usuarios distintos", v: usuarios, c: "#0C8576" },
    ];
  }, []);

  const clearFiltros = () => {
    setQuery("");
    setRolFiltro("TODOS");
    setAccFiltro("TODAS");
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
        <button
          className="ah-btn"
          title="Exportación no disponible en este demo"
          style={s(
            "margin-left:auto;background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:10px 15px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          Exportar
        </button>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
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
                onChange={(e) => setQuery(e.target.value)}
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
            <div style={s("min-width:900px;")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:148px 1.5fr 124px 1.4fr 2.3fr 104px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Fecha y hora</span>
                <span>Usuario</span>
                <span>Acción</span>
                <span>Entidad</span>
                <span>Detalle</span>
                <span>IP</span>
              </div>
              {filtered.map((l) => {
                const [rolBg, rolFg] = ROL_STYLE[l.rol];
                const [accBg, accFg, accBd] = accionStyle(l.accion);
                const detalle = `${l.entidad} · ${l.entidadId}${l.metadata ? " · " + l.metadata : ""}`;
                return (
                  <div
                    key={l.id}
                    className="ah-row"
                    style={s("display:grid;grid-template-columns:148px 1.5fr 124px 1.4fr 2.3fr 104px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                  >
                    <span style={s("font:700 12px ui-monospace,Menlo,monospace;color:#0E2A47;line-height:1.5;")}>
                      {formatFecha(l.timestamp)}
                      <br />
                      <span style={s("color:#90A1B2;font-weight:600;")}>{formatHora(l.timestamp)}</span>
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
                      style={s(
                        `justify-self:start;font:700 11.5px Manrope,sans-serif;padding:4px 11px;border-radius:99px;background:${accBg};color:${accFg};border:1px solid ${accBd};`,
                      )}
                    >
                      {l.accion}
                    </span>
                    <span style={s("font:700 12.5px Manrope,sans-serif;color:#33485E;")}>{l.entidad}</span>
                    <span style={s("font-size:12.5px;color:#65788C;font-weight:600;line-height:1.45;")}>{detalle}</span>
                    <span style={s("font:600 11.5px ui-monospace,Menlo,monospace;color:#90A1B2;")}>{pseudoIp(l.id)}</span>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={s("padding:46px 22px;text-align:center;")}>
                  <div style={s("font:700 15px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>Sin resultados</div>
                  <div style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>No se encontraron operaciones con esos criterios de búsqueda.</div>
                </div>
              )}
            </div>
          </div>
        </div>

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
    </DashLayout>
  );
}
