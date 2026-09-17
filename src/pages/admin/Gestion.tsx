import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { incluye } from "../../lib/texto";
import Modal from "../../components/Modal";
import { CargandoSeccion } from "../../components/Cargando";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type {
  AccionResolucion,
  DenunciaAdmin,
  InstructorAdmin,
  ReporteSoporteAdmin,
  ReseniaPendiente,
  ReseniaPublicada,
  UsuarioAdmin,
  RolAdmin,
} from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { denunciaStatusType } from "../../lib/status";
import { formatFecha } from "../../lib/mockData";
import type { RolNombre } from "../../lib/types";

type Tab = "usuarios" | "instructores" | "actividades" | "reclamos" | "resenas" | "soporte";

/**
 * Cada pestaña es un módulo distinto, con su propio permiso — el mismo que exige el
 * `@PreAuthorize` del endpoint que consulta. La pantalla se abre con **cualquiera** de los
 * cuatro (ver `permisosDePantalla("gestionadmin")` en lib/areas.ts) y acá se decide qué
 * pestañas se ven: alguien con sólo `denuncias.resolver` entra directo a Reclamos y no ve
 * las otras cuatro, en vez de quedarse afuera de la pantalla entera.
 */
const TABS: { key: Tab; label: string; requiere: string }[] = [
  { key: "usuarios", label: "Usuarios", requiere: "usuarios.gestionar" },
  { key: "instructores", label: "Instructores", requiere: "instructores.validar" },
  { key: "actividades", label: "Actividades", requiere: "actividades.moderar" },
  { key: "reclamos", label: "Reclamos", requiere: "denuncias.resolver" },
  { key: "resenas", label: "Reseñas", requiere: "denuncias.resolver" },
  { key: "soporte", label: "Soporte", requiere: "soporte.gestionar" },
];

/** Lo que dice el cartel de carga de cada pestaña: "Cargando {esto}, por favor espere". */
const ETIQUETA_TAB: Record<Tab, string> = {
  usuarios: "usuarios",
  instructores: "instructores",
  actividades: "actividades",
  reclamos: "reclamos",
  resenas: "reseñas",
  soporte: "reportes de soporte",
};

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

/**
 * Las cuatro resoluciones son <b>excluyentes</b>: se elige una y el caso se cierra. Cada una
 * lleva su descripción porque el nombre solo no alcanza para decidir — "Penalizar" y
 * "Suspender" suenan parecido y hacen cosas muy distintas, y "Reintegrar" alcanza a una sola
 * persona, no a toda la clase.
 *
 * <p>Las descripciones dicen lo que el backend <i>hace</i> ({@code ResolverDenunciaService}),
 * no lo que uno esperaría que hiciera. Si cambia el comportamiento allá, cambian acá.
 */
const ETIQUETA_ACCION: Record<AccionResolucion, string> = {
  REINTEGRAR: "Reintegrar el pago",
  SUSPENDER: "Suspender al instructor",
  PENALIZAR: "Aplicar penalización económica",
  DESESTIMAR: "Desestimar",
  OCULTAR_RESENIA: "Ocultar la reseña",
};

