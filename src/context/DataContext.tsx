import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Actividad,
  ActividadFavorita,
  Categoria,
  Clase,
  Denuncia,
  EstadoClase,
  EstadoDenuncia,
  EstadoInscripcion,
  Inscripcion,
  Pago,
  Penalizacion,
  Resenia,
  TipoActividad,
} from "../lib/types";
import {
  denuncias as seedDenuncias,
  favoritos as seedFavoritos,
  inscripciones as seedInscripciones,
  pagos as seedPagos,
  penalizaciones as seedPenalizaciones,
  resenias as seedResenias,
} from "../lib/mockData";
import { api } from "../lib/api";

/**
 * Catálogo, inscripción y pago (del alumno/instructor logueado) están
 * cableados a activehub-api real vía funciones dedicadas
 * (inscribirse/cancelarInscripcion/confirmarCobroEfectivo/listarMisInscripciones/
 * listarRosterClase). Los arrays `inscripciones`/`pagos` de acá abajo son un
 * mock estático sin relación con esas llamadas reales: los usan pantallas de
 * analítica/administración de alcance amplio (Dashboard, Reportes, Auditoría,
 * Métricas) para las que todavía no existe un endpoint "todas las
 * inscripciones de la plataforma" — quedan como estaban, sin tocar, igual que
 * reseñas/denuncias/penalizaciones/favoritos.
 */

const MOCK_KEY = "ah_data_mock";

interface MockShape {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  resenias: Resenia[];
  denuncias: Denuncia[];
  penalizaciones: Penalizacion[];
  favoritos: ActividadFavorita[];
}

