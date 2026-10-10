import type { StatusType } from "../components/StatusBadge";
import type { EstadoClase, EstadoDenuncia, EstadoInscripcion, EstadoPago } from "./types";

export function inscripcionStatusType(estado: EstadoInscripcion): StatusType {
  switch (estado) {
    case "PreInscripción":
      return "preinscripcion";
    case "PagoPendiente":
      return "pagopendiente";
    case "Inscripto":
      return "inscripto";
    case "Cancelada":
      return "cancelada";
  }
}

export function claseStatusType(estado: EstadoClase): StatusType {
  switch (estado) {
    case "Programada":
      return "programada";
    case "Habilitada":
      return "habilitada";
    case "Cancelada":
      return "cancelada";
    case "Finalizada":
      return "finalizada";
  }
}

export function pagoStatusType(estado: EstadoPago): StatusType {
  switch (estado) {
    case "Retenido":
      return "retenido";
    case "Liberado":
      return "liberado";
    case "Efectivo":
      return "efectivo";
    case "Cancelado":
      return "pagocancelado";
    case "Rechazado":
      return "rechazado";
    case "Reembolsado":
      return "reembolsado";
    case "EnRevision":
      return "revision";
  }
}

/** Lo mínimo de un pago para explicarlo (KAN-63). */
export interface PagoParaExplicar {
  estado: EstadoPago;
  /** "Mercado Pago" o "Efectivo", la etiqueta que manda el backend. */
  metodo: string;
  /** Si Mercado Pago ya lo cobró. Un `Retenido` cobrado espera el período de denuncias. */
  capturado: boolean;
}

export interface ExplicacionPago {
  type: StatusType;
  label: string;
  detalle: string;
}

/**
 * KAN-63: qué le pasó a la plata, en palabras del alumno. El estado técnico no alcanza: un
 * `Retenido` puede ser "todavía no te cobramos" o "ya te cobramos", y un `Cancelado` significa
 * otra cosa si se pagó en efectivo.
 */
export function explicarPagoAlumno(pago: PagoParaExplicar): ExplicacionPago {
  const esEfectivo = pago.metodo === "Efectivo";
  switch (pago.estado) {
    case "Retenido":
      return pago.capturado
        ? { type: "liberado", label: "Cobrado", detalle: "Se cobró al dictarse la clase." }
        : { type: "retenido", label: "Retenido hasta la clase", detalle: "Reservado en tu tarjeta: todavía no se te cobró." };
    case "Liberado":
      return { type: "liberado", label: "Cobrado", detalle: "Se cobró al dictarse la clase." };
    case "Efectivo":
      return { type: "efectivo", label: "Efectivo", detalle: "Se paga en mano al instructor." };
    case "EnRevision":
      return { type: "revision", label: "En revisión", detalle: "Mercado Pago está revisando el pago." };
    case "Rechazado":
      return { type: "rechazado", label: "Rechazado", detalle: "Mercado Pago no aprobó el pago: no se te cobró." };
    case "Reembolsado":
      return { type: "reembolsado", label: "Reembolsado", detalle: "Se te devolvió por Mercado Pago." };
    case "Cancelado":
      return esEfectivo
        ? { type: "pagocancelado", label: "Pago cancelado", detalle: "Coordiná con el instructor la devolución de lo que pagaste." }
        : { type: "pagocancelado", label: "Retención liberada", detalle: "No se te cobró: se liberó la reserva de tu tarjeta." };
  }
}

/**
 * KAN-63: el mismo pago visto por el instructor, que lo que quiere saber es si esa plata ya es
 * suya. El texto de `Retenido` cobrado nombra las 24 h del período de denuncias
 * (`VentanaPagos.PERIODO_DENUNCIAS` del backend): si cambia allá, cambia acá.
 */
export function explicarPagoInstructor(pago: PagoParaExplicar): ExplicacionPago {
  switch (pago.estado) {
    case "Retenido":
      return pago.capturado
        ? { type: "retenido", label: "Cobrado", detalle: "Se libera 24 h después de la clase si no hay denuncias." }
        : { type: "retenido", label: "Retenido", detalle: "Se cobra al dictarse la clase." };
    case "Liberado":
      return { type: "liberado", label: "Liberado", detalle: "Acreditado en tu cuenta." };
    case "Efectivo":
      return { type: "efectivo", label: "Efectivo", detalle: "Se cobra en mano." };
    case "EnRevision":
      return { type: "revision", label: "En revisión", detalle: "Mercado Pago todavía no lo aprobó." };
    case "Rechazado":
      return { type: "rechazado", label: "Rechazado", detalle: "Mercado Pago no aprobó el pago." };
    case "Reembolsado":
      return { type: "reembolsado", label: "Reintegrado", detalle: "Se le devolvió al alumno." };
    case "Cancelado":
      return { type: "pagocancelado", label: "Reintegrado", detalle: "No se cobró." };
  }
}

export function denunciaStatusType(estado: EstadoDenuncia): StatusType {
  switch (estado) {
    case "Pendiente":
      return "denunciapendiente";
    case "En Auditoría":
      return "auditoria";
    case "Resuelta":
      return "resuelta";
  }
}
