import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { RolNombre } from "../lib/types";

export default function RequireRole({ role }: { role: RolNombre }) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.rol !== role) {
    const home: Record<RolNombre, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };
    return <Navigate to={home[currentUser.rol]} replace />;
  }
  return <Outlet />;
}
