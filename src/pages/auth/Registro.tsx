import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { ApiError, passwordStrength, useAuth } from "../../context/AuthContext";
import { INTERESES } from "../../lib/mockData";
import type { RolNombre } from "../../lib/types";

type Rol = "ALUMNO" | "INSTRUCTOR";

interface FormState {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  fechaNacimiento: string;
  especialidad: string;
  aniosExperiencia: string;
  descripcion: string;
  aceptaTerminos: boolean;
}

const EMPTY: FormState = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  password: "",
  fechaNacimiento: "",
  especialidad: "",
  aniosExperiencia: "",
  descripcion: "",
  aceptaTerminos: false,
};

const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toIsoDob(ddmmaaaa: string): string | undefined {
  const m = DOB_RE.exec(ddmmaaaa);
  if (!m) return undefined;
  const [d, mo, y] = ddmmaaaa.split("/");
  return `${y}-${mo}-${d}`;
}

const HOME_BY_ROL: Record<RolNombre, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

export default function Registro() {
  const navigate = useNavigate();
  const { registerAlumno, registerInstructor } = useAuth();

  const [rol, setRol] = useState<Rol>("ALUMNO");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [intereses, setIntereses] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const strength = useMemo(() => (form.password ? passwordStrength(form.password) : null), [form.password]);

  const toggleInteres = (name: string) =>
    setIntereses((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Este campo es obligatorio.";
    if (!form.apellido.trim()) e.apellido = "Este campo es obligatorio.";
    if (!form.email.trim()) e.email = "Este campo es obligatorio.";
    else if (!EMAIL_RE.test(form.email)) e.email = "Ingresá un correo electrónico válido.";
    if (!form.telefono.trim()) e.telefono = "Este campo es obligatorio.";
    if (!form.password || !passwordStrength(form.password).ok) e.password = "La contraseña necesita al menos 8 caracteres, una letra y un número.";
    if (rol === "ALUMNO") {
      if (!form.fechaNacimiento.trim()) e.fechaNacimiento = "Este campo es obligatorio.";
      else if (!DOB_RE.test(form.fechaNacimiento)) e.fechaNacimiento = "Usá el formato dd/mm/aaaa.";
    } else if (form.fechaNacimiento.trim() && !DOB_RE.test(form.fechaNacimiento)) {
      e.fechaNacimiento = "Usá el formato dd/mm/aaaa.";
    }
    if (rol === "INSTRUCTOR" && !form.especialidad.trim()) e.especialidad = "Este campo es obligatorio.";
    if (!form.aceptaTerminos) e.aceptaTerminos = "Tenés que aceptar los términos para crear tu cuenta.";
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitAttempted(true);
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    try {
      if (rol === "ALUMNO") {
        const user = registerAlumno({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono,
          password: form.password,
          fechaNacimiento: toIsoDob(form.fechaNacimiento) ?? form.fechaNacimiento,
          intereses,
        });
        navigate(HOME_BY_ROL[user.rol]);
      } else {
        const user = registerInstructor({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono,
          password: form.password,
          fechaNacimiento: toIsoDob(form.fechaNacimiento),
          especialidad: form.especialidad,
          aniosExperiencia: form.aniosExperiencia ? Number(form.aniosExperiencia) : undefined,
          descripcion: form.descripcion || undefined,
        });
        navigate(HOME_BY_ROL[user.rol]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setErrors({ email: "No pudimos crear la cuenta. Intentá de nuevo." });
    }
  };

  const errorCount = Object.keys(errors).length;
  const showErrors = submitAttempted && errorCount > 0;

  const inputStyle = (field: string) =>
    s(
      `width:100%;border:1px solid ${errors[field] ? "#E5484D" : "#D9E1EA"};background:${errors[field] ? "#FBEAEB" : "#fff"};border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;`,
    );

  const fieldError = (field: string) =>
    errors[field] ? <div style={s("font-size:12px;color:#E5484D;font-weight:600;margin-top:6px;")}>{errors[field]}</div> : null;

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <header style={s("background:#fff;border-bottom:1px solid #E7EDF3;")}>
        <div style={s("max-width:760px;margin:0 auto;padding:16px 28px;display:flex;align-items:center;gap:11px;")}>
          <div style={s("display:flex;align-items:center;gap:11px;cursor:pointer;")} onClick={() => navigate("/")}>
            <div
              style={s(
                "width:36px;height:36px;border-radius:10px;background:linear-gradient(140deg,#0E2A47,#12B5A5);display:flex;align-items:center;justify-content:center;font:700 19px Space Grotesk;color:#fff;",
              )}
            >
              A
            </div>
            <span style={s("font:700 20px Space Grotesk;")}>
              Active<span style={s("color:#FF6A2B;")}>Hub</span>
            </span>
          </div>
          <div style={s("margin-left:auto;font-size:14.5px;color:#65788C;font-weight:600;")}>
            ¿Ya tenés cuenta?{" "}
            <span className="ah-link" onClick={() => navigate("/login")} style={s("color:#FF6A2B;font-weight:700;cursor:pointer;")}>
              Iniciar sesión
            </span>
          </div>
        </div>
      </header>

      <form style={s("max-width:760px;margin:0 auto;padding:40px 28px 70px;")} onSubmit={submit}>
        <h1 style={s("font:700 32px Space Grotesk;letter-spacing:-.8px;margin:0 0 8px;")}>Crear tu cuenta</h1>
        <p style={s("color:#65788C;font-size:15.5px;margin:0 0 28px;")}>
          Elegí cómo querés usar ActiveHub. Podés cambiar tus datos más tarde.
        </p>

        <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:30px;")}>
          <div
            onClick={() => setRol("ALUMNO")}
            className="ah-btn"
            style={s(
              `cursor:pointer;background:#fff;border:2px solid ${rol === "ALUMNO" ? "#2D5BC8" : "#E7EDF3"};border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);`,
            )}
          >
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div style={s("width:46px;height:46px;border-radius:12px;background:#EEF4FB;display:flex;align-items:center;justify-content:center;")}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
                </svg>
              </div>
              <span
                style={s(
                  `width:22px;height:22px;border-radius:99px;border:2px solid #2D5BC8;display:flex;align-items:center;justify-content:center;background:${rol === "ALUMNO" ? "#2D5BC8" : "#fff"};`,
                )}
              >
                {rol === "ALUMNO" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
            </div>
            <div style={s("font:700 18px Manrope;margin-bottom:5px;")}>Soy Alumno</div>
            <div style={s("font-size:13.5px;color:#65788C;line-height:1.5;")}>Quiero buscar, reservar e inscribirme a actividades.</div>
          </div>
          <div
            onClick={() => setRol("INSTRUCTOR")}
            className="ah-btn"
            style={s(
              `cursor:pointer;background:#fff;border:2px solid ${rol === "INSTRUCTOR" ? "#0C8576" : "#E7EDF3"};border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);`,
            )}
          >
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div style={s("width:46px;height:46px;border-radius:12px;background:#E7F8F5;display:flex;align-items:center;justify-content:center;")}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2}>
                  <path d="M6 9 12 3l6 6" />
                  <path d="M12 3v12" />
                  <path d="M4 21h16" />
                  <path d="M4 21v-5M20 21v-5" />
                </svg>
              </div>
              <span
                style={s(
                  `width:22px;height:22px;border-radius:99px;border:2px solid #0C8576;display:flex;align-items:center;justify-content:center;background:${rol === "INSTRUCTOR" ? "#0C8576" : "#fff"};`,
                )}
              >
                {rol === "INSTRUCTOR" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
            </div>
            <div style={s("font:700 18px Manrope;margin-bottom:5px;")}>Soy Instructor</div>
            <div style={s("font-size:13.5px;color:#65788C;line-height:1.5;")}>Quiero publicar y gestionar mis actividades y clases.</div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:20px;padding:28px 30px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 17px Space Grotesk;margin-bottom:4px;")}>Datos personales</div>
          <div style={s("font-size:13.5px;color:#8194A8;margin-bottom:22px;")}>
            Los campos marcados con <span style={s("color:#E5484D;")}>*</span> son obligatorios
          </div>

          {showErrors && (
            <div
              style={s(
                "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 16px;margin-bottom:20px;",
              )}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2} style={{ flex: "none" }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>
                Revisá los campos marcados. Hay {errorCount} error{errorCount === 1 ? "" : "es"} que corregir antes de continuar.
              </span>
            </div>
          )}

          <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;")}>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Nombre <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Martina" style={inputStyle("nombre")} />
              {fieldError("nombre")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Apellido <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input value={form.apellido} onChange={(e) => set("apellido", e.target.value)} placeholder="González" style={inputStyle("apellido")} />
              {fieldError("apellido")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Correo electrónico <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="vos@email.com"
                style={inputStyle("email")}
              />
              {fieldError("email")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Teléfono <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="+54 261 ..." style={inputStyle("telefono")} />
              {fieldError("telefono")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Contraseña <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                style={inputStyle("password")}
              />
              {strength && !errors.password && (
                <div style={s(`font-size:12px;margin-top:6px;font-weight:600;color:${strength.color};`)}>{strength.label}</div>
              )}
              {fieldError("password")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                {rol === "ALUMNO" ? (
                  <>
                    Fecha de nacimiento <span style={s("color:#E5484D;")}>*</span>
                  </>
                ) : (
                  "Fecha de nacimiento (opcional)"
                )}
              </label>
              <input
                type="text"
                value={form.fechaNacimiento}
                onChange={(e) => set("fechaNacimiento", e.target.value)}
                placeholder="dd/mm/aaaa"
                style={inputStyle("fechaNacimiento")}
              />
              {fieldError("fechaNacimiento")}
            </div>
          </div>

          {rol === "ALUMNO" && (
            <div style={s("margin-top:22px;")}>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:4px;")}>Intereses deportivos</label>
              <div style={s("font-size:12.5px;color:#8194A8;margin-bottom:12px;")}>
                Elegí los que más te gusten para recibir mejores sugerencias.
              </div>
              <div style={s("display:flex;flex-wrap:wrap;gap:9px;")}>
                {INTERESES.map((name) => {
                  const on = intereses.includes(name);
                  return (
                    <span
                      key={name}
                      onClick={() => toggleInteres(name)}
                      className="ah-btn"
                      style={s(
                        `cursor:pointer;padding:8px 15px;border-radius:999px;font:700 13.5px Manrope;border:1.5px solid ${on ? "#12B5A5" : "#E2E9F0"};background:${on ? "#E7F8F5" : "#fff"};color:${on ? "#0C8576" : "#65788C"};`,
                      )}
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {rol === "INSTRUCTOR" && (
            <div style={s("margin-top:22px;display:grid;gap:16px;")}>
              <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;")}>
                <div>
                  <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                    Especialidad <span style={s("color:#E5484D;")}>*</span>
                  </label>
                  <input
                    value={form.especialidad}
                    onChange={(e) => set("especialidad", e.target.value)}
                    placeholder="Running, Gimnasia, Defensa Personal…"
                    style={inputStyle("especialidad")}
                  />
                  {fieldError("especialidad")}
                </div>
                <div>
                  <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Años de experiencia</label>
                  <input
                    value={form.aniosExperiencia}
                    onChange={(e) => set("aniosExperiencia", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Ej: 5"
                    style={inputStyle("aniosExperiencia")}
                  />
                </div>
              </div>
              <div>
                <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Descripción breve</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => set("descripcion", e.target.value)}
                  placeholder="Contanos sobre vos y tu forma de dar clases…"
                  style={s(
                    "width:100%;min-height:84px;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
                  )}
                />
              </div>
              <div>
                <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Documentación / certificaciones</label>
                <div style={s("border:2px dashed #C9D5E1;border-radius:13px;padding:24px;text-align:center;background:#FAFCFE;")}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2} style={s("margin:0 auto 8px;")}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M17 8l-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                  <div style={s("font-weight:700;font-size:14px;color:#41566B;")}>
                    Arrastrá tus archivos o <span style={s("color:#FF6A2B;")}>buscá en tu equipo</span>
                  </div>
                  <div style={s("font-size:12px;color:#8194A8;margin-top:4px;")}>PDF, JPG o PNG · hasta 5 MB</div>
                </div>
              </div>
            </div>
          )}

          <div style={s("margin-top:24px;display:flex;align-items:center;gap:10px;")}>
            <span
              onClick={() => set("aceptaTerminos", !form.aceptaTerminos)}
              style={s(
                `width:20px;height:20px;border-radius:6px;background:${form.aceptaTerminos ? "#12B5A5" : "#fff"};border:1.5px solid ${form.aceptaTerminos ? "#12B5A5" : errors.aceptaTerminos ? "#E5484D" : "#D9E1EA"};display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;`,
              )}
            >
              {form.aceptaTerminos && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span style={s("font-size:13.5px;color:#65788C;font-weight:600;")}>
              Acepto los <span style={s("color:#12B5A5;")}>términos y condiciones</span> y la política de privacidad.
            </span>
          </div>
          {errors.aceptaTerminos && (
            <div style={s("display:flex;align-items:center;gap:6px;margin-top:8px;")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span style={s("font-size:12.5px;color:#E5484D;font-weight:600;")}>{errors.aceptaTerminos}</span>
            </div>
          )}

          <button
            className="ah-btn"
            type="submit"
            style={s(
              "margin-top:22px;width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.3);",
            )}
          >
            Crear cuenta
          </button>
        </div>
      </form>
    </div>
  );
}
