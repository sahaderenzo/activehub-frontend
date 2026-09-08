import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Actividad,
  ActividadFavorita,
  Categoria,
  Clase,
  EstadoClase,
  EstadoDenuncia,
  EstadoInscripcion,
  EstadoPago,
  EstadoUsuario,
  Inscripcion,
  Pago,
  Penalizacion,
  RolNombre,
  TipoActividad,
  TipoPenalizacion,
} from "../lib/types";
import {
  favoritos as seedFavoritos,
  inscripciones as seedInscripciones,
  pagos as seedPagos,
  penalizaciones as seedPenalizaciones,
} from "../lib/mockData";
import { api } from "../lib/api";

/**
 * Catálogo, inscripción y pago (del alumno/instructor logueado) están
 * cableados a activehub-api real vía funciones dedicadas
 * (inscribirse/cancelarInscripcion/confirmarCobroEfectivo/listarMisInscripciones/
 * listarRosterClase). Los arrays `inscripciones`/`pagos` de acá abajo son un
 * mock estático sin relación con esas llamadas reales: los usan pantallas de
 * analítica/administración de alcance amplio (Dashboard, Reportes, Métricas)
 * para las que todavía no existe un endpoint "todas las inscripciones de la
 * plataforma" — quedan como estaban, sin tocar, igual que
 * penalizaciones/favoritos. Reseñas y denuncias ya están cableadas a la API
 * real (ver secciones correspondientes más abajo).
 */

const MOCK_KEY = "ah_data_mock";

interface MockShape {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  penalizaciones: Penalizacion[];
  favoritos: ActividadFavorita[];
}

function seedMock(): MockShape {
  return {
    inscripciones: seedInscripciones,
    pagos: seedPagos,
    penalizaciones: seedPenalizaciones,
    favoritos: seedFavoritos,
  };
}

