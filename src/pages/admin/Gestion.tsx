import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { AccionResolucion, DenunciaAdmin, InstructorAdmin, ReseniaPendiente, UsuarioAdmin, RolAdmin } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { denunciaStatusType } from "../../lib/status";
import { formatFecha } from "../../lib/mockData";
import type { RolNombre } from "../../lib/types";

type Tab = "usuarios" | "instructores" | "actividades" | "reclamos" | "resenas";

const TABS: { key: Tab; label: string }[] = [
  { key: "usuarios", label: "Usuarios" },
  { key: "instructores", label: "Instructores" },
  { key: "actividades", label: "Actividades" },
  { key: "reclamos", label: "Reclamos" },
  { key: "resenas", label: "Reseñas" },
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Espejo de `VentanaPenalizacion.MINIMO_DIAS_SUSPENSION` del backend. Si cambia allá, cambialo acá. */
const MIN_DIAS_SUSPENSION = 15;

interface SuspensionEnCurso {
  denuncia: DenunciaAdmin;
  dias: string;
  monto: string;
  detalle: string;
}

const ETIQUETA_ACCION: Record<AccionResolucion, string> = {
  REINTEGRAR: "Reintegrar el pago",
  SUSPENDER: "Suspender al instructor",
  PENALIZAR: "Penalizar al instructor",
  DESESTIMAR: "Desestimar",
  OCULTAR_RESENIA: "Ocultar la reseña",
};

/**
 * Qué se puede hacer según qué se denunció. Sobre una reseña no aplican las acciones que
 * tocan el pago o al instructor: el backend las rechaza con 400, así que tampoco se ofrecen.
 */
const ACCIONES_POR_TIPO: Record<DenunciaAdmin["tipo"], AccionResolucion[]> = {
  CLASE: ["REINTEGRAR", "SUSPENDER", "PENALIZAR", "DESESTIMAR"],
  RESENIA: ["OCULTAR_RESENIA", "DESESTIMAR"],
};

interface EdicionUsuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  /** Rol elegido en el selector. Se guarda aparte porque tiene su propio endpoint y sus guardas. */
  rolId: string;
  rolIdOriginal: string;
}

