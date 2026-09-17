import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import Modal from "../../components/Modal";
import { useData } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { nivelStyle } from "../../lib/nivelStyle";

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

interface TipoFormState {
  id: string | null;
  nombre: string;
  categoriaId: string;
}

interface CategoriaFormState {
  id: string | null;
  nombre: string;
}

interface NivelFormState {
  id: string | null;
  nombre: string;
  descripcion: string;
}

/**
 * Confirmación de la baja de una categoría. Lleva el conteo de tipos y de actividades porque
 * la decisión depende de los dos: con actividades detrás no se puede borrar nada, y con tipos
 * vacíos hay que avisar que se van a dar de baja junto con la categoría.
 */
interface BajaCategoria {
  id: string;
  nombre: string;
  tipos: number;
  actividades: number;
}

export default function AdminTaxonomia() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: Tab = params.tab === "niveles" ? "niveles" : "tipos";
  const {
    tiposActividad,
    actividades,
    categorias,
    cargandoCatalogo,
    crearTipoActividad,
    actualizarTipoActividad,
    eliminarTipoActividad,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    nivelesIntensidad,
    crearNivelIntensidad,
    actualizarNivelIntensidad,
    eliminarNivelIntensidad,
  } = useData();
  const [form, setForm] = useState<TipoFormState | null>(null);
  const [catForm, setCatForm] = useState<CategoriaFormState | null>(null);
  const [nivelForm, setNivelForm] = useState<NivelFormState | null>(null);
  const [bajaCat, setBajaCat] = useState<BajaCategoria | null>(null);
  const [borrandoCat, setBorrandoCat] = useState(false);
  const [nivelTocado, setNivelTocado] = useState(false);
  const nivelFormCompleto = !!nivelForm?.nombre.trim() && !!nivelForm?.descripcion.trim();
  const [error, setError] = useState<string | null>(null);

  const goTab = (t: Tab) => navigate(`/admin/taxonomia/${t}`);

  const catStats = useMemo(
    () =>
      categorias.map((c) => {
        const tipos = tiposActividad.filter((t) => t.categoriaId === c.id);
        const n = actividades.filter((a) => tipos.some((t) => t.id === a.tipoActividadId)).length;
        return { ...c, tiposCount: tipos.length, n };
      }),
    [categorias, tiposActividad, actividades],
  );

  const tiposConCount = useMemo(
    () =>
      tiposActividad.map((t) => {
        const cat = categorias.find((c) => c.id === t.categoriaId);
        const acts = actividades.filter((a) => a.tipoActividadId === t.id).length;
        return { ...t, catNombre: cat?.nombre ?? "—", acts };
      }),
    [tiposActividad, actividades, categorias],
  );



  const submitForm = async () => {
    if (!form || !form.nombre.trim() || !form.categoriaId) return;
    setError(null);
    try {
      if (form.id) await actualizarTipoActividad(form.id, { nombre: form.nombre.trim(), categoriaId: form.categoriaId });
      else await crearTipoActividad({ nombre: form.nombre.trim(), categoriaId: form.categoriaId });
      setForm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el tipo de actividad.");
    }
  };

  const eliminarTipo = async (id: string, nombre: string) => {
    if (window.confirm(`¿Quitar el tipo "${nombre}"?`)) {
      try {
        await eliminarTipoActividad(id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No pudimos quitar el tipo de actividad.");
      }
    }
  };

  const submitNivelForm = async () => {
    // Criterio 3: nombre y descripción son obligatorios; el botón ya está deshabilitado,
    // esto es la red por si llega vacío igual.
    setNivelTocado(true);
    if (!nivelForm || !nivelForm.nombre.trim() || !nivelForm.descripcion.trim()) return;
    setError(null);
    const input = { nombre: nivelForm.nombre.trim(), descripcion: nivelForm.descripcion.trim() };
    try {
      if (nivelForm.id) await actualizarNivelIntensidad(nivelForm.id, input);
      else await crearNivelIntensidad(input);
      setNivelForm(null);
      setNivelTocado(false);
    } catch (err) {
      // Criterio 4 (duplicado) y 8 (falla genérica): el mensaje del backend es el que manda.
      setError(err instanceof ApiError ? err.message : "No se pudo completar la operación. Intentá de nuevo.");
    }
  };

  const eliminarNivel = async (id: string, nombre: string) => {
    // Criterio 7: confirmación explícita antes de la baja lógica.
    if (!window.confirm(`¿Eliminar el nivel "${nombre}"?`)) return;
    setError(null);
    try {
      await eliminarNivelIntensidad(id);
    } catch (err) {
      // Criterio 6: si tiene actividades asociadas el backend responde 409 con el texto
      // "No podés eliminar este Nivel porque tiene actividades asociadas."
      setError(err instanceof ApiError ? err.message : "No se pudo completar la operación. Intentá de nuevo.");
    }
  };

  const submitCatForm = async () => {
    if (!catForm || !catForm.nombre.trim()) return;
    setError(null);
    try {
      if (catForm.id) await actualizarCategoria(catForm.id, { nombre: catForm.nombre.trim() });
      else await crearCategoria({ nombre: catForm.nombre.trim() });
      setCatForm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la categoría.");
    }
  };

  /**
   * La baja es en cascada sobre los tipos de la categoría (lo hace el backend en una sola
   * transacción). La pantalla ya no bloquea por tener tipos —eso obligaba a borrarlos a mano
   * uno por uno— sino por lo único que de verdad lo impide: que alguno de esos tipos tenga
   * actividades publicadas. El backend valida lo mismo y es quien manda.
   */
  const confirmarBajaCat = async () => {
    if (!bajaCat) return;
    setError(null);
    setBorrandoCat(true);
    try {
      await eliminarCategoria(bajaCat.id);
      setBajaCat(null);
    } catch (err) {
      setBajaCat(null);
      setError(err instanceof ApiError ? err.message : "No pudimos quitar la categoría.");
    } finally {
      setBorrandoCat(false);
    }
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
        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}
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

        {cargandoCatalogo && <CargandoSeccion seccion="la taxonomía" />}
        {!cargandoCatalogo && tab === "tipos" && (
          <>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div>
                <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Categorías</div>
                <p style={s("font-size:12.5px;color:#7A8C9E;margin:2px 0 0;")}>Cada categoría agrupa varios tipos de actividad.</p>
              </div>
              <button
                className="ah-btn"
                onClick={() => setCatForm({ id: null, nombre: "" })}
                style={s(
                  "background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
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
                <div key={c.id} style={s("background:#0E2A47;border-radius:14px;padding:16px 18px;color:#fff;display:flex;flex-direction:column;gap:10px;")}>
                  <div>
                    <div style={s("font:700 15px Manrope,sans-serif;margin-bottom:4px;")}>{c.nombre}</div>
                    <div style={s("font-size:12px;color:#9DB3C9;font-weight:600;margin-bottom:8px;")}>
                      {c.tiposCount} {c.tiposCount === 1 ? "tipo" : "tipos"}
                    </div>
                    <div style={s("font:700 20px Space Grotesk,sans-serif;")}>
                      {c.n} <span style={s("font-size:12px;color:#9DB3C9;font-weight:600;")}>actividades</span>
                    </div>
                  </div>
                  <div style={s("display:flex;gap:7px;")}>
                    <button
                      className="ah-btn"
                      onClick={() => setCatForm({ id: c.id, nombre: c.nombre })}
                      style={s("flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:7px 10px;font:700 12px Manrope,sans-serif;color:#fff;cursor:pointer;")}
                    >
                      Editar
                    </button>
                    <button
                      className="ah-btn"
                      onClick={() => setBajaCat({ id: c.id, nombre: c.nombre, tipos: c.tiposCount, actividades: c.n })}
                      style={s("flex:1;background:rgba(190,58,62,.18);border:1px solid rgba(243,210,211,.3);border-radius:8px;padding:7px 10px;font:700 12px Manrope,sans-serif;color:#FF9A9D;cursor:pointer;")}
                    >
                      Quitar
                    </button>
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
                          eliminarTipo(t.id, t.nombre);
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

        {!cargandoCatalogo && tab === "niveles" && (
          <>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}>
              <div>
                <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Niveles de intensidad</div>
                <p style={s("font-size:12.5px;color:#7A8C9E;margin:2px 0 0;")}>
                  Nivel de esfuerzo físico que requiere cada actividad.
                </p>
              </div>
              <button
                className="ah-btn"
                onClick={() => {
                  setNivelForm({ id: null, nombre: "", descripcion: "" });
                  setNivelTocado(false);
                }}
                style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:10px 16px;font:700 13px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:7px;")}
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
                  "display:grid;grid-template-columns:1fr 2fr .6fr 1fr;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Nivel</span>
                <span>Descripción</span>
                <span>Actividades</span>
                <span>Acciones</span>
              </div>
              {nivelesIntensidad.length === 0 && (
                <div style={s("padding:26px 22px;text-align:center;font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  Todavía no hay niveles de intensidad cargados.
                </div>
              )}
              {nivelesIntensidad.map((n) => {
                const [bg, fg, bd] = nivelStyle(n.nombre);
                return (
                  <div key={n.id} style={s("display:grid;grid-template-columns:1fr 2fr .6fr 1fr;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}>
                    <span
                      style={s(
                        `justify-self:start;font:700 13px Manrope,sans-serif;padding:5px 12px;border-radius:99px;background:${bg};color:${fg};border:1px solid ${bd};`,
                      )}
                    >
                      {n.nombre}
                    </span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;line-height:1.5;")}>{n.descripcion}</span>
                    <span style={s("font-size:14px;color:#41566B;font-weight:700;")}>{n.actividades}</span>
                    <span style={s("display:flex;gap:8px;")}>
                      <button
                        className="ah-btn"
                        onClick={() => {
                          setNivelForm({ id: n.id, nombre: n.nombre, descripcion: n.descripcion });
                          setNivelTocado(false);
                        }}
                        style={s("background:#F4F7FA;color:#41566B;border:none;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope,sans-serif;cursor:pointer;")}
                      >
                        Editar
                      </button>
                      <button
                        className="ah-btn"
                        onClick={() => eliminarNivel(n.id, n.nombre)}
                        style={s("background:#FBEAEB;color:#BE3A3E;border:none;border-radius:9px;padding:7px 13px;font:700 12.5px Manrope,sans-serif;cursor:pointer;")}
                      >
                        Quitar
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {form && (
        <Modal onClose={() => setForm(null)}>
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
        </Modal>
      )}

      {catForm && (
        <Modal onClose={() => setCatForm(null)}>
          <div style={s("width:100%;max-width:380px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:14px;")}>
              {catForm.id ? "Editar categoría" : "Nueva categoría"}
            </div>
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Nombre</label>
            <input
              value={catForm.nombre}
              onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:20px;")}
            />
            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setCatForm(null)}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={submitCatForm}
                style={s("flex:1;background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {bajaCat && (
        <Modal onClose={() => !borrandoCat && setBajaCat(null)}>
          <div style={s("width:100%;max-width:440px;background:#fff;border-radius:16px;padding:24px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 17px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:10px;")}>
              {bajaCat.actividades > 0 ? "No se puede eliminar" : `¿Eliminar la categoría "${bajaCat.nombre}"?`}
            </div>

            {bajaCat.actividades > 0 ? (
              <p style={s("font-size:13.5px;line-height:1.6;color:#65788C;margin:0 0 20px;")}>
                La categoría <strong>{bajaCat.nombre}</strong> tiene {bajaCat.tipos}{" "}
                {bajaCat.tipos === 1 ? "tipo de actividad" : "tipos de actividad"} y entre ellos hay{" "}
                <strong>
                  {bajaCat.actividades} {bajaCat.actividades === 1 ? "actividad publicada" : "actividades publicadas"}
                </strong>
                . Dá de baja esas actividades antes de eliminar la categoría.
              </p>
            ) : (
              <p style={s("font-size:13.5px;line-height:1.6;color:#65788C;margin:0 0 20px;")}>
                {bajaCat.tipos === 0 ? (
                  <>
                    No tiene tipos de actividad asociados. Esta acción es una baja lógica: la categoría deja de estar
                    disponible en el catálogo.
                  </>
                ) : (
                  <>
                    Se van a eliminar también sus{" "}
                    <strong>
                      {bajaCat.tipos} {bajaCat.tipos === 1 ? "tipo de actividad" : "tipos de actividad"}
                    </strong>
                    , que no tienen ninguna actividad asociada. ¿Confirmás?
                  </>
                )}
              </p>
            )}

            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setBajaCat(null)}
                disabled={borrandoCat}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                {bajaCat.actividades > 0 ? "Entendido" : "Cancelar"}
              </button>
              {bajaCat.actividades === 0 && (
                <button
                  className="ah-btn"
                  onClick={confirmarBajaCat}
                  disabled={borrandoCat}
                  style={s(
                    `flex:1;background:${borrandoCat ? "#D89A9C" : "#BE3A3E"};color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:${borrandoCat ? "wait" : "pointer"};`,
                  )}
                >
                  {borrandoCat ? "Eliminando…" : "Sí, eliminar"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* E4Ad-HU05 criterio 2: modal con Nombre* y Descripción*, ambos obligatorios. */}
      {nivelForm && (
        <Modal onClose={() => setNivelForm(null)}>
          <div style={s("width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:14px;")}>
              {nivelForm.id ? "Editar nivel de intensidad" : "Nuevo nivel de intensidad"}
            </div>
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Nombre*</label>
            <input
              value={nivelForm.nombre}
              onChange={(e) => setNivelForm({ ...nivelForm, nombre: e.target.value })}
              maxLength={60}
              style={s(
                `width:100%;border:1px solid ${nivelTocado && !nivelForm.nombre.trim() ? "#E5484D" : "#E2E9F0"};border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:${nivelTocado && !nivelForm.nombre.trim() ? "6px" : "14px"};`,
              )}
            />
            {nivelTocado && !nivelForm.nombre.trim() && (
              <div style={s("font-size:12px;color:#E5484D;font-weight:600;margin-bottom:12px;")}>Este campo es obligatorio</div>
            )}
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Descripción*</label>
            <textarea
              value={nivelForm.descripcion}
              onChange={(e) => setNivelForm({ ...nivelForm, descripcion: e.target.value })}
              maxLength={300}
              rows={3}
              style={s(
                `width:100%;box-sizing:border-box;resize:vertical;border:1px solid ${nivelTocado && !nivelForm.descripcion.trim() ? "#E5484D" : "#E2E9F0"};border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:${nivelTocado && !nivelForm.descripcion.trim() ? "6px" : "20px"};`,
              )}
            />
            {nivelTocado && !nivelForm.descripcion.trim() && (
              <div style={s("font-size:12px;color:#E5484D;font-weight:600;margin-bottom:18px;")}>Este campo es obligatorio</div>
            )}
            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => {
                  setNivelForm(null);
                  setNivelTocado(false);
                }}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                disabled={!nivelFormCompleto}
                onClick={submitNivelForm}
                style={s(
                  `flex:1;background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:${nivelFormCompleto ? "pointer" : "not-allowed"};opacity:${nivelFormCompleto ? 1 : 0.55};`,
                )}
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashLayout>
  );
}
