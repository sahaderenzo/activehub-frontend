/* eslint-disable react-refresh/only-export-components -- el provider y su hook viven
   juntos a propósito: separarlos obligaría a tocar los imports de todas las pantallas y solo
   afecta al fast refresh en desarrollo. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Actividad,
  Categoria,
  Clase,
  EstadoClase,
  EstadoDenuncia,
  EstadoInscripcion,
  EstadoPago,
  EstadoUsuario,
  NivelIntensidad,
  RolNombre,
  TipoActividad,
  TipoPenalizacion,
} from "../lib/types";
import { api } from "../lib/api";

/**
 * Todo lo que expone este contexto pega contra activehub-api. Ya no queda ningún
 * dataset mock acá: los arrays `inscripciones`/`pagos`/`penalizaciones` que vivían
 * en localStorage se borraron cuando las últimas dos pantallas que los leían
 * (Perfil del alumno y Reportes del admin) pasaron a `listarMisInscripciones()` y
 * `listarPenalizaciones()`. `lib/mockData.ts` sigue existiendo **solo** por sus
 * helpers de formato de fecha/hora, no por sus datos.
 */


// --- Shapes de respuesta reales de activehub-api ---------------------------

interface CategoriaResp {
  id: string;
  nombre: string;
}

interface TipoActividadResp {
  id: string;
  nombre: string;
  categoriaId: string;
}

interface ActividadCamposComunes {
  id: string;
  nombre: string;
  tipoActividad: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
  nivelIntensidad: { id: string; nombre: string };
  instructor: { id: string; nombre: string; apellido: string };
  precio: number;
  ubicacion: string;
  photoTint: string;
  rating: number | null;
  duracionMin: number;
  latitud: number | null;
  longitud: number | null;
}

interface ActividadListResp extends ActividadCamposComunes {
  proximaClase: { fechaHora: string; estado: string; cuposMax: number; cuposOcupados: number } | null;
}

interface ClaseResp {
  id: string;
  fechaHora: string;
  horaFin: string;
  estado: string;
  cuposMax: number;
  cuposOcupados: number;
}

interface ClaseDetalleResp extends ClaseResp {
  cantidadPreInscripcion: number;
}

interface ActividadDetalleResp extends ActividadCamposComunes {
  descripcion: string;
  imagenes: string[];
  clases: ClaseDetalleResp[];
}

export interface InstructorAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  createdAt: string;
  especialidad: string;
  aniosExperiencia?: number;
  estadoVerificacion: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  motivoRechazo?: string;
}

export interface ClaseInstructorAdmin {
  claseId: string;
  actividadId: string;
  actividadNombre: string;
  fechaHora: string;
  estado: EstadoClase;
  cuposMax: number;
  cuposOcupados: number;
}

export interface DocumentoInstructor {
  id: string;
  nombreArchivo: string;
  tipoDocumento: string;
  tamanioBytes: number;
  createdAt: string;
}

export interface ClaseAdmin {
  claseId: string;
  actividadId: string;
  actividadNombre: string;
  fechaHora: string;
  estado: EstadoClase;
  cuposMax: number;
  cuposOcupados: number;
}

export interface MiInscripcion {
  id: string;
  claseId: string;
  claseFechaHora: string;
  claseEstado: string;
  actividadId: string;
  actividadNombre: string;
  alumnoId: string;
  estado: EstadoInscripcion;
  createdAt: string;
  pagoId?: string;
  pago?: { id: string; estado: string; monto: number; metodo: string };
}

export interface RosterAlumno {
  inscripcionId: string;
  alumnoId: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  estado: string;
}

/** Clase propia del instructor (GET /api/instructor/clases). Incluye Finalizadas y Canceladas. */
export interface MiClaseInstructor {
  claseId: string;
  actividadId: string;
  actividadNombre: string;
  actividadUbicacion: string;
  fechaHora: string;
  estado: EstadoClase;
  cuposMax: number;
  cuposOcupados: number;
}

/** Inscripción a una clase propia del instructor (GET /api/instructor/inscripciones). */
export interface InscripcionMiClase {
  inscripcionId: string;
  claseId: string;
  actividadId: string;
  actividadNombre: string;
  claseFechaHora: string;
  claseEstado: EstadoClase;
  alumnoId: string;
  alumnoNombre: string;
  estado: EstadoInscripcion;
  createdAt: string;
  pagoEstado: EstadoPago | null;
  pagoMonto: number | null;
}

/** Pago del alumno logueado (GET /api/alumno/pagos). */
export interface MiPago {
  pagoId: string;
  inscripcionId: string;
  claseId: string;
  actividadId: string;
  actividadNombre: string;
  claseFechaHora: string;
  claseEstado: EstadoClase;
  inscripcionEstado: EstadoInscripcion;
  estado: EstadoPago;
  metodo: string;
  monto: number;
  createdAt: string;
}

export interface ActualizarUsuarioAdminInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
}

export interface PenalizacionAdmin {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  tipo: TipoPenalizacion;
  motivo: string;
  monto: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  /** Solo las suspensiones tienen vigencia; el backend ya la calcula contra la fecha de hoy. */
  vigente: boolean;
  denunciaId: string | null;
  cantidadPenalizacionesUsuario: number;
  createdAt: string;
}

