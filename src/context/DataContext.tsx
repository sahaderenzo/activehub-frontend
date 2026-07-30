import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  Actividad,
  ActividadFavorita,
  Clase,
  Denuncia,
  EstadoDenuncia,
  Inscripcion,
  Pago,
  Penalizacion,
  Resenia,
  TipoActividad,
} from "../lib/types";
import {
  actividades as seedActividades,
  clases as seedClases,
  denuncias as seedDenuncias,
  favoritos as seedFavoritos,
  inscripciones as seedInscripciones,
  pagos as seedPagos,
  penalizaciones as seedPenalizaciones,
  resenias as seedResenias,
  tiposActividad as seedTipos,
  tipoIngreso,
} from "../lib/mockData";

/**
 * Reactive, localStorage-backed mirror of mockData.ts. mockData.ts stays the
 * static seed/reference (and is still fine to import directly for read-only
 * lookups like getActividad/getUsuario/formatFecha); this context is for
 * anything a screen needs to *mutate* (create a class, confirm a cash
 * payment, validate an instructor, moderate a review, ...) so the change is
 * visible from every other screen that reads it, without a real backend.
 */

const KEY = "ah_data";

interface DataShape {
  actividades: Actividad[];
  tiposActividad: TipoActividad[];
  clases: Clase[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  resenias: Resenia[];
  denuncias: Denuncia[];
  penalizaciones: Penalizacion[];
  favoritos: ActividadFavorita[];
}

function seed(): DataShape {
  return {
    actividades: seedActividades,
    tiposActividad: seedTipos,
    clases: seedClases,
    inscripciones: seedInscripciones,
    pagos: seedPagos,
    resenias: seedResenias,
    denuncias: seedDenuncias,
    penalizaciones: seedPenalizaciones,
    favoritos: seedFavoritos,
  };
}

function load(): DataShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DataShape;
  } catch {
    /* ignore corrupt storage */
  }
  return seed();
}

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now()}-${uid}`;
}

interface DataContextValue extends DataShape {
  crearActividad: (input: Omit<Actividad, "id">) => Actividad;
  actualizarActividad: (id: string, patch: Partial<Actividad>) => void;
  eliminarActividad: (id: string) => void;

  crearClase: (input: Omit<Clase, "id" | "cuposOcupados">) => Clase;
  actualizarClase: (id: string, patch: Partial<Clase>) => void;
  eliminarClase: (id: string) => void;

  crearTipoActividad: (input: Omit<TipoActividad, "id">) => TipoActividad;
  actualizarTipoActividad: (id: string, patch: Partial<TipoActividad>) => void;
  eliminarTipoActividad: (id: string) => void;

  /** Crea PreInscripción o Inscripción+Pago según la regla de los 4 días (tipoIngreso). */
  inscribirse: (claseId: string, alumnoId: string, metodo?: "Mercado Pago" | "Efectivo") => Inscripcion;
  cancelarInscripcion: (id: string) => void;
  confirmarCobroEfectivo: (inscripcionId: string) => void;

  toggleFavorito: (usuarioId: string, actividadId: string) => void;

  crearResenia: (input: Omit<Resenia, "id" | "createdAt" | "enModeracion">) => Resenia;
  moderarResenia: (id: string, aprobar: boolean) => void;

  crearDenuncia: (input: Omit<Denuncia, "id" | "createdAt" | "estado">) => Denuncia;
  actualizarEstadoDenuncia: (id: string, estado: EstadoDenuncia) => void;

  aplicarPenalizacion: (input: Omit<Penalizacion, "id" | "createdAt">) => Penalizacion;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataShape>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);

  const patch = useCallback(<K extends keyof DataShape>(key: K, updater: (list: DataShape[K]) => DataShape[K]) => {
    setData((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  }, []);

  const crearActividad = useCallback((input: Omit<Actividad, "id">) => {
    const nueva: Actividad = { ...input, id: nextId("act") };
    patch("actividades", (l) => [...l, nueva]);
    return nueva;
  }, [patch]);

  const actualizarActividad = useCallback(
    (id: string, p: Partial<Actividad>) => patch("actividades", (l) => l.map((a) => (a.id === id ? { ...a, ...p } : a))),
    [patch],
  );

  const eliminarActividad = useCallback(
    (id: string) => patch("actividades", (l) => l.filter((a) => a.id !== id)),
    [patch],
  );

  const crearClase = useCallback(
    (input: Omit<Clase, "id" | "cuposOcupados">) => {
      const nueva: Clase = { ...input, id: nextId("cla"), cuposOcupados: 0 };
      patch("clases", (l) => [...l, nueva]);
      return nueva;
    },
    [patch],
  );

  const actualizarClase = useCallback(
    (id: string, p: Partial<Clase>) => patch("clases", (l) => l.map((c) => (c.id === id ? { ...c, ...p } : c))),
    [patch],
  );

  const eliminarClase = useCallback((id: string) => patch("clases", (l) => l.filter((c) => c.id !== id)), [patch]);

  const crearTipoActividad = useCallback(
    (input: Omit<TipoActividad, "id">) => {
      const nuevo: TipoActividad = { ...input, id: nextId("tipo") };
      patch("tiposActividad", (l) => [...l, nuevo]);
      return nuevo;
    },
    [patch],
  );

  const actualizarTipoActividad = useCallback(
    (id: string, p: Partial<TipoActividad>) => patch("tiposActividad", (l) => l.map((t) => (t.id === id ? { ...t, ...p } : t))),
    [patch],
  );

  const eliminarTipoActividad = useCallback(
    (id: string) => patch("tiposActividad", (l) => l.filter((t) => t.id !== id)),
    [patch],
  );

  const inscribirse = useCallback(
    (claseId: string, alumnoId: string, metodo: "Mercado Pago" | "Efectivo" = "Mercado Pago") => {
      const clase = data.clases.find((c) => c.id === claseId);
      const ingreso = clase ? tipoIngreso(clase) : "preinscripcion";
      const inscripcionId = nextId("insc");

      if (ingreso === "preinscripcion") {
        const nueva: Inscripcion = { id: inscripcionId, claseId, alumnoId, estado: "PreInscripción", createdAt: new Date().toISOString() };
        patch("inscripciones", (l) => [...l, nueva]);
        return nueva;
      }

      const pagoId = nextId("pago");
      const monto = data.actividades.find((a) => a.id === clase?.actividadId)?.precio ?? 0;
      const pago: Pago = {
        id: pagoId,
        inscripcionId,
        estado: metodo === "Mercado Pago" ? "Retenido" : "Efectivo",
        monto,
        metodo,
      };
      const nueva: Inscripcion = {
        id: inscripcionId,
        claseId,
        alumnoId,
        estado: metodo === "Mercado Pago" ? "Inscripto" : "PagoPendiente",
        createdAt: new Date().toISOString(),
        pagoId,
      };
      patch("pagos", (l) => [...l, pago]);
      patch("inscripciones", (l) => [...l, nueva]);
      if (clase) actualizarClase(claseId, { cuposOcupados: clase.cuposOcupados + 1 });
      return nueva;
    },
    [data.clases, data.actividades, patch, actualizarClase],
  );

  const cancelarInscripcion = useCallback(
    (id: string) => patch("inscripciones", (l) => l.map((i) => (i.id === id ? { ...i, estado: "Cancelada" } : i))),
    [patch],
  );

  const confirmarCobroEfectivo = useCallback(
    (inscripcionId: string) => {
      patch("inscripciones", (l) => l.map((i) => (i.id === inscripcionId ? { ...i, estado: "Inscripto" } : i)));
    },
    [patch],
  );

  const toggleFavorito = useCallback(
    (usuarioId: string, actividadId: string) => {
      patch("favoritos", (l) => {
        const exists = l.some((f) => f.usuarioId === usuarioId && f.actividadId === actividadId);
        return exists ? l.filter((f) => !(f.usuarioId === usuarioId && f.actividadId === actividadId)) : [...l, { usuarioId, actividadId }];
      });
    },
    [patch],
  );

  const crearResenia = useCallback(
    (input: Omit<Resenia, "id" | "createdAt" | "enModeracion">) => {
      const nueva: Resenia = { ...input, id: nextId("res"), createdAt: new Date().toISOString(), enModeracion: true };
      patch("resenias", (l) => [...l, nueva]);
      return nueva;
    },
    [patch],
  );

  const moderarResenia = useCallback(
    (id: string, aprobar: boolean) => {
      if (aprobar) patch("resenias", (l) => l.map((r) => (r.id === id ? { ...r, enModeracion: false } : r)));
      else patch("resenias", (l) => l.filter((r) => r.id !== id));
    },
    [patch],
  );

  const crearDenuncia = useCallback(
    (input: Omit<Denuncia, "id" | "createdAt" | "estado">) => {
      const nueva: Denuncia = { ...input, id: nextId("den"), createdAt: new Date().toISOString(), estado: "Pendiente" };
      patch("denuncias", (l) => [...l, nueva]);
      return nueva;
    },
    [patch],
  );

  const actualizarEstadoDenuncia = useCallback(
    (id: string, estado: EstadoDenuncia) => patch("denuncias", (l) => l.map((d) => (d.id === id ? { ...d, estado } : d))),
    [patch],
  );

  const aplicarPenalizacion = useCallback(
    (input: Omit<Penalizacion, "id" | "createdAt">) => {
      const nueva: Penalizacion = { ...input, id: nextId("pen"), createdAt: new Date().toISOString() };
      patch("penalizaciones", (l) => [...l, nueva]);
      return nueva;
    },
    [patch],
  );

  const value: DataContextValue = {
    ...data,
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
    toggleFavorito,
    crearResenia,
    moderarResenia,
    crearDenuncia,
    actualizarEstadoDenuncia,
    aplicarPenalizacion,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
