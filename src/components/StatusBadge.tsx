import { s } from "../lib/style";

// Ported 1:1 from the prototype's StatusBadge.dc.html color/label map.
export type StatusType =
  | "disponible"
  | "ultimos"
  | "sincupos"
  | "preinscripcion"
  | "pagopendiente"
  | "inscripto"
  | "cancelada"
  | "programada"
  | "habilitada"
  | "finalizada"
  | "retenido"
  | "liberado"
  | "efectivo"
  | "pagocancelado"
  | "aprobado"
  | "pendiente"
  | "rechazado"
  | "denunciapendiente"
  | "auditoria"
  | "resuelta"
  | "validado"
  | "revision"
  | "penalizado"
  | "suspendido"
  | "activo";

const MAP: Record<StatusType, [bg: string, fg: string, bd: string, dot: string, label: string]> = {
  disponible: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Disponible"],
  ultimos: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "Últimos cupos"],
  sincupos: ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D", "Sin cupos"],
  preinscripcion: ["#EAF1FE", "#2D5BC8", "#D5E2FB", "#3A6FF0", "PreInscripción"],
  pagopendiente: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "PagoPendiente"],
  inscripto: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Inscripto"],
  cancelada: ["#EEF1F4", "#637687", "#DEE4EA", "#9AA8B6", "Cancelada"],
  programada: ["#EAF1FE", "#2D5BC8", "#D5E2FB", "#3A6FF0", "Programada"],
  habilitada: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Habilitada"],
  finalizada: ["#ECEFF3", "#46586B", "#DCE2E9", "#6B7B8C", "Finalizada"],
  retenido: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "Retenido"],
  liberado: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Liberado"],
  efectivo: ["#EFEAFB", "#6A3FC4", "#E1D7F6", "#7A52D9", "Efectivo"],
  pagocancelado: ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D", "Pago cancelado"],
  aprobado: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Pago aprobado"],
  pendiente: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "Pendiente de pago"],
  rechazado: ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D", "Pago rechazado"],
  denunciapendiente: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "Pendiente"],
  auditoria: ["#EAF1FE", "#2D5BC8", "#D5E2FB", "#3A6FF0", "En Auditoría"],
  resuelta: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Resuelta"],
  validado: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Validado"],
  revision: ["#FFF3E0", "#B9741A", "#F6E2C0", "#F5A623", "En revisión"],
  penalizado: ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D", "Penalizado"],
  suspendido: ["#FBEAEB", "#BE3A3E", "#F3D2D3", "#E5484D", "Suspendido"],
  activo: ["#E7F8F5", "#0C8576", "#CBEDE7", "#12B5A5", "Activo"],
};

interface StatusBadgeProps {
  type: StatusType;
  label?: string;
}

export default function StatusBadge({ type, label }: StatusBadgeProps) {
  const [bg, fg, bd, dot, defaultLabel] = MAP[type] ?? MAP.disponible;
  return (
    <span
      style={s(
        `display:inline-flex;align-items:center;gap:6px;padding:5px 11px 5px 9px;border-radius:999px;font:700 12px/1 Manrope,sans-serif;letter-spacing:.1px;white-space:nowrap;background:${bg};color:${fg};border:1px solid ${bd};`,
      )}
    >
      <span style={s(`width:7px;height:7px;border-radius:999px;flex:none;background:${dot};`)} />
      {label || defaultLabel}
    </span>
  );
}
