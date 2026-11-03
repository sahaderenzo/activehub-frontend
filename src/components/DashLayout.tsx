import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { s } from "../lib/style";
import { useAuth } from "../context/AuthContext";
import { RUTA_SANCIONES, fechaCorta } from "../lib/sanciones";
import DashSidebar from "./DashSidebar";

interface DashLayoutProps {
  role: "instructor" | "admin";
  active: string;
  children: ReactNode;
}

/** Sidebar + main content shell shared by every Instructor/Admin screen. */
export default function DashLayout({ role, active, children }: DashLayoutProps) {
  return (
    <div className="ah-screen ah-dash-shell" style={s("min-height:100vh;background:#F4F7FA;display:flex;")}>
      <DashSidebar role={role} active={active} />
      <main className="ah-dash-main" style={s("flex:1;min-width:0;")}>
        {/* "Mis sanciones" ya lo explica con más detalle: no se repite arriba. */}
        {role === "instructor" && active !== "sanciones" && <CartelSancion />}
        {children}
      </main>
    </div>
  );
}

/**
 * V36: el instructor suspendido entra a todo pero no puede crear ni editar actividades ni
 * clases, y el que tiene una multa sin pagar sólo puede ver sus inscriptos. Sin este cartel los
 * botones le devolverían un error sin que entienda por qué.
 */
function CartelSancion() {
  const { currentUser } = useAuth();
  const restricciones = currentUser?.restricciones;
  if (!restricciones?.multaPendiente && !restricciones?.suspendidoHasta) return null;

  return (
    <div
      role="status"
      style={s("background:#FFF4E5;border-bottom:1px solid #F5D9A8;color:#8A5A00;padding:11px 32px;font:600 13.5px Manrope;display:flex;gap:12px;flex-wrap:wrap;align-items:center;")}
    >
      <span style={s("flex:1;min-width:240px;")}>
        {restricciones.multaPendiente
          ? "Tenés una multa pendiente de pago: hasta que la administración apruebe tu comprobante, sólo podés ver tus inscriptos y confirmar cobros en efectivo."
          : `Estás suspendido hasta el ${fechaCorta(restricciones.suspendidoHasta)}: no podés crear ni editar actividades ni clases.`}
      </span>
      <Link to={RUTA_SANCIONES} style={s("font:700 13px Manrope;color:#8A5A00;")}>
        Ver mis sanciones
      </Link>
    </div>
  );
}