export default function AdminGestion() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: Tab = (["usuarios", "instructores", "actividades", "reclamos", "resenas"] as const).includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "usuarios";

  const { currentUser } = useAuth();
  const {
    actividades,
    eliminarActividad,
    listarDenunciasAdmin,
    resolverDenuncia,
    instructorNombre,
    getTipoActividad,
    getCategoria,
    listarInstructores,
    aprobarInstructor: aprobarInstructorReal,
    rechazarInstructor: rechazarInstructorReal,
    listarResenasPendientes,
    aprobarResenia: aprobarReseniaReal,
    rechazarResenia: rechazarReseniaReal,
    listarUsuariosAdmin,
    actualizarEstadoUsuario,
    actualizarUsuarioAdmin,
    listarRolesPermisos,
    asignarRolUsuario,
  } = useData();
  const [query, setQuery] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolNombre | "todos">("todos");
  const [queryActividades, setQueryActividades] = useState("");
  const [instructores, setInstructores] = useState<InstructorAdmin[]>([]);
  const [errorInstructores, setErrorInstructores] = useState<string | null>(null);
  const [resenas, setResenas] = useState<ReseniaPendiente[]>([]);
  const [errorResenas, setErrorResenas] = useState<string | null>(null);
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[]>([]);
  const [errorDenuncias, setErrorDenuncias] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [errorActividades, setErrorActividades] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<EdicionUsuario | null>(null);
  // Los roles asignables salen de la API: incluyen los que el admin creó en "Roles y permisos".
  const [rolesAsignables, setRolesAsignables] = useState<RolAdmin[]>([]);
  // Suspender ya no es un botón directo: pide plazo y monto (E4Ad-HU07).
  const [suspension, setSuspension] = useState<SuspensionEnCurso | null>(null);
  const [errorSuspension, setErrorSuspension] = useState<string | null>(null);
  const [guardandoSuspension, setGuardandoSuspension] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const goTab = (t: Tab) => navigate(`/admin/gestion/${t}`);

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideQuery = !q || `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const coincideRol = rolFiltro === "todos" || u.rol === rolFiltro;
      return coincideQuery && coincideRol;
    });
  }, [usuarios, query, rolFiltro]);

  const actividadesFiltradas = useMemo(() => {
    const q = queryActividades.trim().toLowerCase();
    if (!q) return actividades;
    return actividades.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [actividades, queryActividades]);

  const cargarInstructores = () => {
    listarInstructores()
      .then(setInstructores)
      .catch((err) => setErrorInstructores(err instanceof ApiError ? err.message : "No pudimos cargar los instructores."));
  };

  const cargarResenas = () => {
    listarResenasPendientes()
      .then(setResenas)
      .catch((err) => setErrorResenas(err instanceof ApiError ? err.message : "No pudimos cargar las reseñas."));
  };

  const cargarDenuncias = () => {
    listarDenunciasAdmin()
      .then(setDenuncias)
      .catch((err) => setErrorDenuncias(err instanceof ApiError ? err.message : "No pudimos cargar los reclamos."));
  };

  const cargarUsuarios = () => {
    listarUsuariosAdmin()
      .then(setUsuarios)
      .catch((err) => setErrorUsuarios(err instanceof ApiError ? err.message : "No pudimos cargar los usuarios."));
    // Los roles asignables van con el listado: el modal de edición los necesita para el
    // selector, e incluyen los que el admin creó en "Roles y permisos". Si falla, el selector
    // queda vacío y el resto de la edición sigue funcionando.
    listarRolesPermisos()
      .then((r) => setRolesAsignables(r.roles))
      .catch(() => setRolesAsignables([]));
  };

  useEffect(() => {
    if (tab === "usuarios") cargarUsuarios();
    if (tab === "instructores") cargarInstructores();
    if (tab === "resenas") cargarResenas();
    if (tab === "reclamos") cargarDenuncias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggleSuspender = async (u: UsuarioAdmin) => {
    setErrorUsuarios(null);
    try {
      await actualizarEstadoUsuario(u.id, u.estado === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO");
      cargarUsuarios();
    } catch (err) {
      setErrorUsuarios(err instanceof ApiError ? err.message : "No pudimos actualizar el estado del usuario.");
    }
  };

  // E4Ad-HU02 criterio 2: el admin puede corregir los datos de un usuario, no solo
  // suspenderlo. PUT /api/admin/usuarios/{id}.
  const abrirEdicion = (u: UsuarioAdmin) => {
    setErrorEdicion(null);
    // El listado trae el nombre del rol, no su id: se resuelve contra los roles cargados.
    const rolActual = rolesAsignables.find((r) => r.nombre === u.rol);
    setEdicion({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono ?? "",
      rolId: rolActual?.id ?? "",
      rolIdOriginal: rolActual?.id ?? "",
    });
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    setErrorEdicion(null);
    if (!edicion.nombre.trim() || !edicion.apellido.trim()) return setErrorEdicion("El nombre y el apellido son obligatorios.");
    if (!EMAIL_RE.test(edicion.email)) return setErrorEdicion("Ingresá un correo electrónico válido.");
    if (edicion.telefono && !/^\+?[0-9 ]+$/.test(edicion.telefono)) return setErrorEdicion("El teléfono debe contener solo números.");

    setGuardandoEdicion(true);
    try {
      await actualizarUsuarioAdmin(edicion.id, {
        nombre: edicion.nombre.trim(),
        apellido: edicion.apellido.trim(),
        email: edicion.email.trim(),
        telefono: edicion.telefono.trim() || undefined,
      });
      // El rol va por su propio endpoint: tiene guardas propias (no podés cambiarte el tuyo
      // ni dejar la plataforma sin administrador).
      if (edicion.rolId && edicion.rolId !== edicion.rolIdOriginal) {
        await asignarRolUsuario(edicion.id, edicion.rolId);
      }
      setEdicion(null);
      cargarUsuarios();
    } catch (err) {
      setErrorEdicion(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const confirmarSuspension = async () => {
    if (!suspension) return;
    const dias = Number(suspension.dias);
    const monto = suspension.monto.trim() === "" ? 0 : Number(suspension.monto);

    if (!Number.isInteger(dias) || dias < MIN_DIAS_SUSPENSION) {
      return setErrorSuspension(`La suspensión no puede durar menos de ${MIN_DIAS_SUSPENSION} días.`);
    }
    if (!Number.isFinite(monto) || monto < 0) {
      return setErrorSuspension("El monto no puede ser negativo. Dejalo en 0 si no querés aplicar multa.");
    }

    setErrorSuspension(null);
    setGuardandoSuspension(true);
    try {
      await resolverDenuncia(suspension.denuncia.id, "SUSPENDER", suspension.detalle, {
        montoMulta: monto,
        diasSuspension: dias,
      });
      setSuspension(null);
      cargarDenuncias();
    } catch (err) {
      setErrorSuspension(err instanceof ApiError ? err.message : "No pudimos aplicar la suspensión.");
    } finally {
      setGuardandoSuspension(false);
    }
  };

  const aprobarInstructor = async (ins: InstructorAdmin) => {
    setErrorInstructores(null);
    try {
      await aprobarInstructorReal(ins.id);
      cargarInstructores();
    } catch (err) {
      setErrorInstructores(err instanceof ApiError ? err.message : "No pudimos aprobar al instructor.");
    }
  };

  const rechazarInstructor = async (ins: InstructorAdmin) => {
    setErrorInstructores(null);
    try {
      await rechazarInstructorReal(ins.id);
      cargarInstructores();
    } catch (err) {
      setErrorInstructores(err instanceof ApiError ? err.message : "No pudimos rechazar al instructor.");
    }
  };

  const aprobarResenia = async (r: ReseniaPendiente) => {
    setErrorResenas(null);
    try {
      await aprobarReseniaReal(r.id);
      cargarResenas();
    } catch (err) {
      setErrorResenas(err instanceof ApiError ? err.message : "No pudimos aprobar la reseña.");
    }
  };

  const rechazarResenia = async (r: ReseniaPendiente) => {
    setErrorResenas(null);
    try {
      await rechazarReseniaReal(r.id);
      cargarResenas();
    } catch (err) {
      setErrorResenas(err instanceof ApiError ? err.message : "No pudimos rechazar la reseña.");
    }
  };

  const resolverReclamo = async (d: DenunciaAdmin, accion: AccionResolucion) => {
    setErrorDenuncias(null);
    // El detalle es lo que ve el denunciante junto a la resolución (E3A-HU11 criterio 7).
    const detalle = window.prompt(
      `Vas a resolver este reclamo como "${ETIQUETA_ACCION[accion]}". Podés dejarle un detalle al denunciante (opcional):`,
      "",
    );
    if (detalle === null) return;
    try {
      await resolverDenuncia(d.id, accion, detalle);
      cargarDenuncias();
    } catch (err) {
      setErrorDenuncias(err instanceof ApiError ? err.message : "No pudimos resolver el reclamo.");
    }
  };

  return (
    <DashLayout role="admin" active="gestionadmin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Gestión administrativa</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Administrá usuarios, instructores, actividades, reclamos y reseñas.</p>
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
          <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;")}>
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
            <select
              value={rolFiltro}
              onChange={(e) => setRolFiltro(e.target.value as RolNombre | "todos")}
              style={s(
                "background:#fff;border:1px solid #E2E9F0;border-radius:12px;padding:11px 15px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
              )}
            >
              <option value="todos">Todos los roles</option>
              <option value="ALUMNO">Alumno</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}

        {tab === "actividades" && (
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
                value={queryActividades}
                onChange={(e) => setQueryActividades(e.target.value)}
                placeholder="Buscar actividad…"
                style={s("border:none;outline:none;background:transparent;font:600 13.5px Manrope,sans-serif;color:#0E2A47;width:100%;")}
              />
            </div>
          </div>
        )}

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          {tab === "usuarios" && (
            <div style={s("overflow-x:auto;")}>
              {errorUsuarios && (
                <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                  <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorUsuarios}</span>
                </div>
              )}
              <div style={s("min-width:760px;")}>
                <div
                  className="ah-grid-5"
                  style={s(
                    "display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr 230px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Usuario</span>
                  <span>Rol</span>
                  <span>Registro</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>
                {usuariosFiltrados.map((u) => {
                  const esUnoMismo = u.id === currentUser?.id;
                  const [avBg, avFg] = avatarColor(u.id);
                  return (
                    <div
                      key={u.id}
                      className="ah-grid-5"
                      style={s("display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr 230px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
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
                          onClick={() => abrirEdicion(u)}
                          style={s("background:#F2F5F9;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                        >
                          Editar
                        </button>
                        <button
                          className="ah-btn"
                          onClick={() => toggleSuspender(u)}
                          disabled={esUnoMismo}
                          title={esUnoMismo ? "No podés cambiar tu propio estado" : undefined}
                          style={s(
                            `background:${u.estado === "ACTIVO" ? "#FBEAEB" : "#E7F8F5"};border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:${u.estado === "ACTIVO" ? "#BE3A3E" : "#0C8576"};cursor:pointer;${esUnoMismo ? "opacity:.5;cursor:not-allowed;" : ""}`,
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
                {errorInstructores && (
                  <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                    <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorInstructores}</span>
                  </div>
                )}
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
                  const estado = ins.estadoVerificacion;
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
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{ins.especialidad ?? "—"}</span>
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
              {errorActividades && (
                <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                  <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorActividades}</span>
                </div>
              )}
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
                {actividadesFiltradas.map((act) => {
                  const tipo = getTipoActividad(act.tipoActividadId);
                  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
                  return (
                    <div
                      key={act.id}
                      style={s("display:grid;grid-template-columns:2fr 1fr 1fr 1fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{act.nombre}</span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>
                        {instructorNombre[act.instructorId] ?? "—"}
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
                            if (!window.confirm(`¿Quitar la actividad "${act.nombre}"?`)) return;
                            setErrorActividades(null);
                            eliminarActividad(act.id).catch((err) =>
                              setErrorActividades(err instanceof ApiError ? err.message : "No pudimos quitar la actividad."),
                            );
                          }}
                          style={s("background:#FBEAEB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {actividadesFiltradas.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>
                    {actividades.length === 0 ? "No hay actividades cargadas." : "Sin resultados."}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "reclamos" && (
            <div style={s("overflow-x:auto;")}>
              {errorDenuncias && (
                <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                  <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorDenuncias}</span>
                </div>
              )}
              <div style={s("min-width:1080px;")}>
                <div
                  style={s(
                    "display:grid;grid-template-columns:90px 1.1fr 1.1fr 1.1fr 1.6fr .8fr 1fr 260px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Tipo</span>
                  <span>Denunciante</span>
                  <span>Denunciado</span>
                  <span>Actividad</span>
                  <span>Motivo</span>
                  <span>Monto</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>
                {denuncias.map((d) => {
                  const sobreResenia = d.tipo === "RESENIA";
                  // En una denuncia de reseña el "denunciado" es el alumno que la escribió,
                  // no el instructor (que acá es justamente el denunciante).
                  const denunciado = sobreResenia ? d.resenia?.autor : d.instructor;
                  const resuelta = d.estado === "Resuelta";
                  return (
                    <div
                      key={d.id}
                      style={s("display:grid;grid-template-columns:90px 1.1fr 1.1fr 1.1fr 1.6fr .8fr 1fr 260px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                    >
                      <span
                        style={s(
                          `font:700 10.5px Manrope,sans-serif;letter-spacing:.4px;padding:4px 9px;border-radius:99px;width:fit-content;${
                            sobreResenia
                              ? "background:#EFEAFB;color:#6A3FC4;"
                              : "background:#EAF1FE;color:#2D5BC8;"
                          }`,
                        )}
                      >
                        {sobreResenia ? "RESEÑA" : "CLASE"}
                      </span>
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>
                        {d.denunciante.nombre} {d.denunciante.apellido}
                      </span>
                      <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>
                        {denunciado ? `${denunciado.nombre} ${denunciado.apellido}` : "—"}
                      </span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.actividadNombre}</span>
                      <div style={s("min-width:0;")}>
                        <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.motivo}</div>
                        {d.resenia && (
                          <div style={s("margin-top:5px;font-size:12px;color:#90A1B2;font-weight:600;font-style:italic;")}>
                            “{d.resenia.comentario}” · {d.resenia.puntaje}★
                          </div>
                        )}
                        {resuelta && d.resolucion && (
                          <div style={s("margin-top:5px;font-size:12px;color:#0C8576;font-weight:700;")}>
                            {ETIQUETA_ACCION[d.resolucion]}
                            {d.detalle ? ` · ${d.detalle}` : ""}
                          </div>
                        )}
                      </div>
                      <span style={s("font:700 14px Space Grotesk,sans-serif;color:#0E2A47;")}>
                        {d.pago ? `$${d.pago.monto.toLocaleString("es-AR")}` : "—"}
                      </span>
                      <StatusBadge type={denunciaStatusType(d.estado)} />
                      <div style={s("display:flex;gap:7px;flex-wrap:wrap;")}>
                        {resuelta ? (
                          <span style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>Caso cerrado</span>
                        ) : (
                          // Antes el único botón era "Reintegrar": las otras tres acciones que
                          // el backend soporta no tenían forma de dispararse desde la UI.
                          ACCIONES_POR_TIPO[d.tipo].map((accion) => (
                            <button
                              key={accion}
                              className="ah-btn"
                              onClick={() => resolverReclamo(d, accion)}
                              style={s(
                                `border:none;border-radius:8px;padding:7px 11px;font:700 11.5px Manrope,sans-serif;cursor:pointer;${
                                  accion === "DESESTIMAR"
                                    ? "background:#EEF2F6;color:#65788C;"
                                    : accion === "REINTEGRAR"
                                      ? "background:#E7F8F5;color:#0C8576;"
                                      : "background:#FBEAEB;color:#BE3A3E;"
                                }`,
                              )}
                            >
                              {ETIQUETA_ACCION[accion]}
                            </button>
                          ))
                        )}
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

          {tab === "resenas" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:900px;")}>
                {errorResenas && (
                  <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                    <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorResenas}</span>
                  </div>
                )}
                <div
                  style={s(
                    "display:grid;grid-template-columns:1.2fr 1.2fr 80px 2fr 1fr 170px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Alumno</span>
                  <span>Actividad</span>
                  <span>Puntaje</span>
                  <span>Comentario</span>
                  <span>Fecha</span>
                  <span>Acciones</span>
                </div>
                {resenas.map((r) => (
                  <div
                    key={r.id}
                    style={s("display:grid;grid-template-columns:1.2fr 1.2fr 80px 2fr 1fr 170px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                  >
                    <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>
                      {r.alumno.nombre} {r.alumno.apellido}
                    </span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{r.actividadNombre}</span>
                    <span style={s("display:flex;align-items:center;gap:4px;font:700 13.5px Space Grotesk,sans-serif;color:#0E2A47;")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                      </svg>
                      {r.puntaje}
                    </span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{r.comentario?.trim() ? r.comentario : "— sin comentario —"}</span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(r.createdAt)}</span>
                    <div style={s("display:flex;gap:7px;")}>
                      <button
                        className="ah-btn"
                        onClick={() => aprobarResenia(r)}
                        style={s("background:#E7F8F5;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#0C8576;cursor:pointer;")}
                      >
                        Aprobar
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => rechazarResenia(r)}
                        style={s("background:#FBEAEB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
                {resenas.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay reseñas pendientes de moderación.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspender al instructor: plazo obligatorio (mínimo 15 días) y multa opcional.
          Genera una Penalización de Suspensión temporal y, si el monto es mayor a 0, otra
          Económica; las dos quedan atadas a esta denuncia. */}
      {suspension && (
        <div
          onClick={() => !guardandoSuspension && setSuspension(null)}
          style={s("position:fixed;inset:0;background:rgba(14,42,71,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px;")}
        >
          <div onClick={(e) => e.stopPropagation()} style={s("background:#fff;border-radius:18px;padding:26px;max-width:460px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
              Suspender al instructor
            </div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:18px;")}>
              {suspension.denuncia.instructor
                ? `${suspension.denuncia.instructor.nombre} ${suspension.denuncia.instructor.apellido}`
                : "Instructor de la clase denunciada"}
              {" · "}la suspensión se levanta sola al vencer.
            </div>

            <div style={s("display:flex;flex-direction:column;gap:12px;")}>
              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>
                  Días de suspensión (mínimo {MIN_DIAS_SUSPENSION})
                </span>
                <input
                  type="number"
                  min={MIN_DIAS_SUSPENSION}
                  step={1}
                  value={suspension.dias}
                  onChange={(e) => setSuspension({ ...suspension, dias: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
              </label>

              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>Multa (puede ser 0)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={suspension.monto}
                  onChange={(e) => setSuspension({ ...suspension, monto: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
                <span style={s("font-size:11.5px;color:#9AAABA;font-weight:600;")}>
                  En 0 no se aplica penalización económica, solo la suspensión.
                </span>
              </label>

              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>Detalle para el denunciante (opcional)</span>
                <textarea
                  rows={3}
                  value={suspension.detalle}
                  onChange={(e) => setSuspension({ ...suspension, detalle: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;resize:vertical;")}
                />
              </label>
            </div>

            {errorSuspension && (
              <div
                style={s("margin-top:12px;background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 13px;font:600 13px Manrope,sans-serif;")}
                role="alert"
              >
                {errorSuspension}
              </div>
            )}

            <div style={s("display:flex;gap:10px;margin-top:18px;")}>
              <button
                className="ah-btn"
                onClick={() => setSuspension(null)}
                disabled={guardandoSuspension}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={confirmarSuspension}
                disabled={guardandoSuspension}
                style={s(
                  `flex:1;background:${guardandoSuspension ? "#D89A9C" : "#BE3A3E"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:${guardandoSuspension ? "wait" : "pointer"};`,
                )}
              >
                {guardandoSuspension ? "Aplicando…" : "Suspender"}
              </button>
            </div>
          </div>
        </div>
      )}

      {edicion && (
        <div
          onClick={() => !guardandoEdicion && setEdicion(null)}
          style={s("position:fixed;inset:0;background:rgba(14,42,71,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px;")}
        >
          <div onClick={(e) => e.stopPropagation()} style={s("background:#fff;border-radius:18px;padding:26px;max-width:440px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>Editar usuario</div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:18px;")}>
              Los cambios quedan registrados en la auditoría.
            </div>
            <div style={s("display:flex;flex-direction:column;gap:12px;")}>
              <CampoModal label="Nombre" value={edicion.nombre} onChange={(v) => setEdicion({ ...edicion, nombre: v })} />
              <CampoModal label="Apellido" value={edicion.apellido} onChange={(v) => setEdicion({ ...edicion, apellido: v })} />
              <CampoModal label="Email" value={edicion.email} onChange={(v) => setEdicion({ ...edicion, email: v })} type="email" />
              <CampoModal label="Teléfono" value={edicion.telefono} onChange={(v) => setEdicion({ ...edicion, telefono: v })} />
              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>Rol</span>
                <select
                  value={edicion.rolId}
                  onChange={(e) => setEdicion({ ...edicion, rolId: e.target.value })}
                  style={s(
                    "border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;background:#fff;",
                  )}
                >
                  {rolesAsignables.length === 0 && <option value="">Sin roles disponibles</option>}
                  {rolesAsignables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                      {r.sistema ? "" : " (creado por vos)"}
                    </option>
                  ))}
                </select>
                <span style={s("font-size:11.5px;color:#9AAABA;font-weight:600;")}>
                  El rol define qué puede hacer: se configura en "Roles y permisos".
                </span>
              </label>
            </div>
            {errorEdicion && (
              <div
                style={s("margin-top:12px;background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 13px;font:600 13px Manrope,sans-serif;")}
                role="alert"
              >
                {errorEdicion}
              </div>
            )}
            <div style={s("display:flex;gap:10px;margin-top:18px;")}>
              <button
                className="ah-btn"
                onClick={() => setEdicion(null)}
                disabled={guardandoEdicion}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={guardarEdicion}
                disabled={guardandoEdicion}
                style={s(
                  `flex:1;background:${guardandoEdicion ? "#8FA9C4" : "#0E2A47"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:${guardandoEdicion ? "wait" : "pointer"};`,
                )}
              >
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}

function CampoModal({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={s("display:flex;flex-direction:column;gap:6px;")}>
      <span style={s("font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={s("border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
      />
    </label>
  );
}
