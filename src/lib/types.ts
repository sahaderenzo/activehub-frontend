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

/**
 * Desde la V21 del backend el nivel es una **entidad** con ABM propio (E4Ad-HU05), no una
 * unión de tres literales: el admin puede crear los que quiera desde "Tipos y niveles".
 * Por eso el nombre es `string` abierto y los mapas de color/copy que había keyed por los
 * tres valores fijos necesitan un valor por defecto.
 */
export interface NivelIntensidad {
  id: string;
  nombre: string;
  descripcion: string;
  /** Cuántas actividades lo usan. Lo calcula el backend; la tabla del admin lo muestra. */
  actividades: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  /** Credencial alternativa de login. Opcional: las cuentas viejas no lo tienen. */
  dni?: string;
  telefono?: string;
  fechaNacimiento?: string;
  rol: RolNombre;
  estado: EstadoUsuario;
  cantidadPenalizaciones: number;
  createdAt: string;
}

/**
 * Un interés del alumno es un TipoActividad del catálogo, no texto libre: por eso trae su
 * categoría (Trekking sabe que es de Aventura). Lo cambió la migración V19 del backend.
 */
export interface InteresAlumno {
  tipoActividadId: string;
  nombre: string;
  categoriaId: string;
  categoria: string;
}

export interface PerfilAlumno {
  usuarioId: string;
  intereses: InteresAlumno[];
  condicionSalud?: string;
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
  nivelIntensidadId: string;
  /** Nombre del nivel, desnormalizado para no tener que buscarlo en cada tarjeta. */
  nivelIntensidad: string;
  instructorId: string;
  precio: number;
  ubicacion: string;
  photoTint: string;
  rating: number;
  /** Duración de una clase, en minutos. El cupo NO vive acá: es de la Clase. */
  duracionMin: number;
  /** Ids de la galería (`GET /api/fotos/actividad/imagen/{id}`). Solo en el detalle. */
  imagenes?: string[];
  lat?: number;
  lng?: number;
  /** Solo presente cuando la actividad viene del catálogo real (listaractividades). */
  proximaClase?: { fechaHora: string; estado: EstadoClase; cuposMax: number; cuposOcupados: number };
}

export interface AgendaClases {
  id: string;
  actividadId: string;
  /** 1=lunes .. 7=domingo, igual que `DayOfWeek.getValue()` del backend. */
  diaSemana: number;
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
  horaFin: string;
  estado: EstadoClase;
  cuposMax: number;
  cuposOcupados: number;
  /** Solo presente cuando la clase viene del detalle de actividad (obteneractividad). */
  cantidadPreInscripcion?: number;
  /**
   * Precio de ESTA clase (V23 del backend), que es el que se cobra al inscribirse — no el
   * actual de la actividad. Una clase con inscriptos queda congelada: si el instructor sube
   * el precio después, esa clase sigue valiendo lo que valía. **Toda pantalla que muestre
   * el importe de una clase concreta tiene que usar esto, no `actividad.precio`**, que es
   * sólo el precio de lista del catálogo.
   */
  precio: number;
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
  /** Opcional: una reseña puede ser solo estrellas. */
  comentario: string | null;
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
