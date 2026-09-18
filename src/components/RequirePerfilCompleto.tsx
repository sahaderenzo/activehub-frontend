import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { perfilIncompleto } from "../lib/perfil";

/**
 * Una cuenta creada con Google no entra a la aplicación hasta cargar lo que Google no da
 * (teléfono y fecha de nacimiento). La condición exacta, y por qué sólo alcanza a las cuentas
 * de Google, está en `lib/perfil.ts`.
 *
 * <p>Va después de `RequireEmailVerificado` en la cadena: primero se confirma quién es el
 * correo, después se completan los datos. Una cuenta de Google ya nace verificada, así que en
 * la práctica sólo pasa por ésta.
 *
 * <p>Es un paso obligatorio y no un recordatorio: un cartel que se puede ignorar deja cuentas
 * a medio llenar para siempre, que es justo lo que esto viene a evitar.
 */
export default function RequirePerfilCompleto() {
  const { currentUser, initializing } = useAuth();

  if (initializing) return null;
  if (perfilIncompleto(currentUser)) return <Navigate to="/completar-registro" replace />;

  return <Outlet />;
}
