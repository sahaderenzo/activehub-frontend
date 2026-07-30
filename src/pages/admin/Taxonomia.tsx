import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import { categorias } from "../../lib/mockData";
import type { NivelIntensidad } from "../../lib/types";

type Tab = "tipos" | "niveles";

const TIPO_COLORS: [string, string][] = [
  ["#EAF1FE", "#2D5BC8"],
  ["#E7F8F5", "#0C8576"],
  ["#FFF3E0", "#B9741A"],
  ["#EFEAFB", "#6A3FC4"],
  ["#FBEAEB", "#BE3A3E"],
];

function tintFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TIPO_COLORS[h % TIPO_COLORS.length];
}

const NIVELES: { nombre: NivelIntensidad; desc: string; bg: string; fg: string; bd: string }[] = [
  {
    nombre: "Física baja",
    desc: "Bajo impacto físico, apto para todo público. Ej: meditación, pilates, estiramiento.",
    bg: "#E7F8F5",
    fg: "#0C8576",
    bd: "#CBEDE7",
  },
  {
    nombre: "Física media",
    desc: "Esfuerzo moderado, requiere algo de condición física previa. Ej: senderismo, gimnasia funcional.",
    bg: "#FFF3E0",
    fg: "#B9741A",
    bd: "#F6E2C0",
  },
  {
    nombre: "Física alta",
    desc: "Alta exigencia física y cardiovascular. Recomendado para participantes entrenados.",
    bg: "#FBEAEB",
    fg: "#BE3A3E",
    bd: "#F3D2D3",
  },
];

interface TipoFormState {
  id: string | null;
  nombre: string;
  categoriaId: string;
}

