// Realistic Mendoza-flavored mock dataset. Recreated (not copied) from the
// ActiveHub.dc.html prototype's structure — the original mock arrays live in
// that file's trailing <script data-dc-script> block, which was unreachable
// (file exceeds the design-sync 256KiB read cap). Shapes below match how each
// field is consumed across the prototype's screens (a.name, a.rating, etc.).
import type {
  Actividad,
  ActividadFavorita,
  AgendaClases,
  AuditLogEntry,
  Categoria,
  Clase,
  Denuncia,
  Inscripcion,
  Pago,
  Penalizacion,
  PerfilAlumno,
  PerfilInstructor,
  Resenia,
  TipoActividad,
  Usuario,
} from "./types";

export const INTERESES: string[] = [
  "Running",
  "Gimnasia",
  "Trekking",
  "Senderismo",
  "Defensa Personal",
  "Meditación",
  "Yoga",
  "Pilates",
  "Ciclismo",
];

export const categorias: Categoria[] = [
  { id: "cat-bienestar", nombre: "Bienestar" },
  { id: "cat-aventura", nombre: "Aventura" },
  { id: "cat-formacion", nombre: "Formación Técnica" },
  { id: "cat-defensa", nombre: "Defensa Personal" },
];

export const tiposActividad: TipoActividad[] = [
  { id: "tipo-relajacion", nombre: "Relajación", categoriaId: "cat-bienestar" },
  { id: "tipo-bienestar", nombre: "Bienestar", categoriaId: "cat-bienestar" },
  { id: "tipo-aventura", nombre: "Aventura", categoriaId: "cat-aventura" },
  { id: "tipo-formativa", nombre: "Formativa", categoriaId: "cat-formacion" },
  { id: "tipo-tecnica", nombre: "Técnica", categoriaId: "cat-formacion" },
  { id: "tipo-defensa", nombre: "Defensa Personal", categoriaId: "cat-defensa" },
];

// --- Usuarios --------------------------------------------------------------
// The 3 "demo" identities match the ones hardcoded in DashSidebar/AlumnoNav.

export const usuarios: Usuario[] = [
  {
    id: "u-martina",
    nombre: "Martina",
    apellido: "González",
    email: "martina@email.com",
    telefono: "+54 261 555 1234",
    fechaNacimiento: "2001-04-12",
    rol: "ALUMNO",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2026-01-14T10:00:00Z",
  },
  {
    id: "u-mateo",
    nombre: "Mateo",
    apellido: "Herrera",
    email: "mateo@email.com",
    telefono: "+54 261 555 8899",
    fechaNacimiento: "1989-09-03",
    rol: "INSTRUCTOR",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "u-roberto",
    nombre: "Roberto",
    apellido: "Diaz",
    email: "roberto.admin@activehub.com",
    telefono: "+54 261 555 0000",
    rol: "ADMIN",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2025-09-01T10:00:00Z",
  },
  // Extra alumnos (for instructor/admin tables, reviews, class rosters)
  {
    id: "u-lucia",
    nombre: "Lucía",
    apellido: "Paredes",
    email: "lucia.paredes@email.com",
    telefono: "+54 261 555 2211",
    fechaNacimiento: "1998-02-20",
    rol: "ALUMNO",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "u-bruno",
    nombre: "Bruno",
    apellido: "Sosa",
    email: "bruno.sosa@email.com",
    telefono: "+54 261 555 3344",
    fechaNacimiento: "1995-07-11",
    rol: "ALUMNO",
    estado: "ACTIVO",
    cantidadPenalizaciones: 1,
    createdAt: "2026-01-22T10:00:00Z",
  },
  {
    id: "u-valentina",
    nombre: "Valentina",
    apellido: "Ibarra",
    email: "valentina.ibarra@email.com",
    telefono: "+54 261 555 5566",
    fechaNacimiento: "2003-11-05",
    rol: "ALUMNO",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2026-03-08T10:00:00Z",
  },
  {
    id: "u-facundo",
    nombre: "Facundo",
    apellido: "Molina",
    email: "facundo.molina@email.com",
    telefono: "+54 261 555 7788",
    fechaNacimiento: "1992-05-30",
    rol: "ALUMNO",
    estado: "SUSPENDIDO",
    cantidadPenalizaciones: 2,
    createdAt: "2025-12-19T10:00:00Z",
  },
  // Extra instructores
  {
    id: "u-diego",
    nombre: "Diego",
    apellido: "Ferreyra",
    email: "diego@email.com",
    telefono: "+54 261 555 9876",
    fechaNacimiento: "1989-09-03",
    rol: "INSTRUCTOR",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2026-04-02T10:00:00Z",
  },
  {
    id: "u-carla",
    nombre: "Carla",
    apellido: "Núñez",
    email: "carla.nunez@email.com",
    telefono: "+54 261 555 4321",
    fechaNacimiento: "1991-01-18",
    rol: "INSTRUCTOR",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2025-10-14T10:00:00Z",
  },
  {
    id: "u-sofia",
    nombre: "Sofía",
    apellido: "Ramallo",
    email: "sofia.ramallo@email.com",
    telefono: "+54 261 555 6655",
    rol: "INSTRUCTOR",
    estado: "ACTIVO",
    cantidadPenalizaciones: 0,
    createdAt: "2026-05-20T10:00:00Z",
  },
];

