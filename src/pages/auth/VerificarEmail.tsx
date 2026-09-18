import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { CargandoAccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { homeDe } from "../../lib/areas";

/**
 * Ingresar el código de 6 dígitos que llegó por mail.
 *
 * <p>Es la misma pantalla para el alta y para un cambio de correo: el backend sabe cuál es el
 * código pendiente y qué dirección confirma, así que el cliente no tiene que elegir nada. Lo
 * único que cambia es el cartel de éxito (`cambioDeEmail` en la respuesta).
 *
 * <h2>Seis inputs, no uno</h2>
 *
 * Un solo campo de texto obliga a mirar dónde va el cursor y no da señal de cuántos dígitos
 * faltan. Con seis casillas, pegar el código del mail funciona (se reparte solo), el foco
 * avanza al tipear y retrocede con Backspace, y al completar el sexto dígito se envía sin
 * tener que buscar el botón.
 */
const LARGO = 6;

export default function VerificarEmail() {
  const navigate = useNavigate();
  const { currentUser, verificarEmail, reenviarCodigoEmail, logout } = useAuth();

  const [digitos, setDigitos] = useState<string[]>(Array(LARGO).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [listo, setListo] = useState<{ email: string; cambioDeEmail: boolean; permisos: string[] } | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  if (!currentUser) {
    navigate("/login", { replace: true });
    return null;
  }

  const codigo = digitos.join("");

  const enviar = async (valor: string) => {
    if (valor.length !== LARGO || verificando) return;
    setError(null);
    setAviso(null);
    setVerificando(true);
    try {
      const resultado = await verificarEmail(valor);
      setListo(resultado);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos verificar el código. Intentá de nuevo.");
      // Se limpia y vuelve el foco al principio: reescribir seis dígitos sobre los viejos es
      // peor que empezar de cero.
      setDigitos(Array(LARGO).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setVerificando(false);
    }
  };

  const escribir = (indice: number, valor: string) => {
    const soloDigitos = valor.replace(/\D/g, "");
    if (!soloDigitos) {
      // Borrar dentro de la casilla.
      setDigitos((prev) => prev.map((d, i) => (i === indice ? "" : d)));
      return;
    }
    setDigitos((prev) => {
      const next = [...prev];
      // Pegar el código completo desde el mail: se reparte a partir de esta casilla.
      for (let i = 0; i < soloDigitos.length && indice + i < LARGO; i++) {
        next[indice + i] = soloDigitos[i];
      }
      const siguiente = Math.min(indice + soloDigitos.length, LARGO - 1);
      inputs.current[siguiente]?.focus();
      const completo = next.join("");
      if (completo.length === LARGO) void enviar(completo);
      return next;
    });
  };

  const teclear = (indice: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digitos[indice] && indice > 0) {
      inputs.current[indice - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && indice > 0) inputs.current[indice - 1]?.focus();
    if (e.key === "ArrowRight" && indice < LARGO - 1) inputs.current[indice + 1]?.focus();
  };

  const reenviar = async () => {
    setError(null);
    setAviso(null);
    setReenviando(true);
    try {
      const { email, enviado } = await reenviarCodigoEmail();
      setAviso(
        enviado
          ? `Te enviamos un código nuevo a ${email}.`
          : `Generamos un código nuevo, pero el servidor de correo no está configurado. `
              + `Pedíselo a quien administra la plataforma.`,
      );
      setDigitos(Array(LARGO).fill(""));
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos reenviar el código.");
    } finally {
      setReenviando(false);
    }
  };

  if (listo) {
    return (
      <Pantalla>
        <div style={s("text-align:center;")}>
          <div
            style={s(
              "width:56px;height:56px;border-radius:99px;background:#E7F8F5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;",
            )}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0FB8A9" strokeWidth={2.6}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;letter-spacing:-.5px;")}>
            {listo.cambioDeEmail ? "Correo actualizado" : "¡Cuenta verificada!"}
          </h1>
          <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 0 22px;")}>
            {listo.cambioDeEmail
              ? `Tu cuenta ahora usa ${listo.email}. El correo anterior quedó liberado.`
              : `Confirmaste ${listo.email}. Esa dirección queda reservada para tu cuenta.`}
          </p>
          <button
            className="ah-btn"
            onClick={() => navigate(homeDe(listo.permisos))}
            style={s(
              "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:13px 26px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
            )}
          >
            Continuar
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <h1 style={s("font:700 25px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;letter-spacing:-.5px;")}>
        Confirmá tu correo
      </h1>
      <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 0 22px;")}>
        Te enviamos un código de 6 dígitos a{" "}
        <strong style={s("color:#0E2A47;")}>{currentUser.email}</strong>. Ingresalo para activar tu cuenta.
      </p>

      <div style={s("display:flex;gap:9px;justify-content:space-between;margin-bottom:18px;")}>
        {digitos.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => escribir(i, e.target.value)}
            onKeyDown={(e) => teclear(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LARGO}
            aria-label={`Dígito ${i + 1}`}
            style={s(
              `flex:1;min-width:0;height:58px;text-align:center;font:700 24px Space Grotesk,sans-serif;color:#0E2A47;border:1.5px solid ${
                error ? "#F3C6C7" : d ? "#12B5A5" : "#D6DEE7"
              };border-radius:13px;outline:none;background:#fff;`,
            )}
          />
        ))}
      </div>

      {error && (
        <div
          style={s(
            "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:12px 14px;margin-bottom:16px;font:600 13px Manrope,sans-serif;color:#BE3A3E;line-height:1.5;",
          )}
          role="alert"
        >
          {error}
        </div>
      )}
      {aviso && (
        <div
          style={s(
            "background:#E7F8F5;border:1px solid #CBEDE7;border-radius:12px;padding:12px 14px;margin-bottom:16px;font:600 13px Manrope,sans-serif;color:#0C8576;line-height:1.5;",
          )}
          role="status"
        >
          {aviso}
        </div>
      )}

      <button
        className="ah-btn"
        onClick={() => enviar(codigo)}
        disabled={codigo.length !== LARGO}
        style={s(
          `width:100%;background:${codigo.length === LARGO ? "#FF6A2B" : "#E8EDF2"};color:${
            codigo.length === LARGO ? "#fff" : "#9AAABA"
          };border:none;border-radius:12px;padding:14px;font:700 15px Manrope,sans-serif;cursor:${
            codigo.length === LARGO ? "pointer" : "not-allowed"
          };margin-bottom:16px;`,
        )}
      >
        Verificar mi cuenta
      </button>

      <div style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;")}>
        <span style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>¿No te llegó?</span>
        <span
          className="ah-link"
          onClick={reenviando ? undefined : reenviar}
          style={s(
            `font:700 13.5px Manrope,sans-serif;color:${reenviando ? "#9AAABA" : "#FF6A2B"};cursor:${
              reenviando ? "default" : "pointer"
            };`,
          )}
        >
          {reenviando ? "Enviando…" : "Reenviar código"}
        </span>
      </div>

      <div style={s("height:1px;background:#EEF2F6;margin:20px 0 16px;")} />
      <p style={s("font-size:12.5px;line-height:1.6;color:#90A1B2;margin:0 0 14px;")}>
        {/* Es la regla del sistema y conviene que el usuario la sepa: hasta que confirme, su
            correo sigue disponible para otra persona. */}
        Hasta que confirmes, ese correo sigue disponible para que otra persona se registre con él.
        Una vez confirmado, queda reservado para tu cuenta.
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

      <CargandoAccion activo={verificando} mensaje="Verificando tu código" />
      <CargandoAccion activo={reenviando} mensaje="Enviando un código nuevo" />
    </Pantalla>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ah-screen"
      style={s("min-height:100vh;background:#F4F7FA;display:flex;flex-direction:column;align-items:center;padding:34px 20px;")}
    >
      <div style={s("margin-bottom:26px;")}>
        <Logo />
      </div>
      <div
        style={s(
          "width:100%;max-width:440px;background:#fff;border:1px solid #E7EDF3;border-radius:20px;padding:30px 30px 26px;box-shadow:0 14px 34px rgba(14,42,71,.08);",
        )}
      >
        {children}
      </div>
    </div>
  );
}
