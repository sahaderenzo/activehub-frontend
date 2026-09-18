import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { ApiError, useAuth } from "../../context/AuthContext";
import { homeDe } from "../../lib/areas";
import BotonGoogle from "../../components/BotonGoogle";
import { perfilIncompleto } from "../../lib/perfil";
import { CargandoAccion } from "../../components/Cargando";

export default function Login() {
  const navigate = useNavigate();
  const { login, ingresarConGoogle } = useAuth();
  // Correo o DNI: el backend acepta las dos credenciales.
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Correo de Google que no tiene cuenta acá. No es un error: es el desvío hacia el registro,
   * y por eso se muestra con su propio botón en vez de como un cartel rojo sin salida.
   */
  const [sinCuenta, setSinCuenta] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(identificador.trim(), password);
      // RN-19: adonde entra lo deciden sus permisos, no el nombre de su rol. Un rol creado
      // en "Roles y permisos" no tiene entrada en ningun mapa fijo por rol.
      navigate(homeDe(user.permisos ?? []));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * "Iniciar sesión con Google": **sin rol**, así que el backend no crea ninguna cuenta. Si el
   * correo no tiene cuenta responde `SIN_CUENTA` y se lo manda a registrarse, en vez de
   * fabricarle una cuenta vacía desde una pantalla que dice "iniciar sesión".
   */
  const ingresarConGoogleLogin = async (idToken: string) => {
    setError(null);
    setSinCuenta(null);
    setLoading(true);
    try {
      const respuesta = await ingresarConGoogle(idToken);
      if (respuesta.modo === "SIN_CUENTA") {
        // Estado propio y no `setError`: esto no es un error del usuario, es un desvío, y
        // necesita su propia salida. Con un texto suelto quedaba en un callejón: decía
        // "creá tu cuenta" y no había dónde hacerlo más que buscando el link del pie.
        setSinCuenta(respuesta.identidad?.email ?? null);
        return;
      }
      // Cuenta de Google con datos a medias: a terminar el registro, no al panel. El guardián
      // de rutas hace lo mismo, pero navegar directo evita el parpadeo.
      if (perfilIncompleto(respuesta.sesion ?? null)) {
        navigate("/completar-registro", { replace: true });
        return;
      }
      navigate(homeDe(respuesta.sesion?.permisos ?? []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos ingresar con Google. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (invalid: boolean) =>
    s(
      `display:flex;align-items:center;gap:10px;background:${invalid ? "#FBEAEB" : "#fff"};border:1px solid ${invalid ? "#E5484D" : "#D9E1EA"};border-radius:12px;padding:13px 15px;margin-bottom:16px;`,
    );

  return (
    <div className="ah-screen ah-grid-side" style={s("min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;")}>
      <div
        style={s(
          "position:relative;background:linear-gradient(160deg,#0E2A47,#0A1F36);padding:46px 56px;display:flex;flex-direction:column;overflow:hidden;",
        )}
      >
        <div
          style={s(
            "position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(18,181,165,.22),transparent 55%),radial-gradient(circle at 80% 80%,rgba(255,106,43,.16),transparent 50%);",
          )}
        />
        <div style={s("position:absolute;inset:0;background:linear-gradient(160deg,rgba(14,42,71,.5),rgba(10,31,54,.62));")} />
        <div
          style={s(
            "position:absolute;top:-80px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(18,181,165,.3),transparent 70%);",
          )}
        />
        <div
          style={s(
            "position:absolute;bottom:-100px;left:-40px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,106,43,.18),transparent 70%);",
          )}
        />
        <div style={s("display:flex;align-items:center;gap:11px;cursor:pointer;position:relative;")} onClick={() => navigate("/")}>
          <div
            style={s(
              "width:38px;height:38px;border-radius:11px;background:linear-gradient(140deg,#12B5A5,#FF6A2B);display:flex;align-items:center;justify-content:center;font:700 20px Space Grotesk;color:#fff;",
            )}
          >
            A
          </div>
          <span style={s("font:700 21px Space Grotesk;color:#fff;")}>ActiveHub</span>
        </div>
        <div style={s("margin:auto 0;position:relative;")}>
          <h2
            style={s(
              "font:700 38px/1.15 Space Grotesk;color:#fff;letter-spacing:-1px;margin:0 0 18px;max-width:440px;text-shadow:0 2px 14px rgba(8,22,38,.6);",
            )}
          >
            Tu próxima clase está a <span style={s("color:#FF8A4C;")}>un clic</span> de distancia
          </h2>
          <p style={s("font-size:16px;line-height:1.6;color:#E4EDF5;max-width:380px;margin:0 0 30px;text-shadow:0 1px 10px rgba(8,22,38,.65);")}>
            Ingresá para ver tus inscripciones, anotarte en nuevas clases y descubrir actividades cerca tuyo.
          </p>
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {[
              "Inscribite y pagá en pocos pasos",
              "Cupos y horarios en tiempo real",
              "Calificá y comentá tus actividades",
            ].map((txt, i) => (
              <div
                key={txt}
                style={s(
                  "display:flex;align-items:center;gap:12px;color:#F0F6FB;font-size:15px;font-weight:600;text-shadow:0 1px 8px rgba(8,22,38,.6);",
                )}
              >
                <span
                  style={s(
                    `width:26px;height:26px;border-radius:8px;background:rgba(${i % 2 === 0 ? "18,181,165,.28" : "255,106,43,.3"});display:flex;align-items:center;justify-content:center;`,
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={i % 2 === 0 ? "#22D3C0" : "#FF8A4C"} strokeWidth={3}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {txt}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s("display:flex;align-items:center;justify-content:center;padding:40px;background:#F4F7FA;")}>
        <form style={s("width:100%;max-width:392px;")} onSubmit={submit}>
          <h1 style={s("font:700 30px Space Grotesk;letter-spacing:-.6px;margin:0 0 6px;")}>Iniciar sesión</h1>
          <p style={s("color:#65788C;font-size:15px;margin:0 0 22px;")}>Ingresá con tu cuenta de ActiveHub</p>

          {error && (
            <div
              style={s(
                "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
              )}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2} style={{ flex: "none" }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
            </div>
          )}

          {sinCuenta && (
            <div
              style={s(
                "background:#EAF1FE;border:1px solid #D5E2FB;border-radius:12px;padding:14px 16px;margin-bottom:18px;",
              )}
            >
              <div style={s("font:700 13.5px Manrope;color:#2D5BC8;line-height:1.5;margin-bottom:4px;")}>
                Todavía no tenés cuenta con {sinCuenta}
              </div>
              <div style={s("font-size:13px;line-height:1.5;color:#41566B;font-weight:600;margin-bottom:12px;")}>
                Creala en un paso: elegís si sos alumno o instructor y seguís con la misma cuenta de Google.
              </div>
              <button
                type="button"
                className="ah-btn"
                onClick={() => navigate("/registro")}
                style={s(
                  "background:#2D5BC8;color:#fff;border:none;border-radius:10px;padding:10px 18px;font:700 13.5px Manrope;cursor:pointer;",
                )}
              >
                Crear mi cuenta
              </button>
            </div>
          )}

          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
            Correo electrónico o DNI
          </label>
          <div style={fieldStyle(!!error)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
            {/* type="text" y no "email": con "email" el navegador rechazaba un DNI válido. */}
            <input
              type="text"
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="vos@email.com o 30123456"
              autoComplete="username"
              style={s("border:none;outline:none;font:600 15px Manrope;color:#0E2A47;width:100%;background:transparent;")}
            />
          </div>

          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Contraseña</label>
          <div style={fieldStyle(!!error)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={s("border:none;outline:none;font:600 15px Manrope;color:#0E2A47;width:100%;background:transparent;letter-spacing:2px;")}
            />
          </div>

          <div style={s("text-align:right;margin-bottom:20px;")}>
            <span className="ah-link" style={s("font-size:13.5px;font-weight:700;color:#12B5A5;cursor:pointer;")}>
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          <button
            className="ah-btn"
            type="submit"
            disabled={loading}
            style={s(
              "width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.3);margin-bottom:16px;",
            )}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <div style={s("display:flex;align-items:center;gap:14px;color:#9AAABA;font-size:13px;font-weight:600;margin-bottom:16px;")}>
            <div style={s("flex:1;height:1px;background:#E1E8EF;")} />o
            <div style={s("flex:1;height:1px;background:#E1E8EF;")} />
          </div>

          {/*
            Acá es sólo para ENTRAR: va sin rol, y si no hay cuenta con ese correo el backend
            no crea ninguna (`SIN_CUENTA`). Quien aprieta "Iniciar sesión con Google" espera
            entrar a su cuenta, no que le aparezca una nueva a medio llenar — el alta con
            Google vive en la pantalla de registro, después de elegir alumno o instructor.
          */}
          <div style={s("margin-bottom:24px;")}>
            <BotonGoogle texto="signin_with" onCredencial={ingresarConGoogleLogin} />
          </div>

          <div style={s("text-align:center;font-size:14.5px;color:#65788C;font-weight:600;")}>
            ¿No tenés cuenta?{" "}
            <span className="ah-link" onClick={() => navigate("/registro")} style={s("color:#FF6A2B;font-weight:700;cursor:pointer;")}>
              Crear cuenta
            </span>
          </div>
        </form>
      </div>
      <CargandoAccion activo={loading} mensaje="Ingresando a tu cuenta" />
    </div>
  );
}