export const perfilesAlumno: Record<string, PerfilAlumno> = {
  "u-martina": { usuarioId: "u-martina", intereses: ["Running", "Meditación", "Yoga"] },
  "u-lucia": { usuarioId: "u-lucia", intereses: ["Trekking", "Senderismo"] },
  "u-bruno": { usuarioId: "u-bruno", intereses: ["Defensa Personal", "Ciclismo"] },
  "u-valentina": { usuarioId: "u-valentina", intereses: ["Pilates", "Gimnasia"] },
  "u-facundo": { usuarioId: "u-facundo", intereses: ["Running"] },
};

export const perfilesInstructor: Record<string, PerfilInstructor> = {
  "u-mateo": {
    usuarioId: "u-mateo",
    especialidad: "Running y trail",
    aniosExperiencia: 6,
    descripcion: "Entrenador de running y trail desde 2018. Preparación para carreras de calle y montaña.",
    estadoVerificacion: "APROBADO",
  },
  "u-diego": {
    usuarioId: "u-diego",
    especialidad: "Defensa personal",
    aniosExperiencia: 9,
    descripcion: "Instructor de defensa personal y artes marciales mixtas.",
    estadoVerificacion: "APROBADO",
  },
  "u-carla": {
    usuarioId: "u-carla",
    especialidad: "Yoga y meditación",
    aniosExperiencia: 5,
    descripcion: "Profesora de yoga, meditación y respiración consciente.",
    estadoVerificacion: "APROBADO",
  },
  "u-sofia": {
    usuarioId: "u-sofia",
    especialidad: "Gimnasia funcional",
    aniosExperiencia: 2,
    descripcion: "Profesora de gimnasia funcional y acondicionamiento físico.",
    estadoVerificacion: "PENDIENTE",
  },
};

// --- Actividades -------------------------------------------------------------

const tint = (from: string, to: string) => `linear-gradient(135deg,${from},${to})`;