function loadMock(): MockShape {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockShape;
  } catch {
    /* ignore corrupt storage */
  }
  return seedMock();
}

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now()}-${uid}`;
}

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
  nivelIntensidad: string;
  instructor: { id: string; nombre: string; apellido: string };
  precio: number;
  ubicacion: string;
  photoTint: string;
  rating: number | null;
  cuposMax: number;
}

interface ActividadListResp extends ActividadCamposComunes {
  proximaClase: { fechaHora: string; estado: string; cuposMax: number; cuposOcupados: number } | null;
}

interface ClaseResp {
  id: string;
  fechaHora: string;
  estado: string;
  cuposMax: number;
  cuposOcupados: number;
}

interface ClaseDetalleResp extends ClaseResp {
  cantidadPreInscripcion: number;
}

interface ActividadDetalleResp extends ActividadCamposComunes {
  descripcion: string;
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
  presente?: boolean | null;
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
  tipo: TipoPenalizacion;
  motivo: string;
  monto?: number;
  fechaInicio?: string;
  fechaFin?: string;
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
  comentario: string;
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
  comentario: string;
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
  comentario: string;
  enModeracion: boolean;
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
  comentario: string;
  createdAt: string;
}

export type AccionResolucion = "REINTEGRAR" | "SUSPENDER" | "PENALIZAR" | "DESESTIMAR";

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

export interface MiDenuncia {
  id: string;
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  motivo: string;
  estado: EstadoDenuncia;
  createdAt: string;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: RolNombre;
  estado: EstadoUsuario;
  cantidadPenalizaciones: number;
  createdAt: string;
}

export interface DenunciaAdmin {
  id: string;
  claseId: string;
  claseFechaHora: string;
  actividadId: string;
  actividadNombre: string;
  alumno: { id: string; nombre: string; apellido: string };
  instructor: { id: string; nombre: string; apellido: string };
  motivo: string;
  estado: EstadoDenuncia;
  pago: { id: string; estado: string; monto: number; metodo: string } | null;
  createdAt: string;
}

function aplanarActividad(r: ActividadCamposComunes, proximaClase?: ActividadListResp["proximaClase"]): Actividad {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: "",
    tipoActividadId: r.tipoActividad.id,
    nivelIntensidad: r.nivelIntensidad as Actividad["nivelIntensidad"],
    instructorId: r.instructor.id,
    precio: Number(r.precio),
    ubicacion: r.ubicacion,
    photoTint: r.photoTint,
    rating: Number(r.rating ?? 0),
    cuposMax: r.cuposMax,
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
  nivelIntensidad: string;
  precio: number;
  ubicacion: string;
  photoTint: string;
  cuposMax: number;
}

interface ClaseInput {
  fechaHora: string;
  cuposMax: number;
}

interface TipoActividadInput {
  nombre: string;
  categoriaId: string;
}

interface DataContextValue {
  // catálogo real
  categorias: Categoria[];
  tiposActividad: TipoActividad[];
  actividades: Actividad[];
  clases: Clase[];
  instructorNombre: Record<string, string>;
  cargandoCatalogo: boolean;

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

  crearTipoActividad: (input: TipoActividadInput) => Promise<TipoActividad>;
  actualizarTipoActividad: (id: string, input: TipoActividadInput) => Promise<TipoActividad>;
  eliminarTipoActividad: (id: string) => Promise<void>;

  // inscripción / pago real
  inscribirse: (clase: Clase, alumnoId: string, metodo?: "Mercado Pago" | "Efectivo") => Promise<void>;
  cancelarInscripcion: (id: string) => Promise<void>;
  confirmarCobroEfectivo: (inscripcionId: string) => Promise<void>;
  marcarAsistencia: (inscripcionId: string, presente: boolean) => Promise<void>;
  listarMisInscripciones: (estado?: EstadoInscripcion) => Promise<MiInscripcion[]>;
  listarRosterClase: (claseId: string) => Promise<RosterClase>;
  listarMisClases: () => Promise<MiClaseInstructor[]>;
  listarInscripcionesMisClases: () => Promise<InscripcionMiClase[]>;

  // validación de instructores (admin, real)
  listarInstructores: (estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO") => Promise<InstructorAdmin[]>;
  obtenerInstructor: (id: string) => Promise<InstructorAdmin>;
  listarClasesInstructor: (id: string) => Promise<ClaseInstructorAdmin[]>;
  listarClasesAdmin: () => Promise<ClaseAdmin[]>;
  aprobarInstructor: (id: string) => Promise<void>;
  rechazarInstructor: (id: string, motivo?: string) => Promise<void>;

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
  resolverDenuncia: (id: string, accion: AccionResolucion) => Promise<void>;
  tomarDenuncia: (id: string) => Promise<void>;
  listarPenalizaciones: () => Promise<PenalizacionAdmin[]>;
  crearPenalizacion: (input: CrearPenalizacionInput) => Promise<void>;

  // gestión de usuarios real
  listarUsuariosAdmin: () => Promise<UsuarioAdmin[]>;
  actualizarEstadoUsuario: (id: string, estado: EstadoUsuario) => Promise<void>;

  // auditoría real
  listarAuditoria: () => Promise<AuditoriaEntry[]>;

  // inscripciones/pagos de la plataforma (admin) real
  listarInscripcionesAdmin: () => Promise<InscripcionAdmin[]>;

  // fuera de alcance: mock puro, sin tocar
  inscripciones: Inscripcion[];
  pagos: Pago[];
  penalizaciones: Penalizacion[];
  favoritos: ActividadFavorita[];
  toggleFavorito: (usuarioId: string, actividadId: string) => void;
  aplicarPenalizacion: (input: Omit<Penalizacion, "id" | "createdAt">) => Penalizacion;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [mock, setMock] = useState<MockShape>(() => loadMock());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tiposActividad, setTiposActividad] = useState<TipoActividad[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [instructorNombre, setInstructorNombre] = useState<Record<string, string>>({});
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  useEffect(() => {
    localStorage.setItem(MOCK_KEY, JSON.stringify(mock));
  }, [mock]);

  const patchMock = useCallback(<K extends keyof MockShape>(key: K, updater: (list: MockShape[K]) => MockShape[K]) => {
    setMock((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  }, []);

  const refrescarCatalogo = useCallback(async () => {
    setCargandoCatalogo(true);
    try {
      const [cats, tipos, acts] = await Promise.all([
        api.get<CategoriaResp[]>("/api/categorias"),
        api.get<TipoActividadResp[]>("/api/tipos-actividad"),
        api.get<ActividadListResp[]>("/api/actividades"),
      ]);
      setCategorias(cats);
      setTiposActividad(tipos);
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
    } finally {
      setCargandoCatalogo(false);
    }
  }, []);

  useEffect(() => {
    refrescarCatalogo();
  }, [refrescarCatalogo]);

  const getActividad = useCallback((id: string) => actividades.find((a) => a.id === id), [actividades]);
  const getTipoActividad = useCallback((id: string) => tiposActividad.find((t) => t.id === id), [tiposActividad]);
  const getCategoria = useCallback((id: string) => categorias.find((c) => c.id === id), [categorias]);
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

  const soloCamposActividad = (input: ActividadInput): ActividadInput => ({
    nombre: input.nombre,
    descripcion: input.descripcion,
    tipoActividadId: input.tipoActividadId,
    nivelIntensidad: input.nivelIntensidad,
    precio: input.precio,
    ubicacion: input.ubicacion,
    photoTint: input.photoTint,
    cuposMax: input.cuposMax,
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

  const marcarAsistencia = useCallback(async (inscripcionId: string, presente: boolean) => {
    await api.post(`/api/instructor/inscripciones/${inscripcionId}/asistencia`, { presente });
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

  const resolverDenuncia = useCallback(async (id: string, accion: AccionResolucion) => {
    await api.post(`/api/admin/denuncias/${id}/resolver`, { accion });
  }, []);

  // Pendiente -> En Auditoría al abrir la denuncia (E4Ad-HU07 criterio 3).
  const tomarDenuncia = useCallback(async (id: string) => {
    await api.post(`/api/admin/denuncias/${id}/auditar`);
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

  // --- Fuera de alcance: mock puro (penalizaciones/favoritos) ---

  const toggleFavorito = useCallback(
    (usuarioId: string, actividadId: string) => {
      patchMock("favoritos", (l) => {
        const exists = l.some((f) => f.usuarioId === usuarioId && f.actividadId === actividadId);
        return exists ? l.filter((f) => !(f.usuarioId === usuarioId && f.actividadId === actividadId)) : [...l, { usuarioId, actividadId }];
      });
    },
    [patchMock],
  );

  const aplicarPenalizacion = useCallback(
    (input: Omit<Penalizacion, "id" | "createdAt">) => {
      const nueva: Penalizacion = { ...input, id: nextId("pen"), createdAt: new Date().toISOString() };
      patchMock("penalizaciones", (l) => [...l, nueva]);
      return nueva;
    },
    [patchMock],
  );

  const value: DataContextValue = useMemo(
    () => ({
      categorias,
      tiposActividad,
      actividades,
      clases,
      instructorNombre,
      cargandoCatalogo,
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
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      marcarAsistencia,
      listarMisInscripciones,
      listarRosterClase,
      listarMisClases,
      listarInscripcionesMisClases,
      listarInstructores,
      obtenerInstructor,
      listarClasesInstructor,
      listarClasesAdmin,
      aprobarInstructor,
      rechazarInstructor,
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
      listarPenalizaciones,
      crearPenalizacion,
      listarUsuariosAdmin,
      actualizarEstadoUsuario,
      listarAuditoria,
      listarInscripcionesAdmin,
      inscripciones: mock.inscripciones,
      pagos: mock.pagos,
      penalizaciones: mock.penalizaciones,
      favoritos: mock.favoritos,
      toggleFavorito,
      aplicarPenalizacion,
    }),
    [
      categorias,
      tiposActividad,
      actividades,
      clases,
      instructorNombre,
      cargandoCatalogo,
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
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      marcarAsistencia,
      listarMisInscripciones,
      listarRosterClase,
      listarMisClases,
      listarInscripcionesMisClases,
      listarInstructores,
      obtenerInstructor,
      listarClasesInstructor,
      listarClasesAdmin,
      aprobarInstructor,
      rechazarInstructor,
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
      listarPenalizaciones,
      crearPenalizacion,
      listarUsuariosAdmin,
      actualizarEstadoUsuario,
      listarAuditoria,
      listarInscripcionesAdmin,
      mock,
      toggleFavorito,
      aplicarPenalizacion,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

