import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { ApiError, useAuth } from "../../context/AuthContext";
import type { RolNombre } from "../../lib/types";

const HOME_BY_ROL: Record<RolNombre, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

export default function Login() {
  const navigate = useNavigate();
  const { login, loginAsDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = login(email, password);
      navigate(HOME_BY_ROL[user.rol]);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const demo = (rol: RolNombre) => {
    const user = loginAsDemo(rol);
    navigate(HOME_BY_ROL[user.rol]);
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
            Ingresá para ver tus reservas, inscribirte a nuevas clases y descubrir actividades cerca tuyo.
          </p>
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {[
              "Reservá y pagá en pocos pasos",
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

          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Correo electrónico</label>
          <div style={fieldStyle(!!error)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@email.com"
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

          <button
            type="button"
            disabled
            title="Próximamente"
            className="ah-btn"
            style={s(
              "width:100%;background:#fff;color:#0E2A47;border:1px solid #D9E1EA;border-radius:12px;padding:13px;font:700 15px Manrope;cursor:not-allowed;opacity:.6;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:26px;",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
            </svg>
            Continuar con Google (próximamente)
          </button>

          <div style={s("text-align:center;font-size:14.5px;color:#65788C;font-weight:600;")}>
            ¿No tenés cuenta?{" "}
            <span className="ah-link" onClick={() => navigate("/registro")} style={s("color:#FF6A2B;font-weight:700;cursor:pointer;")}>
              Crear cuenta
            </span>
          </div>

          <div style={s("margin-top:26px;border-top:1px dashed #D5DEE7;padding-top:16px;text-align:center;")}>
            <div style={s("font:700 11px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;")}>
              Demo — entrar como
            </div>
            <div style={s("display:flex;gap:8px;")}>
              <button
                type="button"
                className="ah-btn"
                onClick={() => demo("ALUMNO")}
                style={s(
                  "flex:1;background:#EEF4FB;color:#2D5BC8;border:1px solid #D5E2FB;border-radius:10px;padding:9px;font:700 13px Manrope;cursor:pointer;",
                )}
              >
                Alumno
              </button>
              <button
                type="button"
                className="ah-btn"
                onClick={() => demo("INSTRUCTOR")}
                style={s(
                  "flex:1;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;border-radius:10px;padding:9px;font:700 13px Manrope;cursor:pointer;",
                )}
              >
                Instructor
              </button>
              <button
                type="button"
                className="ah-btn"
                onClick={() => demo("ADMIN")}
                style={s(
                  "flex:1;background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;border-radius:10px;padding:9px;font:700 13px Manrope;cursor:pointer;",
                )}
              >
                Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
