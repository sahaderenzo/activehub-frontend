import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import LeafletMap from "../../components/LeafletMap";
import ActivityPhoto from "../../components/ActivityPhoto";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { ApiError, BASE_URL } from "../../lib/api";
import { useGeolocation } from "../../lib/geo";
import { searchAddress, type AddressResult } from "../../lib/nominatim";

function parseCoord(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

const DEFAULT_TINTS = [
  "linear-gradient(135deg,#1B3A5C,#12B5A5)",
  "linear-gradient(135deg,#22543D,#12B5A5)",
  "linear-gradient(135deg,#173250,#0FB8A9)",
  "linear-gradient(135deg,#0E2A47,#7A52D9)",
  "linear-gradient(135deg,#1B3A5C,#FF8A4C)",
];

// Acá vivía STEPS, la pasarela de 4 pasos del encabezado. Se sacó: NO es un asistente, es un
// formulario de una sola página con todos los campos visibles a la vez. Los números marcaban
// un avance que nunca avanzaba (el paso 1 quedaba encendido siempre) y prometían un flujo por
// etapas que no existe. Las secciones del formulario ya tienen su propio título.

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
  // Galería (sección 2: `imagenes[]`). Es aparte de la portada, que sigue siendo `fotoPath`.
  // Declarada acá arriba porque el effect de más abajo llama a `setImagenes`.
  const [imagenes, setImagenes] = useState<string[]>(existing?.imagenes ?? []);
  // Ya no es decorativo: se guarda en la Actividad (E2I-HU03 criterio 1).
  const [duracionMin, setDuracionMin] = useState(String(existing?.duracionMin ?? 60));
  const [precioRaw, setPrecioRaw] = useState(existing ? String(existing.precio) : "");
  const [ubicacion, setUbicacion] = useState(existing?.ubicacion ?? "");
  const [latText, setLatText] = useState(existing?.lat !== undefined ? String(existing.lat) : "");
  const [lngText, setLngText] = useState(existing?.lng !== undefined ? String(existing.lng) : "");
  const geolocation = useGeolocation();
  const [categoriaId, setCategoriaId] = useState(() => {
    const tipo = existing ? data.getTipoActividad(existing.tipoActividadId) : undefined;
    return tipo?.categoriaId ?? data.categorias[0]?.id ?? "";
  });

  // El detalle es el único endpoint que trae la descripción completa y la galería;
  // `data.actividades` viene del listado y no las tiene.
  useEffect(() => {
    if (isEdit && id) {
      data
        .cargarDetalleActividad(id)
        .then((r) => {
          setDescripcion(r.descripcion);
          setImagenes(r.imagenes ?? []);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // Sincroniza con un sistema externo (la API de geolocalización del navegador), que es
  // justamente para lo que están los efectos.
  /* eslint-disable react-hooks/set-state-in-effect -- copia las coordenadas que devuelve la
     API de geolocalización del navegador (sistema externo) a los campos del formulario. */
  useEffect(() => {
    if (geolocation.coords) {
      setLatText(String(geolocation.coords.lat));
      setLngText(String(geolocation.coords.lng));
    }
  }, [geolocation.coords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [resultadosDireccion, setResultadosDireccion] = useState<AddressResult[]>([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState<string | null>(null);

  const buscarDireccion = async () => {
    setErrorDireccion(null);
    setBuscandoDireccion(true);
    try {
      const resultados = await searchAddress(ubicacion);
      setResultadosDireccion(resultados);
      if (resultados.length === 0) setErrorDireccion("No encontramos resultados para esa dirección.");
    } catch {
      setErrorDireccion("No pudimos buscar la dirección. Intentá de nuevo.");
    } finally {
      setBuscandoDireccion(false);
    }
  };

  const elegirResultadoDireccion = (r: AddressResult) => {
    setUbicacion(r.displayName);
    setLatText(String(r.lat));
    setLngText(String(r.lng));
    setResultadosDireccion([]);
  };

  const [tipoActividadId, setTipoActividadId] = useState(existing?.tipoActividadId ?? "");
  // Sin default fijo: los niveles son un ABM (E4Ad-HU05) y "Física media" puede no existir.
  // Al alta se preselecciona el primero del catálogo, ya cargado o cuando termine de llegar.
  const [nivelIntensidadId, setNivelIntensidadId] = useState(existing?.nivelIntensidadId ?? "");
  const [photoTint] = useState(
    () => existing?.photoTint ?? DEFAULT_TINTS[Math.floor(Math.random() * DEFAULT_TINTS.length)],
  );
  // El catálogo de niveles llega por fetch, así que en el primer render puede estar vacío
  // y el alta quedaría sin nada seleccionado. Se preselecciona el primero cuando aparece.
  useEffect(() => {
    if (!nivelIntensidadId && data.nivelesIntensidad.length > 0) {
      setNivelIntensidadId(data.nivelesIntensidad[0].id);
    }
  }, [data.nivelesIntensidad, nivelIntensidadId]);

  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [savedMsg, setSavedMsg] = useState("");

  const tiposFiltrados = data.tiposActividad.filter((t) => t.categoriaId === categoriaId);

  // El tipo elegido tiene que pertenecer a la categoría: si dejó de pertenecer, se corrige
  // durante el render en vez de en un efecto (evita un frame con un tipo inválido).
  if (tiposFiltrados.length > 0 && !tiposFiltrados.some((t) => t.id === tipoActividadId)) {
    setTipoActividadId(tiposFiltrados[0].id);
  }

  const targetId = existing?.id ?? draftId;

  const handlePrecioChange = (raw: string) => {
    setPrecioRaw(raw.replace(/[^\d]/g, ""));
  };

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (navigateAfter: boolean): Promise<string | undefined> => {
    if (!currentUser || !nombre.trim() || !tipoActividadId) return undefined;
    if (!nivelIntensidadId) {
      setError("Elegí un nivel de exigencia.");
      return undefined;
    }
    const latTrim = latText.trim();
    const lngTrim = lngText.trim();
    if (!!latTrim !== !!lngTrim) {
      setError("Completá latitud y longitud juntas, o dejá las dos vacías.");
      return undefined;
    }
    if (!Number(duracionMin)) {
      setError("La duración debe ser un número de minutos mayor a 0.");
      return undefined;
    }
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      tipoActividadId,
      nivelIntensidadId,
      precio: Number(precioRaw) || 0,
      ubicacion: ubicacion.trim() || "Ubicación a confirmar",
      photoTint,
      duracionMin: Number(duracionMin),
      lat: latTrim ? Number(latTrim) : undefined,
      lng: lngTrim ? Number(lngTrim) : undefined,
    };
    setError(null);
    setGuardando(true);
    try {
      let id: string;
      if (targetId) {
        await data.actualizarActividad(targetId, payload);
        id = targetId;
        if (navigateAfter) {
          navigate(`/instructor/actividades/${targetId}`);
          return id;
        }
      } else {
        const nueva = await data.crearActividad(payload);
        setDraftId(nueva.id);
        id = nueva.id;
        if (navigateAfter) {
          navigate(`/instructor/actividades/${nueva.id}`);
          return id;
        }
      }
      setSavedMsg("Borrador guardado.");
      window.setTimeout(() => setSavedMsg(""), 2500);
      return id;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la actividad. Intentá de nuevo.");
      return undefined;
    } finally {
      setGuardando(false);
    }
  };

  const [fotoVersion, setFotoVersion] = useState(0);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoError, setFotoError] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const galeriaInputRef = useRef<HTMLInputElement>(null);

  const agregarImagen = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendoImagen(true);
    setError(null);
    try {
      const objetivo = targetId ?? (await handleSave(false));
      if (!objetivo) return;
      const creada = await data.agregarImagenActividad(objetivo, archivo);
      setImagenes((prev) => [...prev, creada.id]);
      // La primera imagen también pasa a ser la portada del lado del backend.
      if (imagenes.length === 0) setFotoVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen. Intentá de nuevo.");
    } finally {
      setSubiendoImagen(false);
    }
  };

  const quitarImagen = async (imagenId: string) => {
    if (!targetId) return;
    if (!window.confirm("¿Quitar esta imagen de la galería?")) return;
    setError(null);
    try {
      await data.eliminarImagenActividad(targetId, imagenId);
      setImagenes((prev) => prev.filter((i) => i !== imagenId));
      setFotoVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos quitar la imagen.");
    }
  };

  const handleFotoActividadChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendoFoto(true);
    setFotoError(false);
    try {
      const id = targetId ?? (await handleSave(false));
      if (!id) return;
      await data.subirFotoActividad(id, archivo);
      setFotoVersion((v) => v + 1);
    } catch (err) {
      setFotoError(true);
      setError(err instanceof ApiError ? err.message : "No pudimos subir la foto. Intentá de nuevo.");
    } finally {
      setSubiendoFoto(false);
    }
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
              {data.categorias.map((c) => {
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
                {data.nivelesIntensidad.map((nivel) => {
                  const n = nivel.nombre;
                  const on = nivel.id === nivelIntensidadId;
                  return (
                    <span
                      key={nivel.id}
                      title={nivel.descripcion}
                      className="ah-btn"
                      onClick={() => setNivelIntensidadId(nivel.id)}
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
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFotoActividadChange}
              style={s("display:none;")}
            />
            <div
              onClick={() => !subiendoFoto && fotoInputRef.current?.click()}
              className="ah-photo-edit"
              title={fotoError ? "No pudimos subir la foto. Probá de nuevo." : "Subir una foto"}
              tabIndex={0}
              style={s(
                `width:150px;height:110px;border-radius:12px;background:${photoTint};position:relative;overflow:hidden;cursor:${subiendoFoto ? "default" : "pointer"};`,
              )}
            >
              {targetId && <ActivityPhoto actividadId={targetId} version={fotoVersion} />}
              {!subiendoFoto && (
                <span
                  className="ah-avatar-overlay"
                  style={s(
                    "position:absolute;inset:0;background:rgba(14,42,71,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none;",
                  )}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span style={s("font-size:11.5px;color:#fff;font-weight:700;")}>{targetId ? "Cambiar foto" : "Agregar foto"}</span>
                </span>
              )}
              {subiendoFoto && (
                <span
                  style={s(
                    "position:absolute;inset:0;background:rgba(14,42,71,.6);display:flex;align-items:center;justify-content:center;",
                  )}
                >
                  <span
                    style={s(
                      "display:block;width:26px;height:26px;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:99px;animation:ahspin .7s linear infinite;",
                    )}
                  />
                </span>
              )}
              {fotoError && (
                <span
                  style={s(
                    "position:absolute;bottom:-1px;right:-1px;width:16px;height:16px;border-radius:99px;background:#E5484D;border:2px solid #fff;",
                  )}
                />
              )}
            </div>
            <p style={s("font-size:12px;color:#90A1B2;font-weight:600;margin:8px 0 0;")}>
              Portada. JPG o PNG. Podés cambiarla cuando quieras.
            </p>

            <div style={s("margin-top:18px;")}>
              <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>
                Galería <span style={s("color:#90A1B2;font-weight:600;")}>({imagenes.length}/6)</span>
              </label>
              <input
                ref={galeriaInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={agregarImagen}
                style={s("display:none;")}
              />
              <div style={s("display:flex;gap:10px;flex-wrap:wrap;")}>
                {imagenes.map((imagenId) => (
                  <div
                    key={imagenId}
                    style={s("position:relative;width:96px;height:72px;border-radius:10px;overflow:hidden;border:1px solid #E2E9F0;")}
                  >
                    <img
                      src={`${BASE_URL}/api/fotos/actividad/imagen/${imagenId}`}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      className="ah-btn"
                      onClick={() => quitarImagen(imagenId)}
                      title="Quitar de la galería"
                      style={s(
                        "position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:99px;background:rgba(14,42,71,.75);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;",
                      )}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {imagenes.length < 6 && (
                  <button
                    type="button"
                    className="ah-btn"
                    onClick={() => !subiendoImagen && galeriaInputRef.current?.click()}
                    disabled={subiendoImagen}
                    style={s(
                      "width:96px;height:72px;border-radius:10px;border:1.5px dashed #C9D5E1;background:#fff;color:#65788C;font:700 12px Manrope;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;",
                    )}
                  >
                    {subiendoImagen ? (
                      "Subiendo…"
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65788C" strokeWidth={2.4}>
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Agregar
                      </>
                    )}
                  </button>
                )}
              </div>
              <p style={s("font-size:12px;color:#90A1B2;font-weight:600;margin:8px 0 0;")}>
                Hasta 6 imágenes. La primera que subas queda además como portada.
              </p>
            </div>
          </div>

          <div style={s("margin-bottom:6px;")}>
            <label style={s("display:block;font:700 13px Manrope;color:#41566B;margin-bottom:9px;")}>Ubicación con mapa</label>
            <div style={s("border:1px solid #E2E9F0;border-radius:12px;overflow:hidden;")}>
              <LeafletMap
                lat={parseCoord(latText)}
                lng={parseCoord(lngText)}
                height={130}
                title={ubicacion || undefined}
                placeholderText="Buscá una dirección o cargá coordenadas manualmente"
              />
              <div style={s("display:flex;")}>
                <input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      buscarDireccion();
                    }
                  }}
                  placeholder="Dirección de encuentro"
                  style={s("flex:1;border:none;padding:11px 14px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
                />
                <span
                  className="ah-btn"
                  onClick={buscarDireccion}
                  style={s(
                    "cursor:pointer;white-space:nowrap;padding:11px 16px;font:700 12.5px Manrope;color:#12B5A5;border-left:1px solid #E2E9F0;",
                  )}
                >
                  {buscandoDireccion ? "Buscando…" : "Buscar"}
                </span>
              </div>
              {errorDireccion && (
                <div style={s("padding:9px 14px;font-size:12px;color:#BE3A3E;font-weight:600;border-top:1px solid #F3D2D3;background:#FBEAEB;")}>
                  {errorDireccion}
                </div>
              )}
              {resultadosDireccion.length > 0 && (
                <div style={s("border-top:1px solid #E2E9F0;")}>
                  {resultadosDireccion.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => elegirResultadoDireccion(r)}
                      className="ah-btn"
                      style={s(
                        "cursor:pointer;padding:9px 14px;font-size:12.5px;color:#41566B;border-bottom:1px solid #F1F4F8;",
                      )}
                    >
                      {r.displayName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={s("display:flex;gap:10px;margin-top:10px;align-items:center;")}>
              <input
                value={latText}
                onChange={(e) => setLatText(e.target.value)}
                placeholder="Latitud (opcional)"
                style={s(
                  "flex:1;border:1px solid #D9E1EA;border-radius:11px;padding:11px 14px;font:600 13.5px Manrope;color:#0E2A47;outline:none;",
                )}
              />
              <input
                value={lngText}
                onChange={(e) => setLngText(e.target.value)}
                placeholder="Longitud (opcional)"
                style={s(
                  "flex:1;border:1px solid #D9E1EA;border-radius:11px;padding:11px 14px;font:600 13.5px Manrope;color:#0E2A47;outline:none;",
                )}
              />
              <span
                className="ah-btn"
                title={geolocation.status === "denied" ? "Activá la ubicación en tu navegador" : undefined}
                onClick={() => geolocation.request()}
                style={s(
                  "cursor:pointer;white-space:nowrap;padding:11px 14px;border-radius:11px;font:700 12.5px Manrope;background:#F2F5F9;color:#41566B;border:1px solid #D9E1EA;",
                )}
              >
                {geolocation.status === "loading" ? "Ubicando…" : "Usar mi ubicación actual"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-top:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}

        <div style={s("display:flex;gap:12px;margin-top:20px;align-items:center;")}>
          <button
            className="ah-btn"
            onClick={() => handleSave(false)}
            disabled={guardando}
            style={s(
              "background:#fff;border:1px solid #D6DEE7;border-radius:12px;padding:14px 24px;font:700 14.5px Manrope;color:#41566B;cursor:pointer;",
            )}
          >
            Guardar borrador
          </button>
          <button
            className="ah-btn"
            onClick={() => handleSave(true)}
            disabled={!nombre.trim() || !tipoActividadId || guardando}
            style={s(
              `flex:1;background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px;font:700 15px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.28);opacity:${
                !nombre.trim() || !tipoActividadId || guardando ? ".6" : "1"
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
