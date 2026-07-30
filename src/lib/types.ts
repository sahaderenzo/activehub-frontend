// Domain model per design_handoff_activehub/02-MODELO-DOMINIO.md and CLAUDE.md.
// Enum string values must match the spec verbatim (used as UI copy too).

export type RolNombre = "ALUMNO" | "INSTRUCTOR" | "ADMIN";
export type EstadoUsuario = "ACTIVO" | "SUSPENDIDO";
export type EstadoVerificacion = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export type EstadoInscripcion =
  | "PreInscripción"
  | "PagoPendiente"
  | "Inscripto"
  | "Cancelada";

export type EstadoClase = "Programada" | "Habilitada" | "Cancelada" | "Finalizada";

export type EstadoPago = "Retenido" | "Liberado" | "Cancelado" | "Efectivo";

export type EstadoDenuncia = "Pendiente" | "En Auditoría" | "Resuelta";

export type Disponibilidad = "Disponible" | "Últimos cupos" | "Sin cupos";

export type NivelIntensidad = "Física baja" | "Física media" | "Física alta";

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  rol: RolNombre;
  estado: EstadoUsuario;
  cantidadPenalizaciones: number;
  createdAt: string;
}

export interface PerfilAlumno {
  usuarioId: string;
  intereses: string[];
}

export interface PerfilInstructor {
  usuarioId: string;
  especialidad: string;
  aniosExperiencia?: number;
  descripcion?: string;
  estadoVerificacion: EstadoVerificacion;
  motivoRechazo?: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface TipoActividad {
  id: string;
  nombre: string;
  categoriaId: string;
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  tipoActividadId: string;
  nivelIntensidad: NivelIntensidad;
  instructorId: string;
  precio: number;
  ubicacion: string;
  photoTint: string;
  rating: number;
  cuposMax: number;
}

export interface AgendaClases {
  id: string;
  actividadId: string;
  diaSemana: number; // 0=domingo .. 6=sabado
  horaInicio: string;
  horaFin: string;
  edadMin?: number;
  edadMax?: number;
  cuposMax: number;
}

export interface Clase {
  id: string;
  actividadId: string;
  fechaHora: string;
  estado: EstadoClase;
  cuposMax: number;
  cuposOcupados: number;
}

export interface Pago {
  id: string;
  inscripcionId: string;
  estado: EstadoPago;
  monto: number;
  metodo: "Mercado Pago" | "Efectivo";
}

export interface Inscripcion {
  id: string;
  claseId: string;
  alumnoId: string;
  estado: EstadoInscripcion;
  createdAt: string;
  pagoId?: string;
}

export interface Resenia {
  id: string;
  claseId: string;
  alumnoId: string;
  puntaje: number;
  comentario: string;
  enModeracion: boolean;
  createdAt: string;
}

export interface Denuncia {
  id: string;
  claseId: string;
  alumnoId: string;
  motivo: string;
  estado: EstadoDenuncia;
  createdAt: string;
}

export type TipoPenalizacion = "Económica" | "Suspensión temporal";

export interface Penalizacion {
  id: string;
  usuarioId: string;
  tipo: TipoPenalizacion;
  motivo: string;
  createdAt: string;
}

export interface ActividadFavorita {
  usuarioId: string;
  actividadId: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorNombre: string;
  accion: string;
  entidad: string;
  entidadId: string;
  timestamp: string;
  metadata?: string;
}
