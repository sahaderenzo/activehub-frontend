import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeDe, puedeEntrarA, type Area } from "../lib/areas";

/**
 * Reemplaza a `RequireRole`. La diferencia no es cosmética: la guarda vieja comparaba
 * `currentUser.rol` con un nombre de rol fijo, así que un rol al que el admin le daba
 * permisos de instructor no llegaba nunca a `/instructor` (RN-19 / E4Ad-HU08 criterio 2).
 * Ahora la puerta la abre el permiso, igual que en el backend.
 *
 * Mientras `/api/auth/me` está en vuelo no se decide nada: con `permisos` todavía vacío
 * cualquier redirección sería un falso 403 y el usuario terminaba rebotado al catálogo
 * público apenas recargaba la página.
 */
export default function RequireArea({ area }: { area: Area }) {
  const { currentUser, permisos, initializing } = useAuth();

  if (initializing) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!puedeEntrarA(area, permisos)) return <Navigate to={homeDe(permisos)} replace />;

  return <Outlet />;
}