export interface CrearPenalizacionInput {
  usuarioId: string;
  /** Se pueden aplicar los dos a la vez: el backend guarda una penalización por tipo. */
  tipos: TipoPenalizacion[];
  motivo: string;
  monto?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

/** Datos extra que pide "Suspender al instructor" al resolver una denuncia. */
export interface SancionSuspension {
  /** Puede ser 0: en ese caso la sanción es solo la suspensión, sin multa. */
  montoMulta: number;
  /** Mínimo 15 días (lo valida también el backend). */
  diasSuspension: number;
}

export interface RosterClase {
  claseId: string;
  cuposMax: number;
  cuposOcupados: number;
  cuposLibres: number;
  cantidadInscripto: number;
  cantidadPagoPendiente: number;
  cantidadPreInscripcion: number;
  alumnos: RosterAlumno[];
}

export interface ReseniaActividad {
  id: string;
  claseId: string;
  alumno: { id: string; nombre: string; apellido: string };
  puntaje: number;
  /** Opcional: una reseña puede ser solo estrellas. */
  comentario: string | null;
  createdAt: string;
}

export interface MiResenia {
  id: string;
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  instructorNombre: string;
  puntaje: number;
  /** Opcional: una reseña puede ser solo estrellas. */
  comentario: string | null;
  enModeracion: boolean;
  createdAt: string;
}

export interface ReseniaInstructor {
  id: string;
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  alumno: { id: string; nombre: string; apellido: string };
  puntaje: number;
  /** Opcional: una reseña puede ser solo estrellas. */
  comentario: string | null;
  /** Pendiente de aprobación del admin. NO significa "denunciada" — para eso está `denunciada`. */
  enModeracion: boolean;
  respuestaInstructor?: string;
  respuestaInstructorAt?: string;
  /** El instructor ya la denunció y la denuncia sigue abierta. */
  denunciada: boolean;
  oculta: boolean;
  createdAt: string;
}

export interface ReseniaPendiente {
  id: string;
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  alumno: { id: string; nombre: string; apellido: string };
  puntaje: number;
  /** Opcional: una reseña puede ser solo estrellas. */
  comentario: string | null;
  createdAt: string;
}


/** E4Ad-HU08: la matriz de "Roles y permisos" (GET /api/admin/roles). */
export interface RolAdmin {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Los tres del sistema (ALUMNO/INSTRUCTOR/ADMIN) son los únicos que el backend sabe asignar. */
  sistema: boolean;
  usuarios: number;
  /** Claves habilitadas para este rol. */
  permisos: string[];
}

export interface PermisoAdmin {
  id: string;
  clave: string;
  modulo: string;
  accion: string;
  /** Sin él el Administrador se queda sin gobierno: el backend rechaza quitarlo. */
  critico: boolean;
  /**
   * `false` = permiso implícito (`Permiso.IMPLICITOS` en el backend): lo tienen todos los
   * roles y no se puede apagar, así que la pantalla no lo ofrece como checkbox.
   */
  configurable: boolean;
}

export interface RolesPermisos {
  roles: RolAdmin[];
  permisos: PermisoAdmin[];
}

/** Acciones válidas al resolver. OCULTAR_RESENIA solo aplica a denuncias de reseña. */
export type AccionResolucion = "REINTEGRAR" | "SUSPENDER" | "PENALIZAR" | "DESESTIMAR" | "OCULTAR_RESENIA";

export interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  entidadId: string | null;
  leida: boolean;
  createdAt: string;
}

export interface InscripcionAdmin {
  id: string;
  claseId: string;
  actividadId: string;
  alumnoId: string;
  estado: EstadoInscripcion;
  createdAt: string;
  pago: { id: string; estado: string; monto: number; metodo: string } | null;
}

export interface AuditoriaEntry {
  id: string;
  actorId: string | null;
  actorNombre: string;
  actorRol: RolNombre | null;
  accion: string;
  entidad: string;
  entidadId: string;
  metadata: string | null;
  createdAt: string;
}

export type ResolucionDenuncia = "REINTEGRAR" | "SUSPENDER" | "PENALIZAR" | "DESESTIMAR" | "OCULTAR_RESENIA";

export interface MiDenuncia {
  id: string;
  /** "CLASE" (la hizo un alumno) o "RESENIA" (la hizo el instructor). */
  tipo: "CLASE" | "RESENIA";
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  motivo: string;
  estado: EstadoDenuncia;
  /** Cómo la cerró el admin. Null mientras siga abierta (E3A-HU11 criterios 2 y 7). */
  resolucion: ResolucionDenuncia | null;
  detalle: string | null;
  createdAt: string;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  /** Nombre del rol: los tres del sistema o uno creado por el admin. */
  rol: string;
  estado: EstadoUsuario;
  cantidadPenalizaciones: number;
  createdAt: string;
  /** Si su rol puede dictar clases. Solo a estos usuarios se les puede aplicar una penalización. */
  puedeDarClases: boolean;
}

interface Persona {
  id: string;
  nombre: string;
  apellido: string;
}

export interface DenunciaAdmin {
  id: string;
  /** Decide qué acciones de resolución ofrece la pantalla. */
  tipo: "CLASE" | "RESENIA";
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  /** Null en las denuncias sobre una reseña: el autor viaja dentro de `resenia`. */
  alumno: Persona | null;
  instructor: Persona;
  denunciante: Persona;
  resenia: { id: string; puntaje: number; comentario: string | null; autor: Persona; oculta: boolean } | null;
  motivo: string;
  estado: EstadoDenuncia;
  resolucion: ResolucionDenuncia | null;
  detalle: string | null;
  pago: { id: string; estado: string; monto: number; metodo: string } | null;
  createdAt: string;
}

