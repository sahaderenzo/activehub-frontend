import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { CargandoAccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { ApiError, useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { homeDe } from "../../lib/areas";

/**
 * Terminar el registro cuando la cuenta se creó con Google.
 *
 * <h2>Por qué existe</h2>
 *
 * Google devuelve nombre, apellido y correo, y nada más: no da teléfono, ni fecha de
 * nacimiento, ni DNI. Una cuenta creada así queda con esos campos vacíos y el usuario aterriza
 * en la aplicación sin enterarse — hasta que algo se los pide. Peor: el teléfono es
 * obligatorio en `PUT /api/usuarios/me`, así que su propio Perfil no se podía guardar sin
 * completarlo primero.
 *
 * <p>Esta pantalla es el equivalente a la segunda mitad del formulario de registro, para el
 * camino que se lo saltea. Sirve igual para alumno y para instructor: pide lo que falte según
 * el rol, y los intereses sólo tienen sentido para quien se anota a clases.
 *
 * <h2>Es un paso obligatorio, no un recordatorio</h2>
 *
 * `RequirePerfilCompleto` manda acá y no deja salir hasta que los datos estén. La alternativa
 * —un cartel que se puede ignorar— deja cuentas a medio llenar para siempre, que es
 * exactamente el problema que se está arreglando. Por eso tampoco hay botón de "después": lo
 * único que se puede hacer en su lugar es cerrar sesión.
 */
const HOY_ISO = new Date().toISOString().slice(0, 10);

export default function CompletarRegistro() {
  const navigate = useNavigate();
  const { currentUser, permisos, actualizarMiPerfil, actualizarMisIntereses, logout } = useAuth();
  const { tiposActividad, categorias } = useData();

  const esAlumno = currentUser?.rol === "ALUMNO";

  const [telefono, setTelefono] = useState(currentUser?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(currentUser?.fechaNacimiento ?? "");
  const [dni, setDni] = useState(currentUser?.dni ?? "");
  const [intereses, setIntereses] = useState<string[]>(
    currentUser?.perfilAlumno?.intereses.map((i) => i.tipoActividadId) ?? [],
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Mismo agrupado que el registro y el perfil: un interés es un TipoActividad y se elige
  // dentro de su categoría (V19 del backend).
  const porCategoria = useMemo(
    () =>
      categorias
        .map((c) => ({ categoria: c, tipos: tiposActividad.filter((t) => t.categoriaId === c.id) }))
        .filter((g) => g.tipos.length > 0),
    [categorias, tiposActividad],
  );

  if (!currentUser) {
    navigate("/login", { replace: true });
    return null;
  }

  const toggleInteres = (id: string) =>
    setIntereses((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!telefono.trim()) e.telefono = "Este campo es obligatorio.";
    else if (!/^\+?[0-9 ]+$/.test(telefono.trim())) e.telefono = "El teléfono debe contener solo números.";
    if (!fechaNacimiento) e.fechaNacimiento = "Este campo es obligatorio.";
    // Opcional, pero si se carga tiene que ser válido: es credencial de login y clave de
    // unicidad de la cuenta, igual que en el registro normal.
    if (dni.trim() && !/^[0-9]{7,8}$/.test(dni.trim())) e.dni = "El DNI debe tener 7 u 8 dígitos.";
    return e;
  };

  const guardar = async () => {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    try {
      await actualizarMiPerfil({
        nombre: currentUser.nombre,
        apellido: currentUser.apellido,
        // El correo no se toca: es el de Google y el backend rechaza cualquier otro.
        email: currentUser.email,
        telefono: telefono.trim(),
        fechaNacimiento,
        dni: dni.trim() || undefined,
      });
      // Los intereses van por su propio endpoint y son opcionales: si fallan, el perfil ya
      // quedó completo y no tiene sentido devolver al usuario a esta pantalla.
      if (esAlumno && intereses.length > 0) {
        await actualizarMisIntereses(intereses).catch(() => {});
      }
      navigate(homeDe(permisos), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrores(err.fieldErrors);
      else setErrores({ telefono: err instanceof ApiError ? err.message : "No pudimos guardar tus datos." });
    } finally {
      setGuardando(false);
    }
  };

  const inputStyle = (campo: string) =>
    s(
      `width:100%;border:1px solid ${errores[campo] ? "#E5484D" : "#D9E1EA"};background:${
        errores[campo] ? "#FBEAEB" : "#fff"
      };border-radius:11px;padding:12px 14px;font:600 14.5px Manrope,sans-serif;color:#0E2A47;outline:none;`,
    );

  const errorDe = (campo: string) =>
    errores[campo] ? (
      <span style={s("display:block;font-size:12.5px;color:#E5484D;font-weight:600;margin-top:5px;")}>
        {errores[campo]}
      </span>
    ) : null;

  return (
    <div
      className="ah-screen"
      style={s("min-height:100vh;background:#F4F7FA;display:flex;flex-direction:column;align-items:center;padding:34px 20px 60px;")}
    >
      <div style={s("margin-bottom:26px;")}>
        <Logo />
      </div>

      <div
        style={s(
          "width:100%;max-width:560px;background:#fff;border:1px solid #E7EDF3;border-radius:20px;padding:30px;box-shadow:0 14px 34px rgba(14,42,71,.08);",
        )}
      >
        <h1 style={s("font:700 25px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;letter-spacing:-.5px;")}>
          Terminá tu registro
        </h1>
        <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 0 6px;")}>
          Tu cuenta se creó con Google, así que nos faltan un par de datos que Google no nos da.
        </p>
        <p style={s("font-size:13.5px;line-height:1.6;color:#8194A8;margin:0 0 24px;")}>
          Entraste como <strong style={s("color:#0E2A47;")}>{currentUser.email}</strong>.
        </p>

        <label style={s("display:block;font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:7px;")}>
          Teléfono <span style={s("color:#E5484D;")}>*</span>
        </label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="2611234567"
          style={inputStyle("telefono")}
        />
        {errorDe("telefono")}

        <div style={s("height:16px;")} />

        <label style={s("display:block;font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:7px;")}>
          Fecha de nacimiento <span style={s("color:#E5484D;")}>*</span>
        </label>
        <input
          type="date"
          value={fechaNacimiento}
          max={HOY_ISO}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          style={inputStyle("fechaNacimiento")}
        />
        {errorDe("fechaNacimiento")}

        <div style={s("height:16px;")} />

        <label style={s("display:block;font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:7px;")}>
          DNI
        </label>
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="30123456"
          style={inputStyle("dni")}
        />
        {errorDe("dni") ?? (
          <span style={s("display:block;font-size:12px;color:#90A1B2;font-weight:600;margin-top:5px;")}>
            Opcional. Si lo cargás, también vas a poder iniciar sesión con él.
          </span>
        )}

        {/* Los intereses sólo tienen sentido para quien se anota a clases: alimentan
            "Recomendado para vos" del Home del alumno. */}
        {esAlumno && porCategoria.length > 0 && (
          <>
            <div style={s("height:24px;")} />
            <label style={s("display:block;font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:4px;")}>
              ¿Qué te interesa?
            </label>
            <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-bottom:12px;")}>
              Opcional. Lo usamos para recomendarte actividades.
            </div>
            <div style={s("display:flex;flex-direction:column;gap:14px;")}>
              {porCategoria.map(({ categoria, tipos }) => (
                <div key={categoria.id}>
                  <div
                    style={s(
                      "font:700 11.5px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;",
                    )}
                  >
                    {categoria.nombre}
                  </div>
                  <div style={s("display:flex;flex-wrap:wrap;gap:8px;")}>
                    {tipos.map((t) => {
                      const on = intereses.includes(t.id);
                      return (
                        <span
                          key={t.id}
                          className="ah-btn"
                          onClick={() => toggleInteres(t.id)}
                          style={s(
                            `cursor:pointer;padding:8px 14px;border-radius:999px;font:700 13px Manrope,sans-serif;border:1.5px solid ${
                              on ? "#12B5A5" : "#E2E9F0"
                            };background:${on ? "#E7F8F5" : "#fff"};color:${on ? "#0C8576" : "#65788C"};`,
                          )}
                        >
                          {t.nombre}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={s("height:26px;")} />

        <button
          className="ah-btn"
          onClick={guardar}
          style={s(
            "width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px;font:700 15px Manrope,sans-serif;cursor:pointer;",
          )}
        >
          Terminar y entrar
        </button>

        <div style={s("height:1px;background:#EEF2F6;margin:22px 0 14px;")} />
        <p style={s("font-size:12.5px;line-height:1.6;color:#90A1B2;margin:0 0 12px;")}>
          {/* No hay "completar después": una cuenta a medio llenar es justo lo que esto viene
              a evitar. Lo único alternativo es irse. */}
          Necesitamos estos datos para que puedas inscribirte y para que el instructor pueda
          contactarte.
        </p>
        <span
          className="ah-link"
          onClick={() => {
            logout();
            navigate("/");
          }}
          style={s("font:700 13px Manrope,sans-serif;color:#7A8C9E;cursor:pointer;")}
        >
          Salir
        </span>
      </div>

      <CargandoAccion activo={guardando} mensaje="Guardando tus datos" />
    </div>
  );
}