const DESCRIPCION_ACCION: Record<AccionResolucion, string> = {
  REINTEGRAR:
    "Cancela la inscripción de quien denunció y le devuelve su pago. Alcanza sólo a esa persona: el resto de los inscriptos a la clase no se toca.",
  SUSPENDER:
    "Inhabilita al instructor por la cantidad de días que elijas (mínimo 15) y, si cargás un monto, además le aplica una multa. Cancela las clases que tuviera en ese período y reintegra a todos sus inscriptos. Puede seguir iniciando sesión, pero no publicar ni gestionar nada.",
  PENALIZAR:
    "Le aplica una multa al instructor y suma una penalización a su historial. No lo inhabilita, no cancela clases y no devuelve ningún pago.",
  DESESTIMAR:
    "Cierra el caso sin ninguna consecuencia: no se toca el pago, ni la inscripción, ni el instructor. Se le avisa al denunciante igual.",
  OCULTAR_RESENIA:
    "Saca la reseña del listado público y la descuenta del promedio de la actividad. No se borra: queda registrada.",
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
  const { currentUser, puede } = useAuth();

  const tabsVisibles = TABS.filter((t) => puede(t.requiere));
  const pedida = TABS.find((t) => t.key === params.tab);
  // Si la URL pide una pestaña que sus permisos no habilitan (un link viejo, o la tarjeta del
  // Dashboard de alguien que perdió el permiso), cae en la primera que sí puede ver en vez de
  // mostrar una tabla que la API le va a rechazar.
  const tab: Tab = pedida && puede(pedida.requiere) ? pedida.key : tabsVisibles[0]?.key ?? "usuarios";
  const {
    actividades,
    eliminarActividad,
    listarDenunciasAdmin,
    resolverDenuncia,
    listarReportesSoporte,
    cerrarReporteSoporte,
    instructorNombre,
    getTipoActividad,
    getCategoria,
    listarInstructores,
    aprobarInstructor: aprobarInstructorReal,
    rechazarInstructor: rechazarInstructorReal,
    listarResenasPendientes,
    listarResenasPublicadas,
    ocultarResenia,
    aprobarResenia: aprobarReseniaReal,
    rechazarResenia: rechazarReseniaReal,
    listarUsuariosAdmin,
    actualizarEstadoUsuario,
    actualizarUsuarioAdmin,
    listarRolesPermisos,
    asignarRolUsuario,
    cargandoCatalogo,
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
  /** Panel que explica qué hace cada resolución. Cerrado por defecto: se consulta una vez. */
  const [ayudaResoluciones, setAyudaResoluciones] = useState(false);
  /**
   * Sub-pestaña de Reseñas. "Pendientes" es la cola de moderación de siempre; "Publicadas" es
   * lo que este tramo agrega: una reseña impropia que se filtró en la moderación quedaba fuera
   * del alcance del admin — el único camino para bajarla era que el instructor la denunciara.
   */
  const [tabResenas, setTabResenas] = useState<"pendientes" | "publicadas">("pendientes");
  const [resenasPublicadas, setResenasPublicadas] = useState<ReseniaPublicada[]>([]);
  // Suspender ya no es un botón directo: pide plazo y monto (E4Ad-HU07).
  const [suspension, setSuspension] = useState<SuspensionEnCurso | null>(null);
  const [errorSuspension, setErrorSuspension] = useState<string | null>(null);
  const [guardandoSuspension, setGuardandoSuspension] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  /** Bandeja de "Reportar un problema" de /ayuda. Los abiertos vienen primero del backend. */
  const [reportes, setReportes] = useState<ReporteSoporteAdmin[]>([]);
  const [errorReportes, setErrorReportes] = useState<string | null>(null);
  const [cierre, setCierre] = useState<{ reporte: ReporteSoporteAdmin; respuesta: string } | null>(null);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [guardandoCierre, setGuardandoCierre] = useState(false);

  const goTab = (t: Tab) => navigate(`/admin/gestion/${t}`);

  // Qué pestañas ya trajeron sus datos. Se guarda el conjunto y no un booleano "cargando"
  // porque cambiar de pestaña tendría que volver a prenderlo, y prender un estado de forma
  // síncrona dentro del efecto que dispara la carga es `react-hooks/set-state-in-effect`.
  // Así el valor se DERIVA: la pestaña está cargando mientras no esté en el conjunto.
  const [tabsCargados, setTabsCargados] = useState<Set<Tab>>(new Set());
  const marcarCargado = (t: Tab) => setTabsCargados((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
  // "actividades" sale del catálogo del Context, no de un loader propio de esta pantalla.
  const cargandoTab = tab === "actividades" ? cargandoCatalogo : !tabsCargados.has(tab);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const coincideQuery = incluye(`${u.nombre} ${u.apellido}`, query) || incluye(u.email, query);
      const coincideRol = rolFiltro === "todos" || u.rol === rolFiltro;
      return coincideQuery && coincideRol;
    });
  }, [usuarios, query, rolFiltro]);

  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((a) => incluye(a.nombre, queryActividades));
  }, [actividades, queryActividades]);

  const cargarInstructores = () => {
    listarInstructores()
      .then(setInstructores)
      .catch((err) => setErrorInstructores(err instanceof ApiError ? err.message : "No pudimos cargar los instructores."))
      .finally(() => marcarCargado("instructores"));
  };

  const cargarResenas = () => {
    listarResenasPendientes()
      .then(setResenas)
      .catch((err) => setErrorResenas(err instanceof ApiError ? err.message : "No pudimos cargar las reseñas."));
    listarResenasPublicadas()
      .then(setResenasPublicadas)
      .catch((err) =>
        setErrorResenas(err instanceof ApiError ? err.message : "No pudimos cargar las reseñas publicadas."),
      )
      .finally(() => marcarCargado("resenas"));
  };

  /**
   * Ocultar pide motivo y es sobre una reseña YA publicada. No la borra: la fila queda con su
   * autor y su texto, porque si el contenido llega a ser algo en lo que deba intervenir la
   * justicia, esa es justamente la evidencia. Lo que cambia es que deja de verse en el detalle
   * público y de contar en el promedio.
   */
  const ocultarResenaPublicada = async (r: ReseniaPublicada) => {
    const motivo = window.prompt(
      `¿Por qué ocultás la reseña de ${r.alumno.nombre} ${r.alumno.apellido}?\n\n` +
        "La reseña no se borra: queda registrada con su autor y su texto, y el motivo va a la auditoría.",
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      setErrorResenas("El motivo es obligatorio para ocultar una reseña.");
      return;
    }
    setErrorResenas(null);
    try {
      await ocultarResenia(r.id, motivo.trim());
      cargarResenas();
    } catch (err) {
      setErrorResenas(err instanceof ApiError ? err.message : "No pudimos ocultar la reseña.");
    }
  };

  const cargarDenuncias = () => {
    listarDenunciasAdmin()
      .then(setDenuncias)
      .catch((err) => setErrorDenuncias(err instanceof ApiError ? err.message : "No pudimos cargar los reclamos."))
      .finally(() => marcarCargado("reclamos"));
  };

  const cargarUsuarios = () => {
    listarUsuariosAdmin()
      .then(setUsuarios)
      .catch((err) => setErrorUsuarios(err instanceof ApiError ? err.message : "No pudimos cargar los usuarios."))
      .finally(() => marcarCargado("usuarios"));
    // Los roles asignables van con el listado: el modal de edición los necesita para el
    // selector, e incluyen los que el admin creó en "Roles y permisos". Si falla, el selector
    // queda vacío y el resto de la edición sigue funcionando.
    listarRolesPermisos()
      .then((r) => setRolesAsignables(r.roles))
      .catch(() => setRolesAsignables([]));
  };

  // El "limpiar el error" va dentro del `.then`, no en el cuerpo: esta función la llama el
  // `useEffect` de abajo y un setState síncrono ahí es `react-hooks/set-state-in-effect`.
  // Mismo patrón que los otros cuatro loaders de la pantalla.
  const cargarReportes = () => {
    listarReportesSoporte()
      .then((rs) => {
        setReportes(rs);
        setErrorReportes(null);
      })
      .catch((err) =>
        setErrorReportes(err instanceof ApiError ? err.message : "No pudimos cargar los reportes de soporte."),
      )
      .finally(() => marcarCargado("soporte"));
  };

  const confirmarCierre = async () => {
    if (!cierre) return;
    setErrorCierre(null);
    setGuardandoCierre(true);
    try {
      await cerrarReporteSoporte(cierre.reporte.id, cierre.respuesta);
      setCierre(null);
      cargarReportes();
    } catch (err) {
      setErrorCierre(err instanceof ApiError ? err.message : "No pudimos cerrar el reporte.");
    } finally {
      setGuardandoCierre(false);
    }
  };

  useEffect(() => {
    if (tab === "usuarios") cargarUsuarios();
    if (tab === "instructores") cargarInstructores();
    if (tab === "resenas") cargarResenas();
    if (tab === "reclamos") cargarDenuncias();
    if (tab === "soporte") cargarReportes();
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
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Administrá usuarios, instructores, actividades, reclamos, reseñas y soporte.
        </p>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
        <div style={s("display:flex;gap:4px;border-bottom:1px solid #E2E9F0;margin-bottom:22px;flex-wrap:wrap;")}>
          {tabsVisibles.map((t) => (
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

        {/* La pestaña entera espera a su consulta: una tabla vacía no es "no hay nada". */}
        {cargandoTab && <CargandoSeccion seccion={ETIQUETA_TAB[tab]} />}
        <div style={s(cargandoTab ? "display:none;" : "background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
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
              {/*
                Las cuatro resoluciones son excluyentes y no se distinguen por el nombre:
                "Suspender" y "Aplicar penalización económica" suenan parecido y hacen cosas muy
                distintas, y "Reintegrar" alcanza sólo a quien denunció. El panel lo explica una
                vez para toda la tabla, en vez de repetir el texto en cada fila; cada botón
                además lleva la misma descripción en su `title`.
              */}
              <div style={s("padding:14px 22px;border-bottom:1px solid #EEF2F6;")}>
                <button
                  className="ah-btn"
                  onClick={() => setAyudaResoluciones((v) => !v)}
                  style={s(
                    "background:#F4F7FA;border:1px solid #E2E9F0;border-radius:10px;padding:8px 13px;font:700 12.5px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2.2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" />
                    <path d="M12 17h.01" />
                  </svg>
                  ¿Qué hace cada resolución?
                </button>
                {ayudaResoluciones && (
                  <div
                    style={s(
                      "margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;",
                    )}
                  >
                    {(Object.keys(DESCRIPCION_ACCION) as AccionResolucion[]).map((accion) => (
                      <div
                        key={accion}
                        style={s(
                          "background:#F9FBFD;border:1px solid #EAF0F6;border-radius:12px;padding:12px 14px;",
                        )}
                      >
                        <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
                          {ETIQUETA_ACCION[accion]}
                        </div>
                        <div style={s("font-size:12.5px;color:#65788C;font-weight:600;line-height:1.5;")}>
                          {DESCRIPCION_ACCION[accion]}
                        </div>
                      </div>
                    ))}
                    <div
                      style={s(
                        "background:#FFF9EF;border:1px solid #F6E2C0;border-radius:12px;padding:12px 14px;",
                      )}
                    >
                      <div style={s("font:700 13px Manrope,sans-serif;color:#8A5A12;margin-bottom:4px;")}>
                        Se elige una sola
                      </div>
                      <div style={s("font-size:12.5px;color:#8A5A12;font-weight:600;line-height:1.5;")}>
                        Las resoluciones son excluyentes: al aplicar una, el caso queda cerrado y no
                        se puede volver atrás.
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                              title={DESCRIPCION_ACCION[accion]}
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
                <div style={s("display:flex;gap:4px;padding:14px 22px 0;")}>
                  {([
                    { key: "pendientes", label: "Pendientes de moderación", n: resenas.length },
                    { key: "publicadas", label: "Publicadas", n: resenasPublicadas.length },
                  ] as const).map((t) => {
                    const on = tabResenas === t.key;
                    return (
                      <span
                        key={t.key}
                        onClick={() => setTabResenas(t.key)}
                        className="ah-btn"
                        style={s(
                          `display:flex;align-items:center;gap:7px;padding:10px 15px;cursor:pointer;font:700 13.5px Manrope,sans-serif;color:${on ? "#0E2A47" : "#90A1B2"};border-bottom:2.5px solid ${on ? "#FF6A2B" : "transparent"};`,
                        )}
                      >
                        {t.label}
                        <span
                          style={s(
                            `font:700 11px Manrope,sans-serif;background:${on ? "#FFE4D5" : "#EEF1F4"};color:${on ? "#FF6A2B" : "#7A8C9E"};border-radius:99px;padding:2px 8px;`,
                          )}
                        >
                          {t.n}
                        </span>
                      </span>
                    );
                  })}
                </div>
                <div
                  style={s(
                    "display:grid;grid-template-columns:1.2fr 1.2fr 80px 2fr 1fr 170px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;border-top:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>Alumno</span>
                  <span>Actividad</span>
                  <span>Puntaje</span>
                  <span>Comentario</span>
                  <span>Fecha</span>
                  <span>Acciones</span>
                </div>
                {tabResenas === "pendientes" &&
                  resenas.map((r) => (
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
                {tabResenas === "publicadas" &&
                  resenasPublicadas.map((r) => (
                    <div
                      key={r.id}
                      style={s(
                        `display:grid;grid-template-columns:1.2fr 1.2fr 80px 2fr 1fr 170px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;background:${r.oculta ? "#FAFBFC" : "#fff"};`,
                      )}
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
                      <span
                        style={s(
                          `font-size:13px;font-weight:600;color:${r.oculta ? "#A6B3C0" : "#65788C"};${r.oculta ? "text-decoration:line-through;" : ""}`,
                        )}
                      >
                        {r.comentario?.trim() ? r.comentario : "— sin comentario —"}
                      </span>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(r.createdAt)}</span>
                      <div style={s("display:flex;gap:7px;align-items:center;")}>
                        {r.oculta ? (
                          <span
                            title="La reseña sigue registrada con su autor y su texto; sólo dejó de verse en público y de contar en el promedio."
                            style={s(
                              "background:#EEF2F6;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#65788C;",
                            )}
                          >
                            Oculta
                          </span>
                        ) : (
                          <button
                            className="ah-btn"
                            onClick={() => ocultarResenaPublicada(r)}
                            title="Sácala del listado público y del promedio. No se borra: queda registrada con su autor."
                            style={s(
                              "background:#FBEAEB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;",
                            )}
                          >
                            Ocultar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                {tabResenas === "publicadas" && resenasPublicadas.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>
                    Todavía no hay reseñas publicadas.
                  </div>
                )}
                {tabResenas === "pendientes" && resenas.length === 0 && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay reseñas pendientes de moderación.</div>
                )}
              </div>
            </div>
          )}

          {tab === "soporte" && (
            <div style={s("overflow-x:auto;")}>
              <div style={s("min-width:900px;")}>
                {errorReportes && (
                  <div style={s("padding:13px 22px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
                    <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorReportes}</span>
                  </div>
                )}
                <div
                  style={s(
                    "display:grid;grid-template-columns:1.1fr 1.2fr 2fr 1fr 1fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                  )}
                >
                  <span>De</span>
                  <span>Asunto</span>
                  <span>Detalle</span>
                  <span>Fecha</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>
                {reportes.map((r) => (
                  <div
                    key={r.id}
                    style={s(
                      `display:grid;grid-template-columns:1.1fr 1.2fr 2fr 1fr 1fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;${r.estado === "Cerrado" ? "background:#FBFCFD;" : ""}`,
                    )}
                  >
                    <div style={s("display:flex;flex-direction:column;gap:2px;min-width:0;")}>
                      {/* La etiqueta del anónimo la decide la pantalla: el backend manda null. */}
                      <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>
                        {r.autorNombre ?? "Sin cuenta"}
                      </span>
                      <span style={s("font-size:12px;color:#90A1B2;font-weight:600;overflow:hidden;text-overflow:ellipsis;")}>
                        {r.email}
                      </span>
                    </div>
                    <span style={s("font-size:13.5px;color:#41566B;font-weight:700;padding-right:10px;")}>{r.asunto}</span>
                    <div style={s("padding-right:10px;min-width:0;")}>
                      <span style={s("font-size:13px;color:#65788C;font-weight:600;line-height:1.45;")}>{r.detalle}</span>
                      {r.respuesta && (
                        <div
                          style={s(
                            "margin-top:7px;padding:8px 10px;background:#F6F9FC;border-left:3px solid #12B5A5;border-radius:0 9px 9px 0;font:600 12.5px Manrope,sans-serif;color:#41566B;line-height:1.45;",
                          )}
                        >
                          <strong style={s("color:#0C8576;")}>Respuesta:</strong> {r.respuesta}
                        </div>
                      )}
                    </div>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(r.createdAt)}</span>
                    <div style={s("display:flex;flex-direction:column;gap:3px;")}>
                      <span
                        style={s(
                          `justify-self:start;font:700 11.5px Manrope,sans-serif;padding:4px 10px;border-radius:99px;background:${r.estado === "Abierto" ? "#FFF3E0" : "#E7F8F5"};color:${r.estado === "Abierto" ? "#B9741A" : "#0C8576"};`,
                        )}
                      >
                        {r.estado}
                      </span>
                      {r.cerradoPorNombre && (
                        <span style={s("font-size:11px;color:#9AAABA;font-weight:600;")}>por {r.cerradoPorNombre}</span>
                      )}
                    </div>
                    <div>
                      {r.estado === "Abierto" ? (
                        <button
                          className="ah-btn"
                          onClick={() => {
                            setErrorCierre(null);
                            setCierre({ reporte: r, respuesta: "" });
                          }}
                          style={s("background:#E7F8F5;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#0C8576;cursor:pointer;")}
                        >
                          Cerrar
                        </button>
                      ) : (
                        <span style={s("font-size:12px;color:#9AAABA;font-weight:600;")}>
                          {r.cerradoAt ? formatFecha(r.cerradoAt) : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {reportes.length === 0 && !errorReportes && (
                  <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>
                    No hay reportes de soporte.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cerrar un reporte: la respuesta es opcional y el cierre no se puede deshacer (el
          backend rechaza volver a cerrar, para no pisar la respuesta y la fecha originales). */}
      {cierre && (
        <Modal onClose={() => !guardandoCierre && setCierre(null)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:480px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>Cerrar reporte</div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:16px;")}>
              {cierre.reporte.asunto} · {cierre.reporte.email}
            </div>

            <div
              style={s(
                "background:#F6F9FC;border:1px solid #E7EDF3;border-radius:11px;padding:12px 14px;margin-bottom:16px;font:600 13px Manrope,sans-serif;color:#54697E;line-height:1.5;max-height:150px;overflow-y:auto;",
              )}
            >
              {cierre.reporte.detalle}
            </div>

            <label style={s("display:flex;flex-direction:column;gap:6px;")}>
              <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>Respuesta (opcional)</span>
              <textarea
                rows={4}
                maxLength={2000}
                value={cierre.respuesta}
                onChange={(e) => setCierre({ ...cierre, respuesta: e.target.value })}
                placeholder="Queda registrada junto al reporte."
                style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;resize:vertical;font-family:Manrope;")}
              />
            </label>

            {errorCierre && (
              <div
                role="alert"
                style={s("margin-top:12px;background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 13px;font:600 13px Manrope,sans-serif;")}
              >
                {errorCierre}
              </div>
            )}

            <div style={s("display:flex;gap:10px;margin-top:18px;")}>
              <button
                className="ah-btn"
                onClick={() => setCierre(null)}
                disabled={guardandoCierre}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={confirmarCierre}
                disabled={guardandoCierre}
                style={s(
                  `flex:1;background:${guardandoCierre ? "#8FC7BF" : "#0C8576"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:${guardandoCierre ? "wait" : "pointer"};`,
                )}
              >
                {guardandoCierre ? "Cerrando…" : "Cerrar reporte"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspender al instructor: plazo obligatorio (mínimo 15 días) y multa opcional.
          Genera una Penalización de Suspensión temporal y, si el monto es mayor a 0, otra
          Económica; las dos quedan atadas a esta denuncia. */}
      {suspension && (
        <Modal onClose={() => !guardandoSuspension && setSuspension(null)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:460px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
              Suspender al instructor
            </div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:18px;")}>
              {suspension.denuncia.instructor
                ? `${suspension.denuncia.instructor.nombre} ${suspension.denuncia.instructor.apellido}`
                : "Instructor de la clase denunciada"}
              {" · "}la suspensión se levanta sola al vencer.
            </div>

            {/* La misma descripción que la leyenda de la tabla: es donde se confirma. */}
            <div
              style={s(
                "background:#FFF9EF;border:1px solid #F6E2C0;border-radius:11px;padding:11px 14px;margin-bottom:16px;font:600 12.5px Manrope,sans-serif;color:#8A5A12;line-height:1.5;",
              )}
            >
              {DESCRIPCION_ACCION.SUSPENDER}
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
        </Modal>
      )}

      {edicion && (
        <Modal onClose={() => !guardandoEdicion && setEdicion(null)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:440px;width:100%;")}>
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
        </Modal>
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
