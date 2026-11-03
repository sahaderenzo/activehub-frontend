import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RUTA_SANCIONES, rutaPermitidaConMulta } from "../lib/sanciones";

/**
 * V36: con una multa sin pagar, el instructor sólo ve "Mis sanciones" (donde la paga) y la
 * lista de inscriptos de sus clases, para confirmar cobros en efectivo. Cualquier otra pantalla
 * del área lo manda a pagar.
 *
 * <p>Es la experiencia, no la seguridad: el backend lo frena por su cuenta
 * (`MultaPendienteFilter`). Sin esta guarda el instructor vería pantallas llenándose de 403.
 * Va adentro de `RequireArea`, como `RequirePermiso`.
 */
export default function RequireSinMultaPendiente() {
  const { currentUser, initializing } = useAuth();
  const { pathname } = useLocation();

  if (initializing) return null;
  if (currentUser?.restricciones?.multaPendiente && !rutaPermitidaConMulta(pathname)) {
    return <Navigate to={RUTA_SANCIONES} replace />;
  }
  return <Outlet />;
}
