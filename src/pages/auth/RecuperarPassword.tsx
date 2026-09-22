import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { CargandoAccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { useAuth, passwordStrength } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

/**
 * "¿Olvidaste tu contraseña?" (E1A-PAN-10). Es la única pantalla que cambia una credencial
 * sin sesión, así que todo lo de acá está pensado alrededor de eso.
 *
 * <h2>Tres pasos en una sola pantalla</h2>
 *
 * `correo` pide la dirección, `codigo` recibe el código y la contraseña nueva, `listo`
 * confirma. Son estados de la misma pantalla y no rutas distintas: el código vive en la
 * memoria del backend por minutos, y una ruta propia invitaría a recargarla o compartirla
 * cuando ya no sirve para nada.
 *
 * <h2>La pantalla NO afirma que la cuenta exista</h2>
 *
 * El backend responde igual exista o no el correo (es a propósito: si no, cualquiera podría
 * averiguar quién está registrado probando direcciones), así que el texto de confirmación
 * habla en condicional — "si hay una cuenta con ese correo". Decir "te enviamos un código a
 * X" sería afirmar algo que el cliente no sabe.
 *
 * <h2>Las seis casillas son las mismas de VerificarEmail</h2>
 *
 * Mismo código de 6 dígitos y misma mecánica: pegar el código del mail lo reparte, el foco
 * avanza al tipear y retrocede con Backspace. Lo que cambia es que acá completar el código NO
 * envía solo, porque falta la contraseña nueva.
 */
const LARGO = 6;

type Paso = "correo" | "codigo" | "listo";

export default function RecuperarPassword() {
  const navigate = useNavigate();
  const { solicitarRecuperacionPassword, restablecerPassword } = useAuth();

  const [paso, setPaso] = useState<Paso>("correo");
  const [email, setEmail] = useState("");
  const [digitos, setDigitos] = useState<string[]>(Array(LARGO).fill(""));
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ttlMin, setTtlMin] = useState(15);
  const [envioHabilitado, setEnvioHabilitado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const codigo = digitos.join("");
  const fuerza = passwordStrength(password);

  const pedirCodigo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (enviando) return;
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const resultado = await solicitarRecuperacionPassword(email.trim());
      setTtlMin(resultado.ttlMin);
      setEnvioHabilitado(resultado.envioHabilitado);
      setPaso("codigo");
      setDigitos(Array(LARGO).fill(""));
      setTimeout(() => inputs.current[0]?.focus(), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar el código. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    await pedirCodigo();
    // `pedirCodigo` deja el paso en "codigo" y limpia las casillas; lo único que agrega el
    // reenvío es decir que se pidió otro.
    if (!error) setAviso("Pedimos un código nuevo. Puede tardar un minuto en llegar.");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    setAviso(null);
    if (codigo.length !== LARGO) {
      setError("Ingresá el código de 6 dígitos que te enviamos.");
      return;
    }
    if (!fuerza.ok) {
      setError(fuerza.label);
      return;
    }
    if (password !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      const resultado = await restablecerPassword(email.trim(), codigo, password);
      setEmail(resultado.email);
      setPaso("listo");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cambiar tu contraseña. Intentá de nuevo.");
      // El código se limpia porque el error más probable es justamente que esté mal, y
      // reescribir seis dígitos sobre los viejos es peor que empezar de cero. La contraseña
      // que ya eligió se conserva: no tiene nada que ver con el error.
      setDigitos(Array(LARGO).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setEnviando(false);
    }
  };

  const escribir = (indice: number, valor: string) => {
    const soloDigitos = valor.replace(/\D/g, "");
    if (!soloDigitos) {
      setDigitos((prev) => prev.map((d, i) => (i === indice ? "" : d)));
      return;
    }
    setDigitos((prev) => {
      const next = [...prev];
      for (let i = 0; i < soloDigitos.length && indice + i < LARGO; i++) {
        next[indice + i] = soloDigitos[i];
      }
      inputs.current[Math.min(indice + soloDigitos.length, LARGO - 1)]?.focus();
      return next;
    });
  };

  const teclear = (indice: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digitos[indice] && indice > 0) inputs.current[indice - 1]?.focus();
    if (e.key === "ArrowLeft" && indice > 0) inputs.current[indice - 1]?.focus();
    if (e.key === "ArrowRight" && indice < LARGO - 1) inputs.current[indice + 1]?.focus();
  };

  if (paso === "listo") {
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
            Contraseña actualizada
          </h1>
          <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 0 22px;")}>
            Ya podés iniciar sesión con tu contraseña nueva.
          </p>
          <button
            className="ah-btn"
            onClick={() => navigate("/login")}
            style={s(
              "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:13px 26px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
            )}
          >
            Ir a iniciar sesión
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <h1 style={s("font:700 25px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;letter-spacing:-.5px;")}>
        {paso === "correo" ? "Recuperar contraseña" : "Elegí una contraseña nueva"}
      </h1>
      <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 0 22px;")}>
        {paso === "correo"
          ? "Ingresá el correo de tu cuenta y te enviamos un código de 6 dígitos para elegir una contraseña nueva."
          : `Si hay una cuenta registrada con ${email.trim()}, le enviamos un código de 6 dígitos. Vence en ${ttlMin} minutos.`}
      </p>

      {error && <Cartel tono="error">{error}</Cartel>}
      {aviso && <Cartel tono="aviso">{aviso}</Cartel>}
      {paso === "codigo" && !envioHabilitado && (
        <Cartel tono="aviso">
          Generamos el código, pero el servidor de correo no está configurado. Pedíselo a quien administra la
          plataforma.
        </Cartel>
      )}

      {paso === "correo" ? (
        <form onSubmit={pedirCodigo}>
          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
            Correo electrónico *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@email.com"
            autoComplete="email"
            style={campoStyle}
          />
          <button className="ah-btn" type="submit" style={botonStyle} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviarme el código"}
          </button>
        </form>
      ) : (
        <form onSubmit={guardar}>
          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
            Código de 6 dígitos *
          </label>
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
                  `flex:1;min-width:0;height:54px;text-align:center;font:700 22px Space Grotesk,sans-serif;color:#0E2A47;border:1.5px solid ${
                    error ? "#F3C6C7" : d ? "#12B5A5" : "#D6DEE7"
                  };border-radius:13px;outline:none;background:#fff;`,
                )}
              />
            ))}
          </div>

          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
            Contraseña nueva *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            style={campoStyle}
          />
          {password && (
            <p style={s(`font:700 12.5px Manrope;color:${fuerza.color};margin:-8px 0 14px;`)}>{fuerza.label}</p>
          )}

          <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
            Repetir contraseña nueva *
          </label>
          <input
            type="password"
            required
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            style={campoStyle}
          />

          <button className="ah-btn" type="submit" style={botonStyle} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar contraseña nueva"}
          </button>

          <div style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;")}>
            <span style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>¿No te llegó?</span>
            <span
              className="ah-link"
              onClick={enviando ? undefined : reenviar}
              style={s(
                `font:700 13.5px Manrope,sans-serif;color:${enviando ? "#9AAABA" : "#FF6A2B"};cursor:${
                  enviando ? "default" : "pointer"
                };`,
              )}
            >
              Pedir otro código
            </span>
          </div>
        </form>
      )}

      <div style={s("height:1px;background:#EEF2F6;margin:20px 0 16px;")} />
      <p style={s("font-size:12.5px;line-height:1.6;color:#90A1B2;margin:0 0 14px;")}>
        {/* Es la regla del sistema: una cuenta creada con Google no tiene contraseña propia, así
            que este camino no le devuelve el acceso. La pantalla lo dice acá en vez de dejar
            que la persona espere un mail que nunca va a llegar. */}
        Si creaste tu cuenta con “Continuar con Google”, no tenés contraseña propia: entrá desde el botón de Google
        en la pantalla de inicio de sesión.
      </p>
      <span
        className="ah-link"
        onClick={() => navigate("/login")}
        style={s("font:700 13px Manrope,sans-serif;color:#7A8C9E;cursor:pointer;")}
      >
        Volver a iniciar sesión
      </span>

      <CargandoAccion activo={enviando && paso === "correo"} mensaje="Enviando tu código" />
      <CargandoAccion activo={enviando && paso === "codigo"} mensaje="Guardando tu contraseña" />
    </Pantalla>
  );
}

const campoStyle = s(
  "width:100%;box-sizing:border-box;background:#F7FAFC;border:1.5px solid #E1E8EF;border-radius:12px;padding:13px 14px;font:600 15px Manrope;color:#0E2A47;outline:none;margin-bottom:16px;",
);

const botonStyle = s(
  "width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px;font:700 15px Manrope,sans-serif;cursor:pointer;margin-bottom:16px;",
);

function Cartel({ tono, children }: { tono: "error" | "aviso"; children: React.ReactNode }) {
  const estilo =
    tono === "error"
      ? "background:#FBEAEB;border:1px solid #F3D2D3;color:#BE3A3E;"
      : "background:#E7F8F5;border:1px solid #CBEDE7;color:#0C8576;";
  return (
    <div
      style={s(`${estilo}border-radius:12px;padding:12px 14px;margin-bottom:16px;font:600 13px Manrope,sans-serif;line-height:1.5;`)}
      role={tono === "error" ? "alert" : "status"}
    >
      {children}
    </div>
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
