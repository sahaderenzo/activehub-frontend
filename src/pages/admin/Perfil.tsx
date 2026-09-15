import { useState } from "react";
import DashLayout from "../../components/DashLayout";
import Avatar from "../../components/Avatar";
import { s } from "../../lib/style";
import { useAuth, passwordStrength } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { ApiError } from "../../lib/api";

/**
 * Perfil del administrador.
 *
 * <p>Antes no existía: el administrador era el único de los tres roles sin pantalla de cuenta
 * propia, así que no tenía dónde corregir su nombre, su correo ni su teléfono, ni cambiar su
 * contraseña. Podía editar la cuenta de cualquier otro usuario desde Gestión, pero no la
 * suya: `actualizarUsuarioAdmin` apunta a un id ajeno y el listado de Gestión no se ofrece a
 * sí mismo como fila editable.
 *
 * <p>Usa las mismas funciones de `AuthContext` que el perfil del alumno y el del instructor
 * (`actualizarMiPerfil` / `cambiarMiContrasenia`), que son las que refrescan `currentUser`:
 * el nombre del sidebar y el avatar se actualizan solos al guardar.
 *
 * <p>Sin "dar de baja mi cuenta", a diferencia del alumno: un administrador que se borra a sí
 * mismo puede dejar la plataforma sin nadie que la administre. Las bajas de cuentas admin se
 * hacen desde Gestión, con otra cuenta.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CARD =
  "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);";
const LABEL =
  "display:block;font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;";
const INPUT =
  "width:100%;border:1.5px solid #E2E9F0;border-radius:11px;padding:11px 13px;font:600 14px Manrope,sans-serif;color:#0E2A47;";
const OK =
  "background:#E7F8F5;border:1px solid #CBEDE7;border-radius:11px;padding:10px 13px;font:600 13px Manrope,sans-serif;color:#0C8576;margin-bottom:13px;";
const ERR =
  "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:10px 13px;font:600 13px Manrope,sans-serif;color:#BE3A3E;margin-bottom:13px;";

export default function AdminPerfil() {
  const { currentUser, actualizarMiPerfil, cambiarMiContrasenia } = useAuth();
  const data = useData();

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(currentUser?.nombre ?? "");
  const [apellido, setApellido] = useState(currentUser?.apellido ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [telefono, setTelefono] = useState(currentUser?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [okPerfil, setOkPerfil] = useState<string | null>(null);
  const [fotoVersion, setFotoVersion] = useState(0);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passRepetida, setPassRepetida] = useState("");
  const [errorPass, setErrorPass] = useState<string | null>(null);
  const [okPass, setOkPass] = useState<string | null>(null);

  if (!currentUser) return null;

  const empezarEdicion = () => {
    setNombre(currentUser.nombre);
    setApellido(currentUser.apellido);
    setEmail(currentUser.email);
    setTelefono(currentUser.telefono ?? "");
    setErrorPerfil(null);
    setOkPerfil(null);
    setEditando(true);
  };

  const guardar = async () => {
    setErrorPerfil(null);
    if (!nombre.trim() || !apellido.trim()) return setErrorPerfil("El nombre y el apellido son obligatorios.");
    if (!EMAIL_RE.test(email.trim())) return setErrorPerfil("Ingresá un correo electrónico válido.");
    // Espejo del backend: en `actualizarmiperfil` el teléfono es @NotBlank y el patrón sólo
    // admite números, espacios y un "+" inicial.
    if (!telefono.trim()) return setErrorPerfil("El teléfono es obligatorio.");
    if (!/^\+?[0-9 ]+$/.test(telefono.trim())) return setErrorPerfil("El teléfono sólo puede tener números.");

    setGuardando(true);
    try {
      await actualizarMiPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
      });
      setEditando(false);
      setOkPerfil("Datos actualizados.");
      window.setTimeout(() => setOkPerfil(null), 3000);
    } catch (err) {
      setErrorPerfil(err instanceof ApiError ? err.message : "No pudimos guardar tus datos. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    setErrorPass(null);
    setOkPass(null);
    if (!passActual || !passNueva) return setErrorPass("Completá los tres campos.");
    if (passNueva !== passRepetida) return setErrorPass("Las contraseñas nuevas no coinciden.");
    // Misma política que el registro (RN-20): 8 caracteres, una mayúscula y un número.
    if (!passwordStrength(passNueva).ok) {
      return setErrorPass("La contraseña debe tener 8 caracteres, una mayúscula y un número.");
    }
    try {
      await cambiarMiContrasenia(passActual, passNueva);
      setPassActual("");
      setPassNueva("");
      setPassRepetida("");
      setOkPass("Contraseña actualizada.");
      window.setTimeout(() => setOkPass(null), 3000);
    } catch (err) {
      setErrorPass(err instanceof ApiError ? err.message : "No pudimos cambiar la contraseña.");
    }
  };

  const campo = (label: string, valor: string, onChange: (v: string) => void, tipo = "text") => (
    <label style={s("display:block;margin-bottom:13px;")}>
      <span style={s(LABEL)}>{label}</span>
      {editando ? (
        <input type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} style={s(INPUT)} />
      ) : (
        <span style={s("font:600 14.5px Manrope,sans-serif;color:#0E2A47;")}>{valor || "—"}</span>
      )}
    </label>
  );

  const campoPass = (label: string, valor: string, onChange: (v: string) => void) => (
    <label style={s("display:block;margin-bottom:13px;")}>
      <span style={s(LABEL)}>{label}</span>
      <input type="password" value={valor} onChange={(e) => onChange(e.target.value)} style={s(INPUT)} />
    </label>
  );

  return (
    <DashLayout role="admin" active="perfilAdmin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Mi perfil</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Los datos de tu propia cuenta. Las cuentas de los demás usuarios se editan desde Gestión.
        </p>
      </div>

      <div style={s("padding:26px 32px 50px;max-width:820px;")}>
        <div style={s(CARD + "margin-bottom:20px;")}>
          <div style={s("display:flex;align-items:center;gap:18px;flex-wrap:wrap;")}>
            <Avatar
              usuarioId={currentUser.id}
              nombre={currentUser.nombre}
              size={72}
              fontSize={26}
              gradient="linear-gradient(140deg,#F5A623,#FF6A2B)"
              version={fotoVersion}
              onUpload={async (archivo) => {
                setErrorFoto(null);
                try {
                  await data.subirFotoPerfil(archivo);
                  setFotoVersion((v) => v + 1);
                } catch (err) {
                  setErrorFoto(err instanceof ApiError ? err.message : "No pudimos subir la foto.");
                }
              }}
            />
            <div style={s("flex:1;min-width:0;")}>
              <div style={s("font:700 19px Space Grotesk,sans-serif;color:#0E2A47;")}>
                {currentUser.nombre} {currentUser.apellido}
              </div>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>{currentUser.email}</div>
              <div
                style={s(
                  "margin-top:6px;display:inline-block;font:700 11.5px Manrope,sans-serif;padding:3px 10px;border-radius:99px;background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;",
                )}
              >
                Administrador
              </div>
            </div>
            <button
              className="ah-btn"
              onClick={() => (editando ? setEditando(false) : empezarEdicion())}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:10px 16px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;",
              )}
            >
              {editando ? "Cancelar edición" : "Editar perfil"}
            </button>
          </div>
          {errorFoto && <div style={s("margin-top:12px;" + ERR)}>{errorFoto}</div>}
        </div>

        <div style={s(CARD + "margin-bottom:20px;")}>
          <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:18px;")}>Datos personales</div>
          {okPerfil && <div style={s(OK)}>{okPerfil}</div>}
          {errorPerfil && <div style={s(ERR)}>{errorPerfil}</div>}
          <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:0 18px;")}>
            {campo("Nombre", nombre, setNombre)}
            {campo("Apellido", apellido, setApellido)}
            {campo("Correo electrónico", email, setEmail, "email")}
            {campo("Teléfono", telefono, setTelefono)}
          </div>
          {editando && (
            <button
              className="ah-btn"
              onClick={guardar}
              disabled={guardando}
              style={s(
                `background:${guardando ? "#BFE4E0" : "#0FB8A9"};color:#fff;border:none;border-radius:11px;padding:11px 20px;font:700 13.5px Manrope,sans-serif;cursor:${guardando ? "default" : "pointer"};`,
              )}
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </div>

        <div style={s(CARD)}>
          <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Seguridad de la cuenta</div>
          <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-bottom:16px;")}>
            8 caracteres como mínimo, con una mayúscula y un número.
          </div>
          {okPass && <div style={s(OK)}>{okPass}</div>}
          {errorPass && <div style={s(ERR)}>{errorPass}</div>}
          <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:0 18px;")}>
            {campoPass("Contraseña actual", passActual, setPassActual)}
            <span />
            {campoPass("Contraseña nueva", passNueva, setPassNueva)}
            {campoPass("Repetir contraseña nueva", passRepetida, setPassRepetida)}
          </div>
          <button
            className="ah-btn"
            onClick={cambiarPassword}
            style={s(
              "background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:11px 20px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
            )}
          >
            Cambiar contraseña
          </button>
        </div>
      </div>
    </DashLayout>
  );
}
