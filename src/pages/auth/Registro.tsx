import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { ApiError, passwordStrength, useAuth } from "../../context/AuthContext";
import type { IdentidadGoogle } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import BotonGoogle from "../../components/BotonGoogle";
import { perfilIncompleto } from "../../lib/perfil";
import { homeDe } from "../../lib/areas";

type Rol = "ALUMNO" | "INSTRUCTOR";

interface FormState {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  password: string;
  fechaNacimiento: string;
  condicionSalud: string;
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
  dni: "",
  password: "",
  fechaNacimiento: "",
  condicionSalud: "",
  especialidad: "",
  aniosExperiencia: "",
  descripcion: "",
  aceptaTerminos: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOY_ISO = new Date().toISOString().slice(0, 10);
const TIPOS_DOCUMENTO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const TAMANIO_MAX_DOCUMENTO = 5 * 1024 * 1024;


function formatTamanio(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function Registro() {
  const navigate = useNavigate();
  const data = useData();
  const { registerAlumno, registerInstructor, ingresarConGoogle } = useAuth();

  const [rol, setRol] = useState<Rol>("ALUMNO");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [intereses, setIntereses] = useState<string[]>([]);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [archivosError, setArchivosError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  /**
   * Identidad confirmada por Google cuando el alta de INSTRUCTOR arrancó con ese botón. Su
   * presencia cambia tres cosas: el correo pasa a ser de sólo lectura (lo fija Google, y el
   * backend rechaza cualquier otro), la contraseña deja de pedirse, y el `idToken` viaja con
   * el alta para que el backend lo vuelva a verificar.
   */
  const [identidadGoogle, setIdentidadGoogle] = useState<IdentidadGoogle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const strength = useMemo(() => (form.password ? passwordStrength(form.password) : null), [form.password]);

  const agregarArchivos = (lista: FileList | null) => {
    if (!lista) return;
    setArchivosError(null);
    const validos: File[] = [];
    for (const archivo of Array.from(lista)) {
      if (!TIPOS_DOCUMENTO_PERMITIDOS.includes(archivo.type)) {
        setArchivosError(`"${archivo.name}" no es un PDF, JPG o PNG.`);
        continue;
      }
      if (archivo.size > TAMANIO_MAX_DOCUMENTO) {
        setArchivosError(`"${archivo.name}" supera los 5 MB.`);
        continue;
      }
      validos.push(archivo);
    }
    if (validos.length) setArchivos((prev) => [...prev, ...validos]);
  };

  const onSeleccionarArchivos = (e: ChangeEvent<HTMLInputElement>) => {
    agregarArchivos(e.target.files);
    e.target.value = "";
  };

  const onSoltarArchivos = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    agregarArchivos(e.dataTransfer.files);
  };

  const quitarArchivo = (nombre: string) => setArchivos((prev) => prev.filter((a) => a.name !== nombre));

  const toggleInteres = (name: string) =>
    setIntereses((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Este campo es obligatorio.";
    if (!form.apellido.trim()) e.apellido = "Este campo es obligatorio.";
    if (!form.email.trim()) e.email = "Este campo es obligatorio.";
    else if (!EMAIL_RE.test(form.email)) e.email = "Ingresá un correo electrónico válido.";
    if (!form.telefono.trim()) e.telefono = "Este campo es obligatorio.";
    // Opcional, pero si se carga tiene que ser un DNI válido: es la credencial
    // alternativa de login y clave de unicidad de la cuenta junto al correo.
    if (form.dni.trim() && !/^[0-9]{7,8}$/.test(form.dni.trim())) e.dni = "El DNI debe tener 7 u 8 dígitos.";
    // Con Google no hay contraseña que validar: la cuenta no va a tener una utilizable.
    if (!identidadGoogle) {
      if (!form.password || !passwordStrength(form.password).ok)
        e.password = "La contraseña necesita al menos 8 caracteres, una mayúscula y un número.";
      if (!confirmPassword) e.confirmPassword = "Confirmá tu contraseña.";
      else if (form.password !== confirmPassword) e.confirmPassword = "Las contraseñas no coinciden.";
    }
    if (rol === "ALUMNO" && !form.fechaNacimiento) {
      e.fechaNacimiento = "Este campo es obligatorio.";
    }
    if (rol === "INSTRUCTOR" && !form.especialidad.trim()) e.especialidad = "Este campo es obligatorio.";
    // La documentación es obligatoria: sin ella el backend no crea la cuenta, así que
    // conviene avisarlo acá antes de mandar el request.
    if (rol === "INSTRUCTOR" && archivos.length === 0) {
      e.documentos = "Adjuntá al menos un documento de certificación para crear tu cuenta.";
    }
    if (!form.aceptaTerminos) e.aceptaTerminos = "Tenés que aceptar los términos para crear tu cuenta.";
    return e;
  };

  /**
   * "Continuar con Google". Nunca pasa por el código: Google ya verificó el correo.
   *
   * <p>Dos desenlaces, y los decide el **rol elegido** — por eso el botón vive después del
   * selector y no antes:
   *
   * <ul>
   *   <li><b>Alumno</b>: el backend crea la cuenta y entra.</li>
   *   <li><b>Instructor</b>: no se crea nada. El alta de instructor exige documentación
   *       (RN-12), así que vuelve sólo la identidad y se usa para precargar el formulario.
   *       La cuenta se crea al enviarlo, con los archivos.</li>
   * </ul>
   */
  const registrarConGoogle = async (idToken: string) => {
    setErrors({});
    try {
      const respuesta = await ingresarConGoogle(idToken, rol);
      if (respuesta.modo === "COMPLETAR_INSTRUCTOR" && respuesta.identidad) {
        const { email, nombre, apellido } = respuesta.identidad;
        setIdentidadGoogle(respuesta.identidad);
        setForm((f) => ({ ...f, email, nombre: nombre || f.nombre, apellido: apellido || f.apellido }));
        return;
      }
      // Google no da teléfono ni fecha de nacimiento: la cuenta recién creada está a medias.
      // A terminar el registro, no al panel. El guardián de rutas hace lo mismo, pero navegar
      // directo evita el parpadeo de entrar y salir de la home.
      if (perfilIncompleto(respuesta.sesion ?? null)) {
        navigate("/completar-registro", { replace: true });
        return;
      }
      navigate(homeDe(respuesta.sesion?.permisos ?? []));
    } catch (err) {
      setErrors({ email: err instanceof ApiError ? err.message : "No pudimos crear tu cuenta con Google." });
      setSubmitAttempted(true);
    }
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitAttempted(true);
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    try {
      if (rol === "ALUMNO") {
        await registerAlumno({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono,
          dni: form.dni.trim() || undefined,
          password: form.password,
          fechaNacimiento: form.fechaNacimiento,
          intereses,
          condicionSalud: form.condicionSalud.trim() || undefined,
          aceptaTerminos: form.aceptaTerminos,
        });
        // Al codigo, no al panel: la cuenta existe pero su correo todavia no esta confirmado
        // y hasta que lo confirme sigue disponible para otra persona.
        navigate("/verificar-email", { replace: true });
      } else {
        // Los archivos van en el mismo request que los datos: si la subida falla, el
        // backend hace rollback y NO queda ninguna cuenta creada (E1A-HU04 criterio 9).
        setSubiendo(true);
        try {
          await registerInstructor(
            {
              nombre: form.nombre,
              apellido: form.apellido,
              email: form.email,
              telefono: form.telefono,
              dni: form.dni.trim() || undefined,
              password: form.password,
              fechaNacimiento: form.fechaNacimiento || undefined,
              especialidad: form.especialidad,
              aniosExperiencia: form.aniosExperiencia ? Number(form.aniosExperiencia) : undefined,
              descripcion: form.descripcion || undefined,
              aceptaTerminos: form.aceptaTerminos,
              // El backend lo vuelve a verificar; acá sólo se reenvía.
              googleIdToken: identidadGoogle?.idToken,
            },
            archivos,
          );
          navigate("/verificar-email", { replace: true });
        } finally {
          setSubiendo(false);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else if (err instanceof ApiError) setErrors({ email: err.message });
      else setErrors({ email: "No pudimos crear la cuenta. Intentá de nuevo." });
    }
  };

  const errorCount = Object.keys(errors).length;
  const showErrors = submitAttempted && errorCount > 0;

  /** El CSS como texto, para poder concatenarle overrides (ej. el correo fijado por Google). */
  const inputStyleRaw = (field: string) =>
    `width:100%;border:1px solid ${errors[field] ? "#E5484D" : "#D9E1EA"};background:${errors[field] ? "#FBEAEB" : "#fff"};border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;`;

  const inputStyle = (field: string) => s(inputStyleRaw(field));

  const passwordInputStyle = (field: string) =>
    s(
      `width:100%;border:1px solid ${errors[field] ? "#E5484D" : "#D9E1EA"};background:${errors[field] ? "#FBEAEB" : "#fff"};border-radius:11px;padding:12px 44px 12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;`,
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
        <p style={s("color:#65788C;font-size:15.5px;margin:0 0 22px;")}>
          Elegí cómo querés usar ActiveHub. Podés cambiar tus datos más tarde.
        </p>

        <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;")}>
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
            <div style={s("font-size:13.5px;color:#65788C;line-height:1.5;")}>Quiero buscar actividades e inscribirme a sus clases.</div>
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

        {/*
          Google va DESPUÉS de elegir el rol, no antes: qué hace el botón depende de qué
          eligió la persona. Como alumno crea la cuenta y entra (Google ya verificó el correo,
          así que se saltea el código); como instructor **no crea nada** — el alta exige
          documentación (RN-12) — y precarga este formulario con la identidad confirmada.
        */}
        {!identidadGoogle && (
          <div style={s("max-width:392px;margin-bottom:26px;")}>
            <div style={s("margin-bottom:10px;")}>
              <BotonGoogle texto="signup_with" onCredencial={registrarConGoogle} />
            </div>
            <div style={s("display:flex;align-items:center;gap:14px;color:#9AAABA;font-size:13px;font-weight:600;")}>
              <div style={s("flex:1;height:1px;background:#E1E8EF;")} />o completá el formulario
              <div style={s("flex:1;height:1px;background:#E1E8EF;")} />
            </div>
          </div>
        )}

        {identidadGoogle && (
          <div
            style={s(
              "max-width:640px;display:flex;align-items:flex-start;gap:11px;background:#E7F8F5;border:1px solid #CBEDE7;border-radius:14px;padding:14px 16px;margin-bottom:26px;",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4} style={s("flex:none;margin-top:2px;")}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <div style={s("font-size:13.5px;line-height:1.55;color:#0C8576;font-weight:600;")}>
              Vas a registrarte con <strong>{identidadGoogle.email}</strong>, verificado por Google — no vas a
              necesitar contraseña ni código. Completá el resto de tus datos y adjuntá tu documentación.
            </div>
          </div>
        )}

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
              {/* Con Google el correo lo fija Google: el backend rechaza cualquier otro. */}
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="vos@email.com"
                readOnly={!!identidadGoogle}
                style={s(
                  (inputStyleRaw("email")) + (identidadGoogle ? "background:#F2F5F9;color:#65788C;" : ""),
                )}
              />
              {identidadGoogle ? (
                <span style={s("display:block;font-size:12px;color:#0C8576;font-weight:600;margin-top:5px;")}>
                  Verificado por Google
                </span>
              ) : (
                fieldError("email")
              )}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Teléfono <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="+54 261 ..." style={inputStyle("telefono")} />
              {fieldError("telefono")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>DNI</label>
              <input
                value={form.dni}
                onChange={(e) => set("dni", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="30123456"
                maxLength={8}
                inputMode="numeric"
                style={inputStyle("dni")}
              />
              {fieldError("dni") ?? (
                <span style={s("display:block;font-size:12px;color:#90A1B2;font-weight:600;margin-top:5px;")}>
                  Opcional. Si lo cargás, también vas a poder iniciar sesión con él.
                </span>
              )}
            </div>
            {/* Sin contraseña cuando entra por Google: la cuenta no va a tener una utilizable. */}
            {!identidadGoogle && (
              <>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Contraseña <span style={s("color:#E5484D;")}>*</span>
              </label>
              <div style={s("position:relative;")}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  style={passwordInputStyle("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={s(
                    "position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:6px;display:flex;",
                  )}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8194A8" strokeWidth={2}>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8194A8" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {strength && !errors.password && (
                <div style={s(`font-size:12px;margin-top:6px;font-weight:600;color:${strength.color};`)}>{strength.label}</div>
              )}
              {fieldError("password")}
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Confirmar contraseña <span style={s("color:#E5484D;")}>*</span>
              </label>
              <div style={s("position:relative;")}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={passwordInputStyle("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={s(
                    "position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:6px;display:flex;",
                  )}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8194A8" strokeWidth={2}>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8194A8" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldError("confirmPassword")}
            </div>
              </>
            )}
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
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => set("fechaNacimiento", e.target.value)}
                max={HOY_ISO}
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
                {/* Los intereses son tipos de actividad reales (V19): se eligen por id y
                    cada chip muestra a qué categoría pertenece. */}
                {data.tiposActividad.map((tipo) => {
                  const on = intereses.includes(tipo.id);
                  const categoria = data.getCategoria(tipo.categoriaId);
                  return (
                    <span
                      key={tipo.id}
                      onClick={() => toggleInteres(tipo.id)}
                      className="ah-btn"
                      title={categoria?.nombre}
                      style={s(
                        `cursor:pointer;padding:8px 15px;border-radius:999px;font:700 13.5px Manrope;border:1.5px solid ${on ? "#12B5A5" : "#E2E9F0"};background:${on ? "#E7F8F5" : "#fff"};color:${on ? "#0C8576" : "#65788C"};display:flex;align-items:center;gap:6px;`,
                      )}
                    >
                      {tipo.nombre}
                      <span style={s(`font:600 10.5px Manrope;color:${on ? "#5FA79B" : "#9AAABA"};`)}>
                        · {categoria?.nombre ?? ""}
                      </span>
                    </span>
                  );
                })}
              </div>
              <div style={s("margin-top:18px;")}>
                <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:4px;")}>
                  ¿Padecés alguna enfermedad o lesión?
                </label>
                <div style={s("font-size:12.5px;color:#8194A8;margin-bottom:8px;")}>
                  Opcional. Ayuda al instructor a dar la clase de forma segura para vos.
                </div>
                <textarea
                  value={form.condicionSalud}
                  onChange={(e) => set("condicionSalud", e.target.value)}
                  placeholder="Ej: asma, lesión de rodilla, ninguna…"
                  maxLength={500}
                  style={s(
                    "width:100%;min-height:74px;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
                  )}
                />
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
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onSoltarArchivos}
                  style={s(
                    "cursor:pointer;border:2px dashed #C9D5E1;border-radius:13px;padding:24px;text-align:center;background:#FAFCFE;",
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={onSeleccionarArchivos}
                    style={s("display:none;")}
                  />
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
                {(archivosError || errors.documentos) && (
                  <div style={s("font-size:12px;color:#E5484D;font-weight:600;margin-top:8px;")}>
                    {archivosError ?? errors.documentos}
                  </div>
                )}
                {archivos.length > 0 && (
                  <div style={s("display:flex;flex-direction:column;gap:8px;margin-top:12px;")}>
                    {archivos.map((archivo) => (
                      <div
                        key={archivo.name}
                        style={s(
                          "display:flex;align-items:center;gap:10px;border:1px solid #E7EDF3;border-radius:10px;padding:9px 12px;",
                        )}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2} style={s("flex:none;")}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <div style={s("flex:1;min-width:0;font:700 12.5px Manrope;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>
                          {archivo.name}
                        </div>
                        <span style={s("font-size:11px;color:#90A1B2;font-weight:600;flex:none;")}>{formatTamanio(archivo.size)}</span>
                        <span
                          onClick={() => quitarArchivo(archivo.name)}
                          className="ah-btn"
                          style={s("cursor:pointer;color:#BE3A3E;font-weight:700;font-size:12px;flex:none;")}
                        >
                          Quitar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
            disabled={subiendo}
            style={s(
              `margin-top:22px;width:100%;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope;cursor:${subiendo ? "not-allowed" : "pointer"};box-shadow:0 8px 18px rgba(255,106,43,.3);opacity:${subiendo ? ".7" : "1"};`,
            )}
          >
            {subiendo ? "Subiendo documentos…" : "Crear cuenta"}
          </button>
        </div>
      </form>
    </div>
  );
}
