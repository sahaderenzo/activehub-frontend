import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cumple, homeDe } from "../lib/areas";

/**
 * Guarda de **una pantalla**, complemento de `RequireArea` (que sólo decide el área).
 *
 * Hacía falta porque el área se abre con *alguno* de sus permisos: a un Alumno al que el
 * admin le quitó `inscripciones.gestionar` le quedaban `resenias.escribir` y
 * `denuncias.crear`, así que seguía entrando a `/alumno` — y con él a
 * `/alumno/inscripcion/:id`, que el backend rechaza con 403. El bug reportado ("le quité el
 * permiso y me sigo pudiendo inscribir") era exactamente eso: el frontend no leía el
 * permiso en ningún lado salvo para armar el menú.
 *
 * Igual que `RequireArea`, mientras `/api/auth/me` está en vuelo no se decide nada: con
 * `permisos` todavía vacío toda redirección sería un falso 403.
 */
export default function RequirePermiso({ clave }: { clave: string | string[] }) {
  const { currentUser, permisos, initializing } = useAuth();

  if (initializing) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  // Una lista significa "alcanza con uno": las pantallas con pestañas de módulos distintos
  // (Gestión) las abre cualquiera de sus pestañas, y adentro se filtra qué pestañas se ven.
  if (!cumple(clave, permisos)) return <Navigate to={homeDe(permisos)} replace />;

  return <Outlet />;
}
