import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Nadie navega a ningún lado hasta confirmar su correo.
 *
 * <p>Envuelve a las tres áreas (`RequireArea` queda adentro), así que cualquier ruta con
 * sesión pasa por acá: registrarse deja al usuario en `/verificar-email` y volver a
 * `/alumno`, escribir la URL a mano o usar el botón "atrás" lo devuelven ahí.
 *
 * <p><b>El backend hace lo mismo por su cuenta</b> (`EmailVerificadoFilter`): esta guarda es
 * la experiencia, no la seguridad. Sin el filtro, el token que se recibe al registrarse
 * serviría para llamar a la API con un fetch; sin esta guarda, el usuario vería pantallas que
 * se llenan de errores 403.
 *
 * <p>Mientras `initializing` no termina no se decide nada, igual que en `RequireArea`: con la
 * sesión a medio cargar, cualquier redirección es un falso positivo.
 *
 * <p>`emailVerificado === false` y no `!emailVerificado`: `undefined` son los usuarios del
 * dataset mock, que no traen el campo, y encerrarlos sería un falso positivo.
 */
export default function RequireEmailVerificado() {
  const { currentUser, initializing } = useAuth();

  if (initializing) return null;
  if (currentUser && currentUser.emailVerificado === false) {
    return <Navigate to="/verificar-email" replace />;
  }

  return <Outlet />;
}
