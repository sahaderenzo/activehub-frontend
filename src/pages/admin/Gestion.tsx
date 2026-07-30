import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import type { StoredUsuario } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { denunciaStatusType } from "../../lib/status";
import { formatFecha, getCategoria, getTipoActividad } from "../../lib/mockData";

type Tab = "usuarios" | "instructores" | "actividades" | "reclamos";

const TABS: { key: Tab; label: string }[] = [
  { key: "usuarios", label: "Usuarios" },
  { key: "instructores", label: "Instructores" },
  { key: "actividades", label: "Actividades" },
  { key: "reclamos", label: "Reclamos" },
];

const AVATAR_PALETTE: [string, string][] = [
  ["#E7F8F5", "#0C8576"],
  ["#EAF1FE", "#2D5BC8"],
  ["#FFF3E0", "#B9741A"],
  ["#EFEAFB", "#6A3FC4"],
];

function avatarColor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export default function AdminGestion() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: Tab = (["usuarios", "instructores", "actividades", "reclamos"] as const).includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "usuarios";

  const { users, updateUsuario } = useAuth();
  const { actividades, eliminarActividad, denuncias, inscripciones, pagos, actualizarEstadoDenuncia } = useData();
  const [query, setQuery] = useState("");

  const goTab = (t: Tab) => navigate(`/admin/gestion/${t}`);

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const instructores = useMemo(() => users.filter((u) => u.rol === "INSTRUCTOR"), [users]);

  const toggleSuspender = (u: StoredUsuario) => {
    updateUsuario(u.id, { estado: u.estado === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO" });
  };

  const aprobarInstructor = (u: StoredUsuario) => {
    if (!u.perfilInstructor) return;
    updateUsuario(u.id, { perfilInstructor: { ...u.perfilInstructor, estadoVerificacion: "APROBADO", motivoRechazo: undefined } });
  };

  const rechazarInstructor = (u: StoredUsuario) => {
    if (!u.perfilInstructor) return;
    updateUsuario(u.id, { perfilInstructor: { ...u.perfilInstructor, estadoVerificacion: "RECHAZADO" } });
  };

  const montoDenuncia = (alumnoId: string, claseId: string): number | null => {
    const insc = inscripciones.find((i) => i.alumnoId === alumnoId && i.claseId === claseId);
    if (!insc?.pagoId) return null;
    const pago = pagos.find((p) => p.id === insc.pagoId);
    return pago ? pago.monto : null;
  };

  return (
    <DashLayout role="admin" active="gestionadmin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Gestión administrativa</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Administrá usuarios, instructores, actividades y reclamos.</p>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
        <div style={s("display:flex;gap:4px;border-bottom:1px solid #E2E9F0;margin-bottom:22px;flex-wrap:wrap;")}>
          {TABS.map((t) => (
            <span
              key={t.key}
              onClick={() => goTab(t.key)}
              className="ah-btn"
              style={s(
                `padding:13px 18px;cursor:pointer;font:700 14px Manrope,sans-serif;color:${tab === t.key ? "#0E2A47" : "#90A1B2"};border-bottom:2.5px solid ${tab === t.key ? "#FF6A2B" : "transparent"};margin-bottom:-1px;`,
              )}
            >
              {t.label}
            </span>
          ))}
        </div>

        {tab === "usuarios" && (
          <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:18px;")}>
            <div
              style={s(
                "flex:1;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E2E9F0;border-radius:12px;padding:11px 15px;max-width:340px;",
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                style={s("border:none;outline:none;background:transparent;font:600 13.5px Manrope,sans-serif;color:#0E2A47;width:100%;")}
              />
            </div>
          </div>
        )}

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          {tab === "usuarios" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:760px;")}>
                <div
                  className="ah-grid-5"
                  style={s(
                    "display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr 150px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Usuario</span>
                  <span>Rol</span>
                  <span>Registro</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>
                {usuariosFiltrados.map((u) => {
                  const [avBg, avFg] = avatarColor(u.id);
                  return (
                    <div
                      key={u.id}
                      className="ah-grid-5"
                      style={s("display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr 150px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <div style={s("display:flex;align-items:center;gap:11px;")}>
                        <span
                          style={s(
                            `width:38px;height:38px;border-radius:99px;background:${avBg};color:${avFg};display:flex;align-items:center;justify-content:center;font:700 14px Space Grotesk,sans-serif;flex:none;`,
                          )}
                        >
                          {initials(u.nombre, u.apellido)}
                        </span>
                        <div>
                          <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>
                            {u.nombre} {u.apellido}
                          </div>
                          <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>{u.email}</div>
                        </div>
                      </div>
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{u.rol}</span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(u.createdAt)}</span>
                      <StatusBadge type={u.estado === "ACTIVO" ? "activo" : "suspendido"} />
                      <div style={s("display:flex;gap:7px;")}>
                        <button
                          className="ah-btn"
                          onClick={() => navigate(`/admin/validar-instructor/${u.id}`)}
                          style={s("background:#EEF4FB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#2D5BC8;cursor:pointer;")}
                          title={u.rol === "INSTRUCTOR" ? "Ver ficha" : "Detalle no disponible"}
                          disabled={u.rol !== "INSTRUCTOR"}
                        >
                          Ver
                        </button>
                        <button
                          className="ah-btn"
                          onClick={() => toggleSuspender(u)}
                          style={s(
                            `background:${u.estado === "ACTIVO" ? "#FBEAEB" : "#E7F8F5"};border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:${u.estado === "ACTIVO" ? "#BE3A3E" : "#0C8576"};cursor:pointer;`,
                          )}
                        >
                          {u.estado === "ACTIVO" ? "Suspender" : "Reactivar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>Sin resultados.</div>
                )}
              </div>
            </div>
          )}

          {tab === "instructores" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:820px;")}>
                <div
                  style={s(
                    "display:grid;grid-template-columns:2fr 1fr 1fr 160px 160px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Instructor</span>
                  <span>Especialidad</span>
                  <span>Validación</span>
                  <span>Información</span>
                  <span>Acciones</span>
                </div>
                {instructores.map((ins) => {
                  const [avBg, avFg] = avatarColor(ins.id);
                  const estado = ins.perfilInstructor?.estadoVerificacion ?? "PENDIENTE";
                  const badgeType = estado === "APROBADO" ? "validado" : estado === "RECHAZADO" ? "rechazado" : "revision";
                  return (
                    <div
                      key={ins.id}
                      style={s("display:grid;grid-template-columns:2fr 1fr 1fr 160px 160px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <div style={s("display:flex;align-items:center;gap:11px;")}>
                        <span
                          style={s(
                            `width:38px;height:38px;border-radius:99px;background:${avBg};color:${avFg};display:flex;align-items:center;justify-content:center;font:700 14px Space Grotesk,sans-serif;flex:none;`,
                          )}
                        >
                          {initials(ins.nombre, ins.apellido)}
                        </span>
                        <div>
                          <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>
                            {ins.nombre} {ins.apellido}
                          </div>
                          <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>{ins.email}</div>
                        </div>
                      </div>
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{ins.perfilInstructor?.especialidad ?? "—"}</span>
                      <StatusBadge type={badgeType} />
                      <button
                        className="ah-btn"
                        onClick={() => navigate(`/admin/validar-instructor/${ins.id}`)}
                        style={s(
                          "justify-self:start;background:#fff;border:1px solid #D6DEE7;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:6px;",
                        )}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Ver información
                      </button>
                      {estado === "PENDIENTE" ? (
                        <div style={s("display:flex;gap:7px;")}>
                          <button
                            className="ah-btn"
                            onClick={() => aprobarInstructor(ins)}
                            style={s("background:#E7F8F5;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#0C8576;cursor:pointer;")}
                          >
                            Aprobar
                          </button>
                          <button
                            className="ah-btn"
                            onClick={() => rechazarInstructor(ins)}
                            style={s("background:#FBEAEB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span
                          style={s(
                            `font:700 12px Manrope,sans-serif;color:${estado === "APROBADO" ? "#0C8576" : "#BE3A3E"};background:${estado === "APROBADO" ? "#E7F8F5" : "#FBEAEB"};border-radius:8px;padding:7px 12px;width:fit-content;`,
                          )}
                        >
                          {estado === "APROBADO" ? "Validado" : "Rechazado"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {instructores.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay instructores registrados.</div>
                )}
              </div>
            </div>
          )}

          {tab === "actividades" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:780px;")}>
                <div
                  style={s(
                    "display:grid;grid-template-columns:2fr 1fr 1fr 1fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Actividad</span>
                  <span>Instructor</span>
                  <span>Categoría</span>
                  <span>Precio</span>
                  <span>Acciones</span>
                </div>
                {actividades.map((act) => {
                  const instructor = users.find((u) => u.id === act.instructorId);
                  const tipo = getTipoActividad(act.tipoActividadId);
                  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
                  return (
                    <div
                      key={act.id}
                      style={s("display:grid;grid-template-columns:2fr 1fr 1fr 1fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{act.nombre}</span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>
                        {instructor ? `${instructor.nombre} ${instructor.apellido}` : "—"}
                      </span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{cat?.nombre ?? "—"}</span>
                      <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>${act.precio.toLocaleString("es-AR")}</span>
                      <div style={s("display:flex;gap:7px;")}>
                        <button
                          className="ah-btn"
                          disabled
                          title="Próximamente"
                          style={s("background:#EEF4FB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#2D5BC8;cursor:not-allowed;opacity:.6;")}
                        >
                          Editar
                        </button>
                        <button
                          className="ah-btn"
                          onClick={() => {
                            if (window.confirm(`¿Quitar la actividad "${act.nombre}"?`)) eliminarActividad(act.id);
                          }}
                          style={s("background:#FBEAEB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {actividades.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay actividades cargadas.</div>
                )}
              </div>
            </div>
          )}

          {tab === "reclamos" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:820px;")}>
                <div
                  style={s(
                    "display:grid;grid-template-columns:1fr 1.3fr 2fr 1fr 1fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>ID</span>
                  <span>Usuario</span>
                  <span>Motivo</span>
                  <span>Monto</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>
                {denuncias.map((d) => {
                  const user = users.find((u) => u.id === d.alumnoId);
                  const monto = montoDenuncia(d.alumnoId, d.claseId);
                  return (
                    <div
                      key={d.id}
                      style={s("display:grid;grid-template-columns:1fr 1.3fr 2fr 1fr 1fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <span style={s("font:700 12.5px ui-monospace,Menlo,monospace;color:#0E2A47;")}>{d.id}</span>
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{user ? `${user.nombre} ${user.apellido}` : "—"}</span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.motivo}</span>
                      <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>{monto != null ? `$${monto.toLocaleString("es-AR")}` : "—"}</span>
                      <StatusBadge type={denunciaStatusType(d.estado)} />
                      <div style={s("display:flex;gap:7px;")}>
                        <button
                          className="ah-btn"
                          disabled={d.estado === "Resuelta"}
                          onClick={() => actualizarEstadoDenuncia(d.id, "Resuelta")}
                          style={s(
                            `background:#E7F8F5;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#0C8576;cursor:pointer;${d.estado === "Resuelta" ? "opacity:.5;cursor:not-allowed;" : ""}`,
                          )}
                        >
                          Reintegrar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {denuncias.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay reclamos registrados.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  );
}