export const actividades: Actividad[] = [
  {
    id: "act-running",
    nombre: "Running en Grupo",
    descripcion: "Salidas grupales de running por el Parque General San Martín, con planes progresivos para todos los niveles.",
    tipoActividadId: "tipo-aventura",
    nivelIntensidad: "Física alta",
    instructorId: "u-mateo",
    precio: 4500,
    ubicacion: "Parque Gral. San Martín, Mendoza",
    photoTint: tint("#1B3A5C", "#12B5A5"),
    rating: 4.8,
    cuposMax: 16,
  },
  {
    id: "act-trekking",
    nombre: "Trekking Cerro Arco",
    descripcion: "Ascenso guiado al Cerro Arco, ideal para iniciarse en montaña con acompañamiento técnico.",
    tipoActividadId: "tipo-aventura",
    nivelIntensidad: "Física alta",
    instructorId: "u-mateo",
    precio: 6200,
    ubicacion: "Cerro Arco, Las Heras",
    photoTint: tint("#22543D", "#12B5A5"),
    rating: 4.9,
    cuposMax: 12,
  },
  {
    id: "act-senderismo",
    nombre: "Senderismo Familiar",
    descripcion: "Caminatas de baja exigencia por senderos del Cacheuta, aptas para todas las edades.",
    tipoActividadId: "tipo-aventura",
    nivelIntensidad: "Física media",
    instructorId: "u-diego",
    precio: 3800,
    ubicacion: "Cacheuta, Luján de Cuyo",
    photoTint: tint("#173250", "#0FB8A9"),
    rating: 4.7,
    cuposMax: 20,
  },
  {
    id: "act-defensa",
    nombre: "Defensa Personal",
    descripcion: "Técnicas prácticas de defensa personal orientadas a situaciones cotidianas.",
    tipoActividadId: "tipo-defensa",
    nivelIntensidad: "Física alta",
    instructorId: "u-diego",
    precio: 5000,
    ubicacion: "Polideportivo Ciudad, Mendoza",
    photoTint: tint("#3B1F2B", "#FF6A2B"),
    rating: 4.6,
    cuposMax: 14,
  },
  {
    id: "act-meditacion",
    nombre: "Meditación Guiada",
    descripcion: "Sesiones de meditación y respiración consciente para reducir el estrés y mejorar el foco.",
    tipoActividadId: "tipo-relajacion",
    nivelIntensidad: "Física baja",
    instructorId: "u-carla",
    precio: 3200,
    ubicacion: "Espacio Vital, Godoy Cruz",
    photoTint: tint("#0E2A47", "#7A52D9"),
    rating: 4.9,
    cuposMax: 18,
  },
  {
    id: "act-yoga",
    nombre: "Yoga Integral",
    descripcion: "Clases de yoga hatha y vinyasa para todos los niveles, con foco en flexibilidad y respiración.",
    tipoActividadId: "tipo-bienestar",
    nivelIntensidad: "Física baja",
    instructorId: "u-carla",
    precio: 3600,
    ubicacion: "Espacio Vital, Godoy Cruz",
    photoTint: tint("#143A5E", "#22D3C0"),
    rating: 4.8,
    cuposMax: 16,
  },
  {
    id: "act-gimnasia",
    nombre: "Gimnasia Funcional",
    descripcion: "Entrenamiento funcional en grupo para mejorar fuerza, resistencia y movilidad.",
    tipoActividadId: "tipo-bienestar",
    nivelIntensidad: "Física media",
    instructorId: "u-sofia",
    precio: 4200,
    ubicacion: "Complejo Deportivo Andes Talleres",
    photoTint: tint("#0E2A47", "#F5A623"),
    rating: 4.5,
    cuposMax: 20,
  },
  {
    id: "act-pilates",
    nombre: "Pilates",
    descripcion: "Clases de pilates con y sin elementos, enfocadas en el fortalecimiento del core.",
    tipoActividadId: "tipo-bienestar",
    nivelIntensidad: "Física baja",
    instructorId: "u-sofia",
    precio: 3900,
    ubicacion: "Complejo Deportivo Andes Talleres",
    photoTint: tint("#1B3A5C", "#FF8A4C"),
    rating: 4.7,
    cuposMax: 14,
  },
];

// --- Agenda + clases --------------------------------------------------------

export const agendas: AgendaClases[] = actividades.map((a, i) => ({
  id: `ag-${a.id}`,
  actividadId: a.id,
  diaSemana: (i * 2) % 7,
  horaInicio: i % 2 === 0 ? "08:00" : "18:30",
  horaFin: i % 2 === 0 ? "09:00" : "19:30",
  edadMin: 12,
  edadMax: 70,
  cuposMax: a.cuposMax,
}));

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const NOW = new Date();

