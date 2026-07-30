import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { categorias, getTipoActividad } from "../../lib/mockData";
import type { NivelIntensidad } from "../../lib/types";

const NIVELES: NivelIntensidad[] = ["Física baja", "Física media", "Física alta"];

const DEFAULT_TINTS = [
  "linear-gradient(135deg,#1B3A5C,#12B5A5)",
  "linear-gradient(135deg,#22543D,#12B5A5)",
  "linear-gradient(135deg,#173250,#0FB8A9)",
  "linear-gradient(135deg,#0E2A47,#7A52D9)",
  "linear-gradient(135deg,#1B3A5C,#FF8A4C)",
];

const STEPS = ["Información general", "Ubicación", "Imágenes", "Revisar"];

export default function InstructorCrearActividad() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const existing = isEdit ? data.actividades.find((a) => a.id === id) : undefined;

  useEffect(() => {
    if (isEdit && !existing) {
      navigate("/instructor/actividades", { replace: true });
      return;
    }
    if (existing && currentUser && existing.instructorId !== currentUser.id) {
      navigate("/instructor/actividades", { replace: true });
    }
  }, [isEdit, existing, currentUser, navigate]);

  const [nombre, setNombre] = useState(existing?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? "");
  const [duracionMin, setDuracionMin] = useState("50");
  const [precioRaw, setPrecioRaw] = useState(existing ? String(existing.precio) : "");
  const [ubicacion, setUbicacion] = useState(existing?.ubicacion ?? "");
  const [categoriaId, setCategoriaId] = useState(() => {
    const tipo = existing ? getTipoActividad(existing.tipoActividadId) : undefined;
    return tipo?.categoriaId ?? categorias[0]?.id ?? "";
  });
  const [tipoActividadId, setTipoActividadId] = useState(existing?.tipoActividadId ?? "");
  const [nivel, setNivel] = useState<NivelIntensidad>(existing?.nivelIntensidad ?? "Física media");
  const [photoTint] = useState(
    () => existing?.photoTint ?? DEFAULT_TINTS[Math.floor(Math.random() * DEFAULT_TINTS.length)],
  );
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [savedMsg, setSavedMsg] = useState("");

  const tiposFiltrados = data.tiposActividad.filter((t) => t.categoriaId === categoriaId);

  useEffect(() => {
    if (!tiposFiltrados.some((t) => t.id === tipoActividadId)) {
      setTipoActividadId(tiposFiltrados[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaId, data.tiposActividad]);

  const targetId = existing?.id ?? draftId;

  const handlePrecioChange = (raw: string) => {
    setPrecioRaw(raw.replace(/[^\d]/g, ""));
  };

  const handleSave = (navigateAfter: boolean) => {
    if (!currentUser || !nombre.trim() || !tipoActividadId) return;
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      tipoActividadId,
      nivelIntensidad: nivel,
      instructorId: currentUser.id,
      precio: Number(precioRaw) || 0,
      ubicacion: ubicacion.trim() || "Ubicación a confirmar",
      photoTint,
      rating: existing?.rating ?? 0,
      cuposMax: existing?.cuposMax ?? 20,
    };
    if (targetId) {
      data.actualizarActividad(targetId, payload);
      if (navigateAfter) {
        navigate(`/instructor/actividades/${targetId}`);
        return;
      }
    } else {
      const nueva = data.crearActividad(payload);
      setDraftId(nueva.id);
      if (navigateAfter) {
        navigate(`/instructor/actividades/${nueva.id}`);
        return;
      }
    }
    setSavedMsg("Borrador guardado.");
    window.setTimeout(() => setSavedMsg(""), 2500);
  };

  if (!currentUser || !aprobado) return null;
  if (isEdit && !existing) return null;

  return (
    <DashLayout role="instructor" active="misactividades">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <span
          className="ah-link"
          onClick={() => navigate("/instructor/actividades")}
          style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope;color:#41566B;cursor:pointer;")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Mis actividades
        </span>
      </div>
      <div style={s("max-width:780px;margin:0 auto;padding:28px 32px 60px;")}>
        <h1 style={s("font:700 26px Space Grotesk;letter-spacing:-.6px;margin:0 0 6px;")}>
          {isEdit ? "Editar actividad" : "Crear nueva actividad"}
        </h1>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 24px;")}>
          Completá los datos para publicar tu clase. Podés guardarla como borrador.
        </p>

        <div style={s("display:flex;align-items:center;gap:6px;margin-bottom:28px;")}>
          {STEPS.map((label, i) => (
            <div key={label} style={s("display:flex;align-items:center;gap:9px;")}>
              <span
                style={s(
                  `width:28px;height:28px;border-radius:99px;background:${i === 0 ? "#12B5A5" : "#E2E9F0"};color:${
                    i === 0 ? "#fff" : "#90A1B2"
                  };display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk;`,
                )}
              >
                {i + 1}
              </span>
              <span style={s(`font:700 13px Manrope;color:${i === 0 ? "#0E2A47" : "#90A1B2"};`)}>{label}</span>
              {i < STEPS.length - 1 && <div style={s("flex:1;height:2px;background:#E2E9F0;width:24px;")} />}
            </div>
          ))}
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:26px 28px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 16px Space Grotesk;margin-bottom:18px;")}>Información general</div>

          <div style={s("margin-bottom:18px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
              Nombre de la actividad <span style={s("color:#E5484D;")}>*</span>
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={s(
                "width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;",
              )}
            />
          </div>

          <div style={s("margin-bottom:18px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>
              Categoría <span style={s("color:#E5484D;")}>*</span>
            </label>
            <div style={s("display:flex;flex-wrap:wrap;gap:8px;")}>
              {categorias.map((c) => {
                const on = c.id === categoriaId;
                return (
                  <span
                    key={c.id}
                    className="ah-btn"
                    onClick={() => setCategoriaId(c.id)}
                    style={s(
                      `cursor:pointer;padding:9px 15px;border-radius:10px;font:700 13.5px Manrope;background:${
                        on ? "#E7F8F5" : "#fff"
                      };border:1.5px solid ${on ? "#12B5A5" : "#D9E1EA"};color:${on ? "#0C8576" : "#41566B"};`,
                    )}
                  >
                    {c.nombre}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={s("margin-bottom:18px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>
              Tipo de actividad <span style={s("color:#E5484D;")}>*</span>
            </label>
            <div style={s("display:flex;flex-wrap:wrap;gap:8px;")}>
              {tiposFiltrados.map((t) => {
                const on = t.id === tipoActividadId;
                return (
                  <span
                    key={t.id}
                    className="ah-btn"
                    onClick={() => setTipoActividadId(t.id)}
                    style={s(
                      `cursor:pointer;padding:9px 15px;border-radius:10px;font:700 13.5px Manrope;background:${
                        on ? "#EAF1FE" : "#fff"
                      };border:1.5px solid ${on ? "#3A6FF0" : "#D9E1EA"};color:${on ? "#2D5BC8" : "#41566B"};`,
                    )}
                  >
                    {t.nombre}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={s("margin-bottom:18px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
              Descripción <span style={s("color:#E5484D;")}>*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              style={s(
                "width:100%;min-height:90px;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;resize:vertical;font-family:Manrope;",
              )}
            />
          </div>

          <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;")}>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>Duración (min)</label>
              <input
                value={duracionMin}
                onChange={(e) => setDuracionMin(e.target.value.replace(/[^\d]/g, ""))}
                style={s(
                  "width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;",
                )}
              />
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:7px;")}>
                Precio por clase <span style={s("color:#E5484D;")}>*</span>
              </label>
              <input
                value={precioRaw ? `$${Number(precioRaw).toLocaleString("es-AR")}` : ""}
                onChange={(e) => handlePrecioChange(e.target.value)}
                placeholder="$0"
                style={s(
                  "width:100%;border:1px solid #D9E1EA;border-radius:11px;padding:12px 14px;font:600 14.5px Manrope;color:#0E2A47;outline:none;",
                )}
              />
            </div>
            <div>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>Nivel de exigencia</label>
              <div style={s("display:flex;flex-wrap:wrap;gap:7px;")}>
                {NIVELES.map((n) => {
                  const on = n === nivel;
                  return (
                    <span
                      key={n}
                      className="ah-btn"
                      onClick={() => setNivel(n)}
                      style={s(
                        `cursor:pointer;padding:8px 12px;border-radius:9px;font:700 12.5px Manrope;background:${
                          on ? "#FBEAEB" : "#fff"
                        };border:1.5px solid ${on ? "#BE3A3E" : "#D9E1EA"};color:${on ? "#BE3A3E" : "#41566B"};`,
                      )}
                    >
                      {n}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={s(
              "display:flex;align-items:center;gap:10px;background:#F6F9FC;border:1px solid #EAF0F6;border-radius:11px;padding:11px 14px;margin-bottom:18px;font-size:13px;color:#65788C;font-weight:600;",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2} style={{ flex: "none" }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            El cupo máximo se define al crear cada clase, no en la actividad.
          </div>

          <div style={s("margin-bottom:18px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>Imágenes de la actividad</label>
            <div style={s("display:flex;gap:12px;")}>
              <div style={s(`width:120px;height:90px;border-radius:12px;background:${photoTint};position:relative;`)}>
                <div
                  style={s(
                    "position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:99px;background:rgba(229,72,77,.9);display:flex;align-items:center;justify-content:center;cursor:pointer;",
                  )}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div
                style={s(
                  "width:120px;height:90px;border-radius:12px;border:2px dashed #C9D5E1;background:#FAFCFE;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:5px;",
                )}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span style={s("font-size:11px;color:#90A1B2;font-weight:700;")}>Agregar</span>
              </div>
            </div>
          </div>

          <div style={s("margin-bottom:6px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>Ubicación con mapa</label>
            <div style={s("border:1px solid #E2E9F0;border-radius:12px;overflow:hidden;")}>
              <div
                style={s(
                  "height:130px;background:repeating-linear-gradient(135deg,#E7EEF5 0 16px,#DFE8F1 16px 32px);position:relative;",
                )}
              >
                <div style={s("position:absolute;inset:0;display:flex;align-items:center;justify-content:center;")}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF6A2B" stroke="#fff" strokeWidth={1.5}>
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" fill="#fff" />
                  </svg>
                </div>
                <div style={s("position:absolute;bottom:8px;left:10px;font:600 10px ui-monospace,Menlo,monospace;color:#7A8C9E;")}>
                  MAPA · seleccionar punto
                </div>
              </div>
              <input
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Dirección de encuentro"
                style={s("width:100%;border:none;padding:11px 14px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
          </div>
        </div>

        <div style={s("display:flex;gap:12px;margin-top:20px;align-items:center;")}>
          <button
            className="ah-btn"
            onClick={() => handleSave(false)}
            style={s(
              "background:#fff;border:1px solid #D6DEE7;border-radius:12px;padding:14px 24px;font:700 14.5px Manrope;color:#41566B;cursor:pointer;",
            )}
          >
            Guardar borrador
          </button>
          <button
            className="ah-btn"
            onClick={() => handleSave(true)}
            disabled={!nombre.trim() || !tipoActividadId}
            style={s(
              `flex:1;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px;font:700 15px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.28);opacity:${
                !nombre.trim() || !tipoActividadId ? ".6" : "1"
              };`,
            )}
          >
            Guardar y ver clases →
          </button>
          {savedMsg && <span style={s("font-size:13px;color:#0C8576;font-weight:700;")}>{savedMsg}</span>}
        </div>
      </div>
    </DashLayout>
  );
}
