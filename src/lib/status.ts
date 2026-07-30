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