export const clases: Clase[] = actividades.flatMap((a, i) => {
  const offsets = [1, 3, 6, 9, 13];
  return offsets.map((offset, j) => {
    const fecha = addDays(NOW, offset + i);
    const ocupados = Math.max(0, a.cuposMax - ((i + j) % (a.cuposMax + 1)));
    const estado: Clase["estado"] =
      offset < 0 ? "Finalizada" : ocupados >= a.cuposMax ? "Habilitada" : "Programada";
    return {
      id: `${a.id}-c${j}`,
      actividadId: a.id,
      fechaHora: fecha.toISOString(),
      estado,
      cuposMax: a.cuposMax,
      cuposOcupados: Math.min(ocupados, a.cuposMax),
    };
  });
});

// --- Inscripciones / pagos --------------------------------------------------

export const inscripciones: Inscripcion[] = [
  {
    id: "insc-1",
    claseId: clases[0].id,
    alumnoId: "u-martina",
    estado: "Inscripto",
    createdAt: addDays(NOW, -2).toISOString(),
    pagoId: "pago-1",
  },
  {
    id: "insc-2",
    claseId: clases[5].id,
    alumnoId: "u-martina",
    estado: "PreInscripción",
    createdAt: addDays(NOW, -1).toISOString(),
  },
  {
    id: "insc-3",
    claseId: clases[2].id,
    alumnoId: "u-lucia",
    estado: "PagoPendiente",
    createdAt: addDays(NOW, -1).toISOString(),
    pagoId: "pago-2",
  },
  {
    id: "insc-4",
    claseId: clases[1].id,
    alumnoId: "u-bruno",
    estado: "Inscripto",
    createdAt: addDays(NOW, -3).toISOString(),
    pagoId: "pago-3",
  },
  {
    id: "insc-5",
    claseId: clases[0].id,
    alumnoId: "u-valentina",
    estado: "Cancelada",
    createdAt: addDays(NOW, -5).toISOString(),
  },
];

export const pagos: Pago[] = [
  { id: "pago-1", inscripcionId: "insc-1", estado: "Liberado", monto: 4500, metodo: "Mercado Pago" },
  { id: "pago-2", inscripcionId: "insc-3", estado: "Retenido", monto: 3800, metodo: "Mercado Pago" },
  { id: "pago-3", inscripcionId: "insc-4", estado: "Efectivo", monto: 6200, metodo: "Efectivo" },
];

// --- Reseñas / denuncias / penalizaciones -----------------------------------

export const resenias: Resenia[] = [
  {
    id: "res-1",
    claseId: clases[0].id,
    alumnoId: "u-lucia",
    puntaje: 5,
    comentario: "Excelente grupo y muy buena onda del profe Mateo. Repito seguro.",
    enModeracion: false,
    createdAt: addDays(NOW, -10).toISOString(),
  },
  {
    id: "res-2",
    claseId: clases[6].id,
    alumnoId: "u-bruno",
    puntaje: 4,
    comentario: "Buena clase, el lugar de encuentro podría estar mejor señalizado.",
    enModeracion: true,
    createdAt: addDays(NOW, -4).toISOString(),
  },
];

export const denuncias: Denuncia[] = [
  {
    id: "den-1",
    claseId: clases[1].id,
    alumnoId: "u-facundo",
    motivo: "El instructor canceló la clase sin previo aviso y no hubo reintegro.",
    estado: "En Auditoría",
    createdAt: addDays(NOW, -6).toISOString(),
  },
  {
    id: "den-2",
    claseId: clases[3].id,
    alumnoId: "u-valentina",
    motivo: "Se cobraron cupos que no estaban disponibles al momento de inscribirme.",
    estado: "Pendiente",
    createdAt: addDays(NOW, -1).toISOString(),
  },
];