export default function AdminTaxonomia() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: Tab = params.tab === "niveles" ? "niveles" : "tipos";
  const { tiposActividad, actividades, crearTipoActividad, actualizarTipoActividad, eliminarTipoActividad } = useData();
  const [form, setForm] = useState<TipoFormState | null>(null);

  const goTab = (t: Tab) => navigate(`/admin/taxonomia/${t}`);

  const catStats = useMemo(
    () =>
      categorias.map((c) => {
        const tipos = tiposActividad.filter((t) => t.categoriaId === c.id);
        const n = actividades.filter((a) => tipos.some((t) => t.id === a.tipoActividadId)).length;
        return { ...c, tiposCount: tipos.length, n };
      }),
    [tiposActividad, actividades],
  );

  const tiposConCount = useMemo(
    () =>
      tiposActividad.map((t) => {
        const cat = categorias.find((c) => c.id === t.categoriaId);
        const acts = actividades.filter((a) => a.tipoActividadId === t.id).length;
        return { ...t, catNombre: cat?.nombre ?? "—", acts };
      }),
    [tiposActividad, actividades],
  );

  const nivelesConCount = NIVELES.map((n) => ({ ...n, acts: actividades.filter((a) => a.nivelIntensidad === n.nombre).length }));

  const submitForm = () => {
    if (!form || !form.nombre.trim() || !form.categoriaId) return;
    if (form.id) actualizarTipoActividad(form.id, { nombre: form.nombre.trim(), categoriaId: form.categoriaId });
    else crearTipoActividad({ nombre: form.nombre.trim(), categoriaId: form.categoriaId });
    setForm(null);
  };

  return (
    <DashLayout role="admin" active="taxonomia">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Tipos de actividad y niveles</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Categoría agrupa Tipos de actividad. Cada actividad tiene un Tipo y un Nivel de intensidad.
        </p>
      </div>

      <div style={s("padding:24px 32px 50px;")}>
        <div style={s("display:flex;gap:4px;border-bottom:1px solid #E2E9F0;margin-bottom:22px;")}>
          {(["tipos", "niveles"] as const).map((t) => (
            <span
              key={t}
              onClick={() => goTab(t)}
              className="ah-btn"
              style={s(
                `padding:13px 18px;cursor:pointer;font:700 14px Manrope,sans-serif;color:${tab === t ? "#0E2A47" : "#90A1B2"};border-bottom:2.5px solid ${tab === t ? "#FF6A2B" : "transparent"};margin-bottom:-1px;`,
              )}
            >
              {t === "tipos" ? "Tipos de actividad" : "Niveles de intensidad"}
            </span>
          ))}
        </div>

        {tab === "tipos" && (
          <>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div>
                <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Categorías</div>
                <p style={s("font-size:12.5px;color:#7A8C9E;margin:2px 0 0;")}>Cada categoría agrupa varios tipos de actividad.</p>
              </div>
              <button
                className="ah-btn"
                disabled
                title="Las categorías son fijas en este demo"
                style={s(
                  "background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:not-allowed;opacity:.6;display:flex;align-items:center;gap:7px;",
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2.4}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nueva categoría
              </button>
            </div>
            <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px;")}>
              {catStats.map((c) => (
                <div key={c.id} style={s("background:#0E2A47;border-radius:14px;padding:16px 18px;color:#fff;")}>
                  <div style={s("font:700 15px Manrope,sans-serif;margin-bottom:4px;")}>{c.nombre}</div>
                  <div style={s("font-size:12px;color:#9DB3C9;font-weight:600;margin-bottom:8px;")}>
                    {c.tiposCount} {c.tiposCount === 1 ? "tipo" : "tipos"}
                  </div>
                  <div style={s("font:700 20px Space Grotesk,sans-serif;")}>
                    {c.n} <span style={s("font-size:12px;color:#9DB3C9;font-weight:600;")}>actividades</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Tipos de actividad</div>
              <button
                className="ah-btn"
                onClick={() => setForm({ id: null, nombre: "", categoriaId: categorias[0]?.id ?? "" })}
                style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:7px;")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo tipo
              </button>
            </div>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.4fr 1.4fr 1fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Tipo de actividad</span>
                <span>Categoría</span>
                <span>Actividades</span>
                <span>Acciones</span>
              </div>
              {tiposConCount.map((t) => {
                const [tint, color] = tintFor(t.id);
                return (
                  <div
                    key={t.id}
                    style={s("display:grid;grid-template-columns:1.4fr 1.4fr 1fr 130px;padding:13px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                  >
                    <span style={s("display:flex;align-items:center;gap:10px;font:700 14px Manrope,sans-serif;color:#0E2A47;")}>
                      <span
                        style={s(
                          `width:30px;height:30px;flex:none;border-radius:8px;background:${tint};display:flex;align-items:center;justify-content:center;font:700 12px Space Grotesk,sans-serif;color:${color};`,
                        )}
                      >
                        {t.nombre.charAt(0).toUpperCase()}
                      </span>
                      {t.nombre}
                    </span>
                    <span style={s("font-size:13.5px;color:#65788C;font-weight:600;")}>{t.catNombre}</span>
                    <span style={s("font-size:14px;color:#41566B;font-weight:700;")}>{t.acts}</span>
                    <div style={s("display:flex;gap:7px;")}>
                      <button
                        className="ah-btn"
                        onClick={() => setForm({ id: t.id, nombre: t.nombre, categoriaId: t.categoriaId })}
                        style={s("background:#EEF4FB;border:none;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#2D5BC8;cursor:pointer;")}
                      >
                        Editar
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => {
                          if (t.acts > 0) {
                            window.alert("No se puede quitar un tipo que tiene actividades asociadas.");
                            return;
                          }
                          if (window.confirm(`¿Quitar el tipo "${t.nombre}"?`)) eliminarTipoActividad(t.id);
                        }}
                        style={s("background:#fff;border:1px solid #F3D2D3;border-radius:8px;padding:7px 12px;font:700 12px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
              {tiposConCount.length === 0 && (
                <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay tipos de actividad cargados.</div>
              )}
            </div>
          </>
        )}

        {tab === "niveles" && (
          <>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div>
                <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Niveles de intensidad</div>
                <p style={s("font-size:12.5px;color:#7A8C9E;margin:2px 0 0;")}>
                  Nivel de esfuerzo físico que requiere cada actividad. Es un conjunto fijo del sistema.
                </p>
              </div>
              <button
                className="ah-btn"
                disabled
                title="Los niveles de intensidad son fijos en este demo"
                style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;cursor:not-allowed;opacity:.6;display:flex;align-items:center;gap:7px;")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo nivel
              </button>
            </div>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1fr 2fr 1fr;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Nivel</span>
                <span>Descripción</span>
                <span>Actividades</span>
              </div>
              {nivelesConCount.map((n) => (
                <div key={n.nombre} style={s("display:grid;grid-template-columns:1fr 2fr 1fr;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}>
                  <span
                    style={s(
                      `justify-self:start;font:700 13px Manrope,sans-serif;padding:5px 12px;border-radius:99px;background:${n.bg};color:${n.fg};border:1px solid ${n.bd};`,
                    )}
                  >
                    {n.nombre}
                  </span>
                  <span style={s("font-size:13px;color:#65788C;font-weight:600;line-height:1.5;")}>{n.desc}</span>
                  <span style={s("font-size:14px;color:#41566B;font-weight:700;")}>{n.acts}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {form && (
        <div style={s("position:fixed;inset:0;z-index:80;background:rgba(8,22,38,.5);display:flex;align-items:center;justify-content:center;")}>
          <div style={s("width:100%;max-width:380px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:14px;")}>
              {form.id ? "Editar tipo de actividad" : "Nuevo tipo de actividad"}
            </div>
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
            />
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Categoría</label>
            <select
              value={form.categoriaId}
              onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:20px;")}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setForm(null)}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={submitForm}
                style={s("flex:1;background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