function seedMock(): MockShape {
  return {
    inscripciones: seedInscripciones,
    pagos: seedPagos,
    resenias: seedResenias,
    denuncias: seedDenuncias,
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

interface ActividadDetalleResp extends ActividadCamposComunes {
  descripcion: string;
  clases: ClaseResp[];
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

export interface RosterClase {
  claseId: string;
  cuposMax: number;
  cuposOcupados: number;
  cuposLibres: number;
  cantidadInscripto: number;
  cantidadPagoPendiente: number;
  alumnos: RosterAlumno[];
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

function aplanarClase(r: ClaseResp): Clase {
  return {
    id: r.id,
    actividadId: "",
    fechaHora: r.fechaHora,
    estado: r.estado as Clase["estado"],
    cuposMax: r.cuposMax,
    cuposOcupados: r.cuposOcupados,
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

  crearTipoActividad: (input: TipoActividadInput) => Promise<TipoActividad>;
  actualizarTipoActividad: (id: string, input: TipoActividadInput) => Promise<TipoActividad>;
  eliminarTipoActividad: (id: string) => Promise<void>;

  // inscripción / pago real
  inscribirse: (clase: Clase, alumnoId: string, metodo?: "Mercado Pago" | "Efectivo") => Promise<void>;
  cancelarInscripcion: (id: string) => Promise<void>;
  confirmarCobroEfectivo: (inscripcionId: string) => Promise<void>;
  listarMisInscripciones: (estado?: EstadoInscripcion) => Promise<MiInscripcion[]>;
  listarRosterClase: (claseId: string) => Promise<RosterClase>;

  // validación de instructores (admin, real)
  listarInstructores: (estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO") => Promise<InstructorAdmin[]>;
  obtenerInstructor: (id: string) => Promise<InstructorAdmin>;
  aprobarInstructor: (id: string) => Promise<void>;
  rechazarInstructor: (id: string, motivo?: string) => Promise<void>;

  // fuera de alcance: mock puro, sin tocar
  inscripciones: Inscripcion[];
  pagos: Pago[];
  resenias: Resenia[];
  denuncias: Denuncia[];
  penalizaciones: Penalizacion[];
  favoritos: ActividadFavorita[];
  toggleFavorito: (usuarioId: string, actividadId: string) => void;
  crearResenia: (input: Omit<Resenia, "id" | "createdAt" | "enModeracion">) => Resenia;
  moderarResenia: (id: string, aprobar: boolean) => void;
  crearDenuncia: (input: Omit<Denuncia, "id" | "createdAt" | "estado">) => Denuncia;
  actualizarEstadoDenuncia: (id: string, estado: EstadoDenuncia) => void;
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

  const listarMisInscripciones = useCallback(async (estado?: EstadoInscripcion) => {
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
    return api.get<MiInscripcion[]>(`/api/alumno/inscripciones${query}`);
  }, []);

  const listarRosterClase = useCallback(async (claseId: string) => {
    return api.get<RosterClase>(`/api/instructor/clases/${claseId}/roster`);
  }, []);

  const listarInstructores = useCallback(async (estado?: "PENDIENTE" | "APROBADO" | "RECHAZADO") => {
    const query = estado ? `?estado=${estado}` : "";
    return api.get<InstructorAdmin[]>(`/api/admin/instructores${query}`);
  }, []);

  const obtenerInstructor = useCallback(async (id: string) => {
    return api.get<InstructorAdmin>(`/api/admin/instructores/${id}`);
  }, []);

  const aprobarInstructor = useCallback(async (id: string) => {
    await api.post(`/api/admin/instructores/${id}/aprobar`);
  }, []);

  const rechazarInstructor = useCallback(async (id: string, motivo?: string) => {
    await api.post(`/api/admin/instructores/${id}/rechazar`, { motivo });
  }, []);

  // --- Fuera de alcance: mock puro (reseñas/denuncias/penalizaciones/favoritos) ---

  const toggleFavorito = useCallback(
    (usuarioId: string, actividadId: string) => {
      patchMock("favoritos", (l) => {
        const exists = l.some((f) => f.usuarioId === usuarioId && f.actividadId === actividadId);
        return exists ? l.filter((f) => !(f.usuarioId === usuarioId && f.actividadId === actividadId)) : [...l, { usuarioId, actividadId }];
      });
    },
    [patchMock],
  );

  const crearResenia = useCallback(
    (input: Omit<Resenia, "id" | "createdAt" | "enModeracion">) => {
      const nueva: Resenia = { ...input, id: nextId("res"), createdAt: new Date().toISOString(), enModeracion: true };
      patchMock("resenias", (l) => [...l, nueva]);
      return nueva;
    },
    [patchMock],
  );

  const moderarResenia = useCallback(
    (id: string, aprobar: boolean) => {
      if (aprobar) patchMock("resenias", (l) => l.map((r) => (r.id === id ? { ...r, enModeracion: false } : r)));
      else patchMock("resenias", (l) => l.filter((r) => r.id !== id));
    },
    [patchMock],
  );

  const crearDenuncia = useCallback(
    (input: Omit<Denuncia, "id" | "createdAt" | "estado">) => {
      const nueva: Denuncia = { ...input, id: nextId("den"), createdAt: new Date().toISOString(), estado: "Pendiente" };
      patchMock("denuncias", (l) => [...l, nueva]);
      return nueva;
    },
    [patchMock],
  );

  const actualizarEstadoDenuncia = useCallback(
    (id: string, estado: EstadoDenuncia) => patchMock("denuncias", (l) => l.map((d) => (d.id === id ? { ...d, estado } : d))),
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
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      listarMisInscripciones,
      listarRosterClase,
      listarInstructores,
      obtenerInstructor,
      aprobarInstructor,
      rechazarInstructor,
      inscripciones: mock.inscripciones,
      pagos: mock.pagos,
      resenias: mock.resenias,
      denuncias: mock.denuncias,
      penalizaciones: mock.penalizaciones,
      favoritos: mock.favoritos,
      toggleFavorito,
      crearResenia,
      moderarResenia,
      crearDenuncia,
      actualizarEstadoDenuncia,
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
      crearTipoActividad,
      actualizarTipoActividad,
      eliminarTipoActividad,
      inscribirse,
      cancelarInscripcion,
      confirmarCobroEfectivo,
      listarMisInscripciones,
      listarRosterClase,
      listarInstructores,
      obtenerInstructor,
      aprobarInstructor,
      rechazarInstructor,
      mock,
      toggleFavorito,
      crearResenia,
      moderarResenia,
      crearDenuncia,
      actualizarEstadoDenuncia,
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