function aplanarActividad(r: ActividadCamposComunes, proximaClase?: ActividadListResp["proximaClase"]): Actividad {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: "",
    tipoActividadId: r.tipoActividad.id,
    nivelIntensidadId: r.nivelIntensidad.id,
    nivelIntensidad: r.nivelIntensidad.nombre,
    instructorId: r.instructor.id,
    precio: Number(r.precio),
    ubicacion: r.ubicacion,
    photoTint: r.photoTint,
    rating: Number(r.rating ?? 0),
    duracionMin: r.duracionMin,
    imagenes: "imagenes" in r ? (r as ActividadDetalleResp).imagenes : undefined,
    lat: r.latitud ?? undefined,
    lng: r.longitud ?? undefined,
    proximaClase: proximaClase
      ? {
          fechaHora: proximaClase.fechaHora,
          estado: proximaClase.estado as EstadoClase,
          cuposMax: proximaClase.cuposMax,
          cuposOcupados: proximaClase.cuposOcupados,
        }
      : undefined,
  };
}

function aplanarClase(r: ClaseResp | ClaseDetalleResp): Clase {
  return {
    id: r.id,
    actividadId: "",
    fechaHora: r.fechaHora,
    horaFin: r.horaFin,
    estado: r.estado as Clase["estado"],
    cuposMax: r.cuposMax,
    cuposOcupados: r.cuposOcupados,
    cantidadPreInscripcion: "cantidadPreInscripcion" in r ? r.cantidadPreInscripcion : undefined,
  };
}

interface ActividadInput {
  nombre: string;
  descripcion: string;
  tipoActividadId: string;
  nivelIntensidadId: string;
  precio: number;
  ubicacion: string;
  photoTint: string;
  /** Duración de una clase en minutos. El cupo se define por clase, no acá. */
  duracionMin: number;
  lat?: number;
  lng?: number;
}

interface NivelIntensidadInput {
  nombre: string;
  descripcion: string;
}

interface ClaseInput {
  fechaHora: string;
  /** Fin de la clase. Obligatorio: el backend valida que sea posterior al inicio. */
  horaFin: string;
  cuposMax: number;
  repetirSemanalmente?: boolean;
  /** Fecha de corte de la repetición (YYYY-MM-DD). Sin valor = sin corte. */
  repetirHasta?: string;
}

interface TipoActividadInput {
  nombre: string;
  categoriaId: string;
}

interface CategoriaInput {
  nombre: string;
}

interface DataContextValue {
  // catálogo real
  categorias: Categoria[];
  nivelesIntensidad: NivelIntensidad[];
  getNivelIntensidad: (id: string) => NivelIntensidad | undefined;
  tiposActividad: TipoActividad[];
  actividades: Actividad[];
  clases: Clase[];
  instructorNombre: Record<string, string>;
  cargandoCatalogo: boolean;
  /** La carga del catálogo falló: las pantallas muestran "Reintentar" en vez de un vacío que miente. */
  errorCatalogo: boolean;
  refrescarCatalogo: () => Promise<void>;

  getActividad: (id: string) => Actividad | undefined;
  getTipoActividad: (id: string) => TipoActividad | undefined;
  getCategoria: (id: string) => Categoria | undefined;
  getClasesDeActividad: (actividadId: string) => Clase[];
  cargarDetalleActividad: (id: string) => Promise<ActividadDetalleResp>;

  crearActividad: (input: ActividadInput) => Promise<Actividad>;
  actualizarActividad: (id: string, input: ActividadInput) => Promise<Actividad>;
  eliminarActividad: (id: string) => Promise<void>;

  crearClase: (actividadId: string, input: ClaseInput) => Promise<Clase>;
  actualizarClase: (id: string, actividadId: string, input: ClaseInput) => Promise<Clase>;
  eliminarClase: (id: string, actividadId: string) => Promise<void>;
  cancelarClase: (id: string) => Promise<void>;
  notificarAusenciaProfesor: (claseId: string, mensaje: string) => Promise<void>;
  listarNotificaciones: () => Promise<Notificacion[]>;
  marcarNotificacionesLeidas: () => Promise<void>;

  crearTipoActividad: (input: TipoActividadInput) => Promise<TipoActividad>;
  actualizarTipoActividad: (id: string, input: TipoActividadInput) => Promise<TipoActividad>;
  eliminarTipoActividad: (id: string) => Promise<void>;

  crearNivelIntensidad: (input: NivelIntensidadInput) => Promise<void>;
  actualizarNivelIntensidad: (id: string, input: NivelIntensidadInput) => Promise<void>;
  eliminarNivelIntensidad: (id: string) => Promise<void>;
  crearCategoria: (input: CategoriaInput) => Promise<Categoria>;
  actualizarCategoria: (id: string, input: CategoriaInput) => Promise<Categoria>;
  eliminarCategoria: (id: string) => Promise<void>;

  // inscripción / pago real
  inscribirse: (clase: Clase, alumnoId: string, metodo?: "Mercado Pago" | "Efectivo") => Promise<void>;
  cancelarInscripcion: (id: string) => Promise<void>;
  confirmarCobroEfectivo: (inscripcionId: string) => Promise<void>;
  listarMisInscripciones: (estado?: EstadoInscripcion) => Promise<MiInscripcion[]>;
  listarRosterClase: (claseId: string) => Promise<RosterClase>;
  listarMisClases: () => Promise<MiClaseInstructor[]>;
  listarInscripcionesMisClases: () => Promise<InscripcionMiClase[]>;