export const penalizaciones: Penalizacion[] = [
  {
    id: "pen-1",
    usuarioId: "u-facundo",
    tipo: "Suspensión temporal",
    motivo: "Ausencias reiteradas sin aviso a clases confirmadas.",
    createdAt: addDays(NOW, -20).toISOString(),
  },
  {
    id: "pen-2",
    usuarioId: "u-bruno",
    tipo: "Económica",
    motivo: "Cancelación fuera de término con reintegro parcial.",
    createdAt: addDays(NOW, -8).toISOString(),
  },
];

export const favoritos: ActividadFavorita[] = [
  { usuarioId: "u-martina", actividadId: "act-trekking" },
  { usuarioId: "u-martina", actividadId: "act-yoga" },
];

export const auditLog: AuditLogEntry[] = [
  {
    id: "audit-1",
    actorId: null,
    actorNombre: "Sistema",
    accion: "REGISTRO_ALUMNO",
    entidad: "Usuario",
    entidadId: "u-martina",
    timestamp: "2026-01-14T10:00:00Z",
  },
  {
    id: "audit-2",
    actorId: null,
    actorNombre: "Sistema",
    accion: "REGISTRO_INSTRUCTOR",
    entidad: "Usuario",
    entidadId: "u-mateo",
    timestamp: "2025-11-02T10:00:00Z",
  },
  {
    id: "audit-3",
    actorId: "u-roberto",
    actorNombre: "Roberto Diaz",
    accion: "ADMIN_CREADO",
    entidad: "Usuario",
    entidadId: "u-roberto",
    timestamp: "2025-09-01T10:00:00Z",
    metadata: "Admin sembrado (seed)",
  },
  {
    id: "audit-4",
    actorId: "u-roberto",
    actorNombre: "Roberto Diaz",
    accion: "INSTRUCTOR_VALIDADO",
    entidad: "PerfilInstructor",
    entidadId: "u-mateo",
    timestamp: addDays(NOW, -30).toISOString(),
  },
  {
    id: "audit-5",
    actorId: "u-facundo",
    actorNombre: "Facundo Molina",
    accion: "LOGIN_FALLIDO",
    entidad: "Usuario",
    entidadId: "u-facundo",
    timestamp: addDays(NOW, -2).toISOString(),
  },
];

// --- Helpers -----------------------------------------------------------------

export function getUsuario(id: string): Usuario | undefined {
  return usuarios.find((u) => u.id === id);
}

export function getActividad(id: string): Actividad | undefined {
  return actividades.find((a) => a.id === id);
}

export function getTipoActividad(id: string): TipoActividad | undefined {
  return tiposActividad.find((t) => t.id === id);
}

export function getCategoria(id: string): Categoria | undefined {
  return categorias.find((c) => c.id === id);
}

export function getClasesDeActividad(actividadId: string): Clase[] {
  return clases.filter((c) => c.actividadId === actividadId);
}

export function getActividadesDeInstructor(instructorId: string): Actividad[] {
  return actividades.filter((a) => a.instructorId === instructorId);
}

export function getInscripcionesDeAlumno(alumnoId: string): Inscripcion[] {
  return inscripciones.filter((i) => i.alumnoId === alumnoId);
}

export function disponibilidad(clase: Clase): { label: string; type: "disponible" | "ultimos" | "sincupos" } {
  const libres = clase.cuposMax - clase.cuposOcupados;
  if (libres <= 0) return { label: "Sin cupos", type: "sincupos" };
  if (libres <= 3) return { label: `${libres} cupos · Últimos`, type: "ultimos" };
  return { label: "Disponible", type: "disponible" };
}

export function diasHastaClase(clase: Clase): number {
  const diff = new Date(clase.fechaHora).getTime() - NOW.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Reglas de negocio (CLAUDE.md): >4 días => solo PreInscripción; <=4 días => inscripción definitiva. */
export function tipoIngreso(clase: Clase): "preinscripcion" | "inscripcion" {
  return diasHastaClase(clase) > 4 ? "preinscripcion" : "inscripcion";
}

const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const dayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
}

export function formatHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
