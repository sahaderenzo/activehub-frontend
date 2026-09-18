import type { SesionUsuario } from "../context/AuthContext";

/**
 * Si la cuenta se creó con Google y le faltan datos que Google no da.
 *
 * <h2>Sólo alcanza a las cuentas de Google, a propósito</h2>
 *
 * El hueco es exactamente ése: los formularios de registro piden teléfono y fecha de
 * nacimiento, "Continuar con Google" no. Mirar sólo los campos vacíos, sin mirar el
 * proveedor, encerraría a cuentas que nunca pasaron por ese camino — el administrador
 * sembrado por `app.admin-seed`, por ejemplo, nace sin teléfono y quedaría atrapado en una
 * pantalla de "terminá tu registro" que no le corresponde.
 *
 * <p>El teléfono no es un capricho: es obligatorio en `PUT /api/usuarios/me`, así que sin
 * cargarlo la persona ni siquiera podía guardar su propio Perfil.
 *
 * <p>Vive en `lib/` y no junto a `RequirePerfilCompleto` porque también la usan las pantallas
 * de login y registro para navegar directo, y un archivo que exporta un componente **y** una
 * función rompe el fast refresh (`react-refresh/only-export-components`).
 */
export function perfilIncompleto(usuario: SesionUsuario | null): boolean {
  if (!usuario || usuario.authProveedor !== "GOOGLE") return false;
  return !usuario.telefono?.trim() || !usuario.fechaNacimiento;
}