  // validación de instructores (admin, real)
  listarInstructores: (estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO") => Promise<InstructorAdmin[]>;
  obtenerInstructor: (id: string) => Promise<InstructorAdmin>;
  listarClasesInstructor: (id: string) => Promise<ClaseInstructorAdmin[]>;
  listarClasesAdmin: () => Promise<ClaseAdmin[]>;
  subirDocumento: (archivo: File) => Promise<DocumentoInstructor>;
  listarDocumentosInstructor: (instructorId: string) => Promise<DocumentoInstructor[]>;
  verDocumentoInstructor: (instructorId: string, documentoId: string) => Promise<void>;
  aprobarInstructor: (id: string) => Promise<void>;
  rechazarInstructor: (id: string, motivo?: string) => Promise<void>;
  subirFotoPerfil: (archivo: File) => Promise<{ usuarioId: string }>;
  subirFotoActividad: (actividadId: string, archivo: File) => Promise<{ actividadId: string }>;

  // reseñas real
  crearResenia: (claseId: string, puntaje: number, comentario: string) => Promise<void>;
  eliminarResenia: (id: string) => Promise<void>;
  listarResenasActividad: (actividadId: string) => Promise<ReseniaActividad[]>;
  listarMisResenas: () => Promise<MiResenia[]>;
  listarResenasInstructor: () => Promise<ReseniaInstructor[]>;
  listarResenasPendientes: () => Promise<ReseniaPendiente[]>;
  aprobarResenia: (id: string) => Promise<void>;
  rechazarResenia: (id: string) => Promise<void>;

  // denuncias real
  crearDenuncia: (claseId: string, motivo: string) => Promise<void>;
  listarMisDenuncias: () => Promise<MiDenuncia[]>;
  listarDenunciasAdmin: () => Promise<DenunciaAdmin[]>;
  /** `detalle`: texto que el denunciante ve junto a la resolución (E3A-HU11 criterio 7). */
  resolverDenuncia: (id: string, accion: AccionResolucion, detalle?: string, sancion?: SancionSuspension) => Promise<void>;
  tomarDenuncia: (id: string) => Promise<void>;
  listarMisPagos: () => Promise<MiPago[]>;
  actualizarResenia: (id: string, puntaje: number, comentario: string) => Promise<void>;
  actualizarUsuarioAdmin: (id: string, input: ActualizarUsuarioAdminInput) => Promise<void>;
  responderResenia: (
    id: string,
    respuesta: string,
  ) => Promise<{ id: string; respuestaInstructor: string; respuestaInstructorAt: string }>;
  denunciarResenia: (id: string, motivo: string) => Promise<void>;
  agregarImagenActividad: (
    actividadId: string,
    archivo: File,
  ) => Promise<{ id: string; actividadId: string; orden: number }>;
  eliminarImagenActividad: (actividadId: string, imagenId: string) => Promise<void>;
  listarPenalizaciones: () => Promise<PenalizacionAdmin[]>;
  listarRolesPermisos: () => Promise<RolesPermisos>;
  /** Cambia el rol de una cuenta, incluidos los roles creados por el admin. */
  asignarRolUsuario: (usuarioId: string, rolId: string) => Promise<void>;
  actualizarPermisosRol: (rolId: string, permisos: string[]) => Promise<void>;
  crearRol: (nombre: string, descripcion?: string) => Promise<RolAdmin>;
  crearPenalizacion: (input: CrearPenalizacionInput) => Promise<void>;

  // gestión de usuarios real
  listarUsuariosAdmin: () => Promise<UsuarioAdmin[]>;
  actualizarEstadoUsuario: (id: string, estado: EstadoUsuario) => Promise<void>;

  // auditoría real
  listarAuditoria: () => Promise<AuditoriaEntry[]>;

  // inscripciones/pagos de la plataforma (admin) real
  listarInscripcionesAdmin: () => Promise<InscripcionAdmin[]>;

  // favoritos reales
  listarMisFavoritos: () => Promise<string[]>;
  agregarFavorito: (actividadId: string) => Promise<void>;
  quitarFavorito: (actividadId: string) => Promise<void>;

}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nivelesIntensidad, setNivelesIntensidad] = useState<NivelIntensidad[]>([]);
  const [tiposActividad, setTiposActividad] = useState<TipoActividad[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [instructorNombre, setInstructorNombre] = useState<Record<string, string>>({});
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState(false);

  const refrescarCatalogo = useCallback(() => {
    return Promise.all([
      api.get<CategoriaResp[]>("/api/categorias"),
      api.get<TipoActividadResp[]>("/api/tipos-actividad"),
      api.get<NivelIntensidad[]>("/api/niveles-intensidad"),
      api.get<ActividadListResp[]>("/api/actividades"),
    ])
      .then(([cats, tipos, niveles, acts]) => {
        setCategorias(cats);
        setTiposActividad(tipos);
        setNivelesIntensidad(niveles);
        setActividades((prev) => {
          const previas = new Map(prev.map((a) => [a.id, a]));
          return acts.map((r) => {
            const anterior = previas.get(r.id);
            const plano = aplanarActividad(r, r.proximaClase ?? undefined);
            return anterior ? { ...plano, descripcion: anterior.descripcion } : plano;
          });
        });
        const nombres: Record<string, string> = {};
        for (const a of acts) nombres[a.instructor.id] = `${a.instructor.nombre} ${a.instructor.apellido}`;
        setInstructorNombre(nombres);
        setErrorCatalogo(false);
      })
      .catch(() => {
        // Sin esto la excepción quedaba sin atrapar y el catálogo vacío se veía igual que
        // "no hay actividades publicadas".
        setErrorCatalogo(true);
      })
      .finally(() => setCargandoCatalogo(false));
  }, []);

  useEffect(() => {
    refrescarCatalogo();
  }, [refrescarCatalogo]);

  const getActividad = useCallback((id: string) => actividades.find((a) => a.id === id), [actividades]);
  const getTipoActividad = useCallback((id: string) => tiposActividad.find((t) => t.id === id), [tiposActividad]);
  const getCategoria = useCallback((id: string) => categorias.find((c) => c.id === id), [categorias]);
  const getNivelIntensidad = useCallback(
    (id: string) => nivelesIntensidad.find((n) => n.id === id),
    [nivelesIntensidad],
  );
  const getClasesDeActividad = useCallback(
    (actividadId: string) => clases.filter((c) => c.actividadId === actividadId),
    [clases],
  );

  const cargarDetalleActividad = useCallback(async (id: string) => {
    const r = await api.get<ActividadDetalleResp>(`/api/actividades/${id}`);
    setActividades((prev) => {
      const anterior = prev.find((a) => a.id === id);
      const plano: Actividad = { ...aplanarActividad(r, anterior?.proximaClase), descripcion: r.descripcion };
      const existe = prev.some((a) => a.id === id);
      return existe ? prev.map((a) => (a.id === id ? plano : a)) : [...prev, plano];
    });
    setClases((prev) => {
      const propias = r.clases.map((c) => ({ ...aplanarClase(c), actividadId: id }));
      const otras = prev.filter((c) => c.actividadId !== id);
      return [...otras, ...propias];
    });
    setInstructorNombre((prev) => ({ ...prev, [r.instructor.id]: `${r.instructor.nombre} ${r.instructor.apellido}` }));
    return r;
  }, []);

  const soloCamposActividad = (input: ActividadInput) => ({
    nombre: input.nombre,
    descripcion: input.descripcion,
    tipoActividadId: input.tipoActividadId,
    nivelIntensidadId: input.nivelIntensidadId,
    precio: input.precio,
    ubicacion: input.ubicacion,
    photoTint: input.photoTint,
    duracionMin: input.duracionMin,
    latitud: input.lat ?? null,
    longitud: input.lng ?? null,
  });

  const crearActividad = useCallback(async (input: ActividadInput) => {
    const r = await api.post<ActividadCamposComunes & { descripcion: string }>(
      "/api/instructor/actividades",
      soloCamposActividad(input),
    );
    const nueva: Actividad = { ...aplanarActividad(r), descripcion: input.descripcion };
    setActividades((prev) => [...prev, nueva]);
    return nueva;
  }, []);

  const actualizarActividad = useCallback(async (id: string, input: ActividadInput) => {
    const r = await api.put<ActividadCamposComunes & { descripcion: string }>(
      `/api/instructor/actividades/${id}`,
      soloCamposActividad(input),
    );
    const actualizada: Actividad = { ...aplanarActividad(r), descripcion: input.descripcion };
    setActividades((prev) => prev.map((a) => (a.id === id ? actualizada : a)));
    return actualizada;
  }, []);

  const eliminarActividad = useCallback(async (id: string) => {
    await api.delete(`/api/instructor/actividades/${id}`);
    setActividades((prev) => prev.filter((a) => a.id !== id));
    setClases((prev) => prev.filter((c) => c.actividadId !== id));
  }, []);

  const crearClase = useCallback(async (actividadId: string, input: ClaseInput) => {
    const r = await api.post<ClaseResp>(`/api/instructor/actividades/${actividadId}/clases`, input);
    const nueva: Clase = { ...aplanarClase(r), actividadId };
    setClases((prev) => [...prev, nueva]);
    return nueva;
  }, []);

  const actualizarClase = useCallback(async (id: string, actividadId: string, input: ClaseInput) => {
    const r = await api.put<ClaseResp>(`/api/instructor/clases/${id}`, input);
    const actualizada: Clase = { ...aplanarClase(r), actividadId };
    setClases((prev) => prev.map((c) => (c.id === id ? actualizada : c)));
    return actualizada;
  }, []);

  const eliminarClase = useCallback(async (id: string, actividadId: string) => {
    await api.delete(`/api/instructor/clases/${id}`);
    setClases((prev) => prev.filter((c) => c.id !== id));
    void actividadId;
  }, []);

  const cancelarClase = useCallback(async (id: string) => {
    await api.post(`/api/instructor/clases/${id}/cancelar`);
    setClases((prev) => prev.map((c) => (c.id === id ? { ...c, estado: "Cancelada" } : c)));
  }, []);

  const notificarAusenciaProfesor = useCallback(async (claseId: string, mensaje: string) => {
    await api.post(`/api/instructor/clases/${claseId}/notificar-ausencia`, { mensaje });
    setClases((prev) => prev.map((c) => (c.id === claseId ? { ...c, estado: "Cancelada" } : c)));
  }, []);

  const listarNotificaciones = useCallback(async () => {
    return api.get<Notificacion[]>("/api/notificaciones");
  }, []);

  const marcarNotificacionesLeidas = useCallback(async () => {
    await api.post("/api/notificaciones/marcar-leidas");
  }, []);

  const crearTipoActividad = useCallback(async (input: TipoActividadInput) => {
    const nuevo = await api.post<TipoActividadResp>("/api/admin/tipos-actividad", input);
    setTiposActividad((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarTipoActividad = useCallback(async (id: string, input: TipoActividadInput) => {
    const actualizado = await api.put<TipoActividadResp>(`/api/admin/tipos-actividad/${id}`, input);
    setTiposActividad((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
    return actualizado;
  }, []);

  const eliminarTipoActividad = useCallback(async (id: string) => {
    await api.delete(`/api/admin/tipos-actividad/${id}`);
    setTiposActividad((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const crearCategoria = useCallback(async (input: CategoriaInput) => {
    const nueva = await api.post<CategoriaResp>("/api/admin/categorias", input);
    setCategorias((prev) => [...prev, nueva]);
    return nueva;
  }, []);

  const actualizarCategoria = useCallback(async (id: string, input: CategoriaInput) => {
    const actualizada = await api.put<CategoriaResp>(`/api/admin/categorias/${id}`, input);
    setCategorias((prev) => prev.map((c) => (c.id === id ? actualizada : c)));
    return actualizada;
  }, []);

  const eliminarCategoria = useCallback(async (id: string) => {
    await api.delete(`/api/admin/categorias/${id}`);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // E4Ad-HU05. Los niveles vuelven a leerse enteros despues de cada alta/baja porque la
  // respuesta del backend no trae el contador de actividades y la tabla lo muestra.
  const crearNivelIntensidad = useCallback(async (input: NivelIntensidadInput) => {
    await api.post("/api/admin/niveles-intensidad", input);
    setNivelesIntensidad(await api.get<NivelIntensidad[]>("/api/niveles-intensidad"));
  }, []);

  const actualizarNivelIntensidad = useCallback(async (id: string, input: NivelIntensidadInput) => {
    await api.put(`/api/admin/niveles-intensidad/${id}`, input);
    setNivelesIntensidad(await api.get<NivelIntensidad[]>("/api/niveles-intensidad"));
  }, []);

  const eliminarNivelIntensidad = useCallback(async (id: string) => {
    await api.delete(`/api/admin/niveles-intensidad/${id}`);
    setNivelesIntensidad((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const inscribirse = useCallback(
    async (clase: Clase, _alumnoId: string, metodo?: "Mercado Pago" | "Efectivo") => {
      void _alumnoId;
      if (!metodo) {
        await api.post(`/api/alumno/clases/${clase.id}/preinscripciones`);
      } else {
        await api.post(`/api/alumno/clases/${clase.id}/inscripciones`, { metodoPago: metodo });
      }
      setClases((prev) => prev.map((c) => (c.id === clase.id ? { ...c, cuposOcupados: c.cuposOcupados + (metodo ? 1 : 0) } : c)));
    },
    [],
  );

  const cancelarInscripcion = useCallback(async (id: string) => {
    await api.delete(`/api/alumno/inscripciones/${id}`);
  }, []);

  const confirmarCobroEfectivo = useCallback(async (inscripcionId: string) => {
    await api.post(`/api/instructor/inscripciones/${inscripcionId}/confirmar-cobro`);
  }, []);


  const listarMisInscripciones = useCallback(async (estado?: EstadoInscripcion) => {
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
    return api.get<MiInscripcion[]>(`/api/alumno/inscripciones${query}`);
  }, []);

  const listarRosterClase = useCallback(async (claseId: string) => {
    return api.get<RosterClase>(`/api/instructor/clases/${claseId}/roster`);
  }, []);

  // Clases e inscripciones propias del instructor. Son la fuente REAL de Panel, Próximas
  // clases, Métricas e Historial: esas pantallas ya no dependen de la caché parcial
  // `clases` ni del dataset mock `inscripciones`.
  const listarMisClases = useCallback(async () => {
    return api.get<MiClaseInstructor[]>("/api/instructor/clases");
  }, []);

  const listarInscripcionesMisClases = useCallback(async () => {
    return api.get<InscripcionMiClase[]>("/api/instructor/inscripciones");
  }, []);

  const listarInstructores = useCallback(async (estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO") => {
    const query = estado ? `?estado=${estado}` : "";
    return api.get<InstructorAdmin[]>(`/api/admin/instructores${query}`);
  }, []);

  const obtenerInstructor = useCallback(async (id: string) => {
    return api.get<InstructorAdmin>(`/api/admin/instructores/${id}`);
  }, []);

  const listarClasesInstructor = useCallback(async (id: string) => {
    return api.get<ClaseInstructorAdmin[]>(`/api/admin/instructores/${id}/clases`);
  }, []);

  const listarClasesAdmin = useCallback(async () => {
    return api.get<ClaseAdmin[]>("/api/admin/clases");
  }, []);

  const subirDocumento = useCallback(async (archivo: File) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    return api.postForm<DocumentoInstructor>("/api/instructor/documentos", formData);
  }, []);

  const subirFotoPerfil = useCallback(async (archivo: File) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    return api.postForm<{ usuarioId: string }>("/api/usuarios/foto", formData);
  }, []);

  const subirFotoActividad = useCallback(async (actividadId: string, archivo: File) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    return api.postForm<{ actividadId: string }>(`/api/instructor/actividades/${actividadId}/foto`, formData);
  }, []);

  const listarDocumentosInstructor = useCallback(async (instructorId: string) => {
    return api.get<DocumentoInstructor[]>(`/api/admin/instructores/${instructorId}/documentos`);
  }, []);

  const verDocumentoInstructor = useCallback(async (instructorId: string, documentoId: string) => {
    // Abrimos la pestaña ya (sincrónico, dentro del gesto del click) y recién
    // después buscamos el archivo — si esperáramos el fetch primero, la
    // mayoría de los navegadores bloquean el popup por no venir de un click.
    const ventana = window.open("", "_blank");
    try {
      const blob = await api.getBlob(`/api/admin/instructores/${instructorId}/documentos/${documentoId}/archivo`);
      const url = URL.createObjectURL(blob);
      if (ventana) ventana.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      throw err;
    }
  }, []);

  const aprobarInstructor = useCallback(async (id: string) => {
    await api.post(`/api/admin/instructores/${id}/aprobar`);
  }, []);

  const rechazarInstructor = useCallback(async (id: string, motivo?: string) => {
    await api.post(`/api/admin/instructores/${id}/rechazar`, { motivo });
  }, []);

  const crearResenia = useCallback(async (claseId: string, puntaje: number, comentario: string) => {
    await api.post(`/api/alumno/clases/${claseId}/resenas`, { puntaje, comentario });
  }, []);

  const eliminarResenia = useCallback(async (id: string) => {
    await api.delete(`/api/alumno/resenas/${id}`);
  }, []);

  const listarResenasActividad = useCallback(async (actividadId: string) => {
    return api.get<ReseniaActividad[]>(`/api/actividades/${actividadId}/resenas`);
  }, []);

  const listarMisResenas = useCallback(async () => {
    return api.get<MiResenia[]>("/api/alumno/resenas");
  }, []);

  const listarResenasInstructor = useCallback(async () => {
    return api.get<ReseniaInstructor[]>("/api/instructor/resenas");
  }, []);

  const listarResenasPendientes = useCallback(async () => {
    return api.get<ReseniaPendiente[]>("/api/admin/resenas");
  }, []);

  const aprobarResenia = useCallback(async (id: string) => {
    await api.post(`/api/admin/resenas/${id}/aprobar`);
  }, []);

  const rechazarResenia = useCallback(async (id: string) => {
    await api.post(`/api/admin/resenas/${id}/rechazar`);
  }, []);

  const crearDenuncia = useCallback(async (claseId: string, motivo: string) => {
    await api.post(`/api/alumno/clases/${claseId}/denuncias`, { motivo });
  }, []);

  const listarMisDenuncias = useCallback(async () => {
    return api.get<MiDenuncia[]>("/api/alumno/denuncias");
  }, []);

  const listarDenunciasAdmin = useCallback(async () => {
    return api.get<DenunciaAdmin[]>("/api/admin/denuncias");
  }, []);

  const resolverDenuncia = useCallback(
    async (id: string, accion: AccionResolucion, detalle?: string, sancion?: SancionSuspension) => {
      await api.post(`/api/admin/denuncias/${id}/resolver`, {
        accion,
        detalle: detalle?.trim() || undefined,
        // Solo viajan con SUSPENDER; el backend los exige en ese caso.
        montoMulta: sancion?.montoMulta,
        diasSuspension: sancion?.diasSuspension,
      });
    },
    [],
  );

  // Pendiente -> En Auditoría al abrir la denuncia (E4Ad-HU07 criterio 3).
  const tomarDenuncia = useCallback(async (id: string) => {
    await api.post(`/api/admin/denuncias/${id}/auditar`);
  }, []);

  const listarMisPagos = useCallback(async () => {
    return api.get<MiPago[]>("/api/alumno/pagos");
  }, []);

  // Edición real: antes "editar" era borrar y volver a crear en dos requests sin transacción.
  const actualizarResenia = useCallback(async (id: string, puntaje: number, comentario: string) => {
    await api.put(`/api/alumno/resenas/${id}`, { puntaje, comentario });
  }, []);

  // RN-19: los permisos salen de ConfiguracionRol, no de una constante del componente.
  const listarRolesPermisos = useCallback(async () => {
    return api.get<RolesPermisos>("/api/admin/roles");
  }, []);

  const asignarRolUsuario = useCallback(async (usuarioId: string, rolId: string) => {
    await api.put(`/api/admin/usuarios/${usuarioId}/rol`, { rolId });
  }, []);

  const actualizarPermisosRol = useCallback(async (rolId: string, permisos: string[]) => {
    // Se manda la foto completa del rol: lo que no viaja queda deshabilitado.
    await api.put(`/api/admin/roles/${rolId}/permisos`, { permisos });
  }, []);

  const crearRol = useCallback(async (nombre: string, descripcion?: string) => {
    return api.post<RolAdmin>("/api/admin/roles", { nombre, descripcion });
  }, []);

  const actualizarUsuarioAdmin = useCallback(async (id: string, input: ActualizarUsuarioAdminInput) => {
    await api.put(`/api/admin/usuarios/${id}`, input);
  }, []);

  // E2I-HU11 criterio 4. Antes las dos acciones eran estado local de la pantalla: la
  // respuesta y la denuncia se perdían al recargar.
  const responderResenia = useCallback(async (id: string, respuesta: string) => {
    return api.post<{ id: string; respuestaInstructor: string; respuestaInstructorAt: string }>(
      `/api/instructor/resenas/${id}/respuesta`,
      { respuesta },
    );
  }, []);

  const denunciarResenia = useCallback(async (id: string, motivo: string) => {
    await api.post(`/api/instructor/resenas/${id}/denuncia`, { motivo });
  }, []);

  // Galería de la actividad (sección 2: `imagenes[]`). La portada sigue siendo `subirFotoActividad`.
  const agregarImagenActividad = useCallback(async (actividadId: string, archivo: File) => {
    const fd = new FormData();
    fd.append("archivo", archivo);
    return api.postForm<{ id: string; actividadId: string; orden: number }>(
      `/api/instructor/actividades/${actividadId}/imagenes`,
      fd,
    );
  }, []);

  const eliminarImagenActividad = useCallback(async (actividadId: string, imagenId: string) => {
    await api.delete(`/api/instructor/actividades/${actividadId}/imagenes/${imagenId}`);
  }, []);

  const listarPenalizaciones = useCallback(async () => {
    return api.get<PenalizacionAdmin[]>("/api/admin/penalizaciones");
  }, []);

  const crearPenalizacion = useCallback(async (input: CrearPenalizacionInput) => {
    await api.post("/api/admin/penalizaciones", input);
  }, []);

  const listarUsuariosAdmin = useCallback(async () => {
    return api.get<UsuarioAdmin[]>("/api/admin/usuarios");
  }, []);

  const actualizarEstadoUsuario = useCallback(async (id: string, estado: EstadoUsuario) => {
    await api.post(`/api/admin/usuarios/${id}/estado`, { estado });
  }, []);

  const listarAuditoria = useCallback(async () => {
    return api.get<AuditoriaEntry[]>("/api/admin/auditoria");
  }, []);

  const listarInscripcionesAdmin = useCallback(async () => {
    return api.get<InscripcionAdmin[]>("/api/admin/inscripciones");
  }, []);

  const listarMisFavoritos = useCallback(async () => {
    return api.get<string[]>("/api/alumno/favoritos");
  }, []);

  const agregarFavorito = useCallback(async (actividadId: string) => {
    await api.post(`/api/alumno/actividades/${actividadId}/favorito`);
  }, []);

  const quitarFavorito = useCallback(async (actividadId: string) => {
    await api.delete(`/api/alumno/actividades/${actividadId}/favorito`);
  }, []);


  const value: DataContextValue = useMemo(
    () => ({
      categorias,
      nivelesIntensidad,
      getNivelIntensidad,
      tiposActividad,
      actividades,
      clases,
      instructorNombre,
      cargandoCatalogo,
      errorCatalogo,
      refrescarCatalogo,
      getActividad,
      getTipoActividad,
      getCategoria,
      getClasesDeActividad,
      cargarDetalleActividad,
      crearActividad,
      actualizarActividad,
      eliminarActividad,
      crearClase,
      actualizarClase,
      eliminarClase,
      cancelarClase,
      notificarAusenciaProfesor,
      listarNotificaciones,
      marcarNotificacionesLeidas,
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      crearNivelIntensidad,
      actualizarNivelIntensidad,
      eliminarNivelIntensidad,
      crearCategoria,
      actualizarCategoria,
      eliminarCategoria,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      listarMisInscripciones,
      listarRosterClase,
      listarMisClases,
      listarInscripcionesMisClases,
      listarInstructores,
      obtenerInstructor,
      listarClasesInstructor,
      listarClasesAdmin,
      subirDocumento,
      listarDocumentosInstructor,
      verDocumentoInstructor,
      aprobarInstructor,
      rechazarInstructor,
      subirFotoPerfil,
      subirFotoActividad,
      crearResenia,
      eliminarResenia,
      listarResenasActividad,
      listarMisResenas,
      listarResenasInstructor,
      listarResenasPendientes,
      aprobarResenia,
      rechazarResenia,
      crearDenuncia,
      listarMisDenuncias,
      listarDenunciasAdmin,
      resolverDenuncia,
      tomarDenuncia,
      listarMisPagos,
      actualizarResenia,
      actualizarUsuarioAdmin,
      responderResenia,
      denunciarResenia,
      agregarImagenActividad,
      eliminarImagenActividad,
      listarPenalizaciones,
      listarRolesPermisos,
      asignarRolUsuario,
      actualizarPermisosRol,
      crearRol,
      crearPenalizacion,
      listarUsuariosAdmin,
      actualizarEstadoUsuario,
      listarAuditoria,
      listarInscripcionesAdmin,
      listarMisFavoritos,
      agregarFavorito,
      quitarFavorito,
    }),
    [
      categorias,
      nivelesIntensidad,
      getNivelIntensidad,
      tiposActividad,
      actividades,
      clases,
      instructorNombre,
      cargandoCatalogo,
      errorCatalogo,
      refrescarCatalogo,
      getActividad,
      getTipoActividad,
      getCategoria,
      getClasesDeActividad,
      cargarDetalleActividad,
      crearActividad,
      actualizarActividad,
      eliminarActividad,
      crearClase,
      actualizarClase,
      eliminarClase,
      cancelarClase,
      notificarAusenciaProfesor,
      listarNotificaciones,
      marcarNotificacionesLeidas,
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      crearNivelIntensidad,
      actualizarNivelIntensidad,
      eliminarNivelIntensidad,
      crearCategoria,
      actualizarCategoria,
      eliminarCategoria,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      listarMisInscripciones,
      listarRosterClase,
      listarMisClases,
      listarInscripcionesMisClases,
      listarInstructores,
      obtenerInstructor,
      listarClasesInstructor,
      listarClasesAdmin,
      subirDocumento,
      listarDocumentosInstructor,
      verDocumentoInstructor,
      aprobarInstructor,
      rechazarInstructor,
      subirFotoPerfil,
      subirFotoActividad,
      crearResenia,
      eliminarResenia,
      listarResenasActividad,
      listarMisResenas,
      listarResenasInstructor,
      listarResenasPendientes,
      aprobarResenia,
      rechazarResenia,
      crearDenuncia,
      listarMisDenuncias,
      listarDenunciasAdmin,
      resolverDenuncia,
      tomarDenuncia,
      listarMisPagos,
      actualizarResenia,
      actualizarUsuarioAdmin,
      responderResenia,
      denunciarResenia,
      agregarImagenActividad,
      eliminarImagenActividad,
      listarPenalizaciones,
      listarRolesPermisos,
      asignarRolUsuario,
      actualizarPermisosRol,
      crearRol,
      crearPenalizacion,
      listarUsuariosAdmin,
      actualizarEstadoUsuario,
      listarAuditoria,
      listarInscripcionesAdmin,
      listarMisFavoritos,
      agregarFavorito,
      quitarFavorito,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

