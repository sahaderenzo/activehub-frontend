import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import { CargandoAccion } from "./Cargando";
import { ApiError, useAuth } from "../context/AuthContext";

/**
 * "Correo electrónico" del perfil: el único lugar desde donde se cambia, y el único que
 * libera un correo ya reservado.
 *
 * <h2>Por qué el correo salió del formulario de datos personales</h2>
 *
 * Editar el nombre o el teléfono es editar un dato. Cambiar el correo es **cambiar la
 * credencial de acceso**, y arrastra dos consecuencias que el formulario de al lado no puede
 * expresar: hay que confirmarlo con un código (si no, cualquiera reservaría direcciones
 * ajenas) y, al confirmarse, el correo anterior queda libre para que otra persona lo use.
 * Por eso vive en su propia tarjeta, pide la contraseña actual y explica las dos cosas.
 *
 * <p><b>La cuenta no cambia acá.</b> Este formulario sólo dispara el mail al correo nuevo; el
 * cambio lo aplica la pantalla del código. Hasta entonces la cuenta sigue con el correo
 * anterior — así, un error de tipeo en el nuevo no deja a nadie sin credencial.
 *
 * <p>Compartido por los perfiles de alumno, instructor y admin: son la misma acción con la
 * misma regla, y tenerla escrita tres veces garantizaba que se desincronizaran.
 */
export default function CambiarEmailCard() {
  const navigate = useNavigate();
  const { currentUser, solicitarCambioEmail } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!currentUser) return null;

  const esGoogle = currentUser.authProveedor === "GOOGLE";
  const verificado = currentUser.emailVerificado !== false;

  const enviar = async () => {
    setError(null);
    if (!email.trim()) return setError("Ingresá el correo nuevo.");
    if (!password) return setError("Ingresá tu contraseña actual.");
    setEnviando(true);
    try {
      await solicitarCambioEmail(email.trim(), password);
      setPassword("");
      // A la pantalla del código: es la misma para el alta y para el cambio, y el backend
      // sabe cuál está pendiente.
      navigate("/verificar-email");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar el código. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={s(
        "background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px 24px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
      )}
    >
      <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>Correo electrónico</div>

      <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 4px;")}>
        <span style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{currentUser.email}</span>
        {verificado ? (
          <span
            style={s(
              "display:inline-flex;align-items:center;gap:5px;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:3px 10px;border-radius:99px;font:700 11.5px Manrope,sans-serif;",
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={3}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Confirmado
          </span>
        ) : (
          <span
            style={s(
              "background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;padding:3px 10px;border-radius:99px;font:700 11.5px Manrope,sans-serif;",
            )}
          >
            Sin confirmar
          </span>
        )}
      </div>

      {esGoogle ? (
        <p style={s("font-size:13.5px;line-height:1.6;color:#7A8C9E;margin:8px 0 0;")}>
          Entrás con Google, así que tu correo lo maneja tu cuenta de Google. Para cambiarlo, cambialo allá.
        </p>
      ) : !verificado ? (
        <>
          <p style={s("font-size:13.5px;line-height:1.6;color:#7A8C9E;margin:8px 0 14px;")}>
            Hasta que lo confirmes, otra persona puede registrarse con este correo.
          </p>
          <button
            className="ah-btn"
            onClick={() => navigate("/verificar-email")}
            style={s(
              "background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
            )}
          >
            Ingresar el código
          </button>
        </>
      ) : !abierto ? (
        <>
          <p style={s("font-size:13.5px;line-height:1.6;color:#7A8C9E;margin:8px 0 14px;")}>
            Esta dirección está reservada para tu cuenta. Si la cambiás, te mandamos un código al correo nuevo y
            la anterior queda libre.
          </p>
          <button
            className="ah-btn"
            onClick={() => {
              setAbierto(true);
              setError(null);
            }}
            style={s(
              "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;",
            )}
          >
            Cambiar mi correo
          </button>
        </>
      ) : (
        <div style={s("margin-top:14px;")}>
          {error && (
            <div
              style={s(
                "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 14px;margin-bottom:14px;font:600 13px Manrope,sans-serif;color:#BE3A3E;line-height:1.5;",
              )}
              role="alert"
            >
              {error}
            </div>
          )}

          <label style={s("display:block;font:700 12.5px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
            Correo nuevo
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@email.com"
            style={s(
              "width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14px Manrope,sans-serif;color:#0E2A47;outline:none;margin-bottom:14px;",
            )}
          />

          <label style={s("display:block;font:700 12.5px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
            Tu contraseña actual
          </label>
          {/* El correo es la credencial de acceso: sin la contraseña, una sesión abierta en
              una máquina ajena alcanzaría para quedarse con la cuenta de un click. */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Para confirmar que sos vos"
            style={s(
              "width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14px Manrope,sans-serif;color:#0E2A47;outline:none;margin-bottom:16px;",
            )}
          />

          <div style={s("display:flex;gap:10px;flex-wrap:wrap;")}>
            <button
              className="ah-btn"
              onClick={enviar}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:12px 20px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Enviarme el código
            </button>
            <button
              className="ah-btn"
              onClick={() => {
                setAbierto(false);
                setEmail("");
                setPassword("");
                setError(null);
              }}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px 20px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;",
              )}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <CargandoAccion activo={enviando} mensaje="Enviando el código a tu correo nuevo" />
    </div>
  );
}
