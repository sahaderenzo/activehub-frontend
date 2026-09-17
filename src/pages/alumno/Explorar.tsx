import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import { CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { incluye } from "../../lib/texto";
import { useData } from "../../context/DataContext";
import { haversineKm, useGeolocation } from "../../lib/geo";
import type { Actividad, Categoria, TipoActividad } from "../../lib/types";
const SORTS = ["Relevancia", "Precio: menor", "Precio: mayor", "Mejor valoradas", "Cercanía"] as const;
type Sort = (typeof SORTS)[number];

const RADIOS = ["Cualquier distancia", "Menos de 2 km", "2 km", "5 km", "8 km", "10 km", "Más de 10 km"] as const;
type Radio = (typeof RADIOS)[number];

function distanciaKm(a: Actividad, userCoords: { lat: number; lng: number } | null): number | undefined {
  if (!userCoords || a.lat === undefined || a.lng === undefined) return undefined;
  return haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
}

function dentroDelRadio(distKm: number | undefined, radio: Radio): boolean {
  if (radio === "Cualquier distancia") return true;
  // Sin distancia calculable (sin permiso de ubicación, o la actividad no tiene
  // coordenadas cargadas) no se puede afirmar que esté dentro de ningún radio.
  if (distKm === undefined) return false;
  switch (radio) {
    case "Menos de 2 km":
      return distKm < 2;
    case "2 km":
      return distKm <= 2;
    case "5 km":
      return distKm <= 5;
    case "8 km":
      return distKm <= 8;
    case "10 km":
      return distKm <= 10;
    case "Más de 10 km":
      return distKm > 10;
  }
}

const GEO_TITLE = (status: string): string | undefined =>
  status === "denied"
    ? "Activá la ubicación en tu navegador para filtrar/ordenar por cercanía"
    : status === "unsupported"
      ? "Tu navegador no soporta geolocalización"
      : undefined;

const SORT_TITLES: Partial<Record<Sort, (status: string) => string | undefined>> = {
  Cercanía: GEO_TITLE,
};

function disponibilidadDe(a: Actividad): { label: string; type: "disponible" | "ultimos" | "sincupos" } {
  const p = a.proximaClase;
  if (!p) return { label: "Disponible", type: "disponible" };
  const libres = p.cuposMax - p.cuposOcupados;
  if (libres <= 0) return { label: "Sin cupos", type: "sincupos" };
  if (libres <= 3) return { label: `${libres} cupos · Últimos`, type: "ultimos" };
  return { label: "Disponible", type: "disponible" };
}

function cardProps(
  a: Actividad,
  getTipoActividad: (id: string) => TipoActividad | undefined,
  getCategoria: (id: string) => Categoria | undefined,
  instructorNombre: Record<string, string>,
  userCoords: { lat: number; lng: number } | null,
) {
  const tipo = getTipoActividad(a.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const disp = disponibilidadDe(a);
  const cupColor = disp.type === "sincupos" ? "#BE3A3E" : disp.type === "ultimos" ? "#B9741A" : "#0C8576";
  return {
    id: a.id,
    name: a.nombre,
    catName: cat?.nombre ?? "",
    nivel: a.nivelIntensidad,
    photoTint: a.photoTint,
    statusType: disp.type,
    rating: a.rating,
    location: a.ubicacion,
    instructor: instructorNombre[a.instructorId] ?? "",
    price: a.precio,
    cupText: disp.label,
    cupColor,
    distanceKm: distanciaKm(a, userCoords),
    disp,
  };
}

const FRANJAS = ["Cualquier horario", "Mañana", "Tarde", "Noche"] as const;
type Franja = (typeof FRANJAS)[number];

/** Franja horaria de la próxima clase, en hora local (que es la del alumno y la del negocio). */
function franjaDe(iso: string): Franja {
  const hora = new Date(iso).getHours();
  if (hora < 12) return "Mañana";
  if (hora < 18) return "Tarde";
  return "Noche";
}

/** `YYYY-MM-DD` local, para comparar contra el `<input type="date">` sin que UTC corra el día. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ExplorarNavState {
  search?: string;
  categoriaId?: string;
  tipoActividadId?: string;
  /** Nombre del nivel (E4Ad-HU05: ya no es una union fija). */
  nivel?: string;
  maxPrecio?: number;
  radio?: string;
  fecha?: string;
  franja?: string;
}

export default function AlumnoExplorar() {
  const {
    actividades, tiposActividad, categorias, nivelesIntensidad, getTipoActividad, getCategoria, instructorNombre,
    cargandoCatalogo,
  } = useData();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [catSel, setCatSel] = useState<Set<string>>(new Set());
  const [tipoSel, setTipoSel] = useState<Set<string>>(new Set());
  const [nivelSel, setNivelSel] = useState<Set<string>>(new Set());
  // null = sin tocar el filtro todavía (sin límite). El rango del slider se
  // calcula de los precios reales en vez de un tope fijo, que quedaba
  // desactualizado apenas una actividad costaba más que ese tope.
  const [maxPrecio, setMaxPrecio] = useState<number | null>(null);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [sort, setSort] = useState<Sort>("Relevancia");
  const [radio, setRadio] = useState<Radio>("Cualquier distancia");
  // Fecha y horario filtran sobre la próxima clase de cada actividad: son los dos filtros
  // rápidos que el Home ofrece y que acá no existían.
  const [fecha, setFecha] = useState("");
  const [franja, setFranja] = useState<Franja>("Cualquier horario");
  const geolocation = useGeolocation();

  // Entrar desde otra pantalla (buscador del header, buscador/chips de
  // categoría/"cerca tuyo" de Home) manda la intención ya elegida por
  // location.state. Se sincroniza con cada navegación nueva (location.key
  // cambia incluso si la ruta es la misma, ej. buscar de nuevo desde el header
  // estando ya parado en Explorar) — no solo al montar el componente.
  /* eslint-disable react-hooks/set-state-in-effect -- sincroniza los filtros con la navegación
     (location.state), que es un sistema externo al componente. */
  useEffect(() => {
    const navState = (location.state ?? {}) as ExplorarNavState;
    if (navState.search !== undefined) setSearch(navState.search);
    if (navState.categoriaId) setCatSel(new Set([navState.categoriaId]));
    if (navState.tipoActividadId) setTipoSel(new Set([navState.tipoActividadId]));
    if (navState.nivel) setNivelSel(new Set([navState.nivel]));
    if (navState.maxPrecio !== undefined) setMaxPrecio(navState.maxPrecio);
    if (navState.fecha !== undefined) setFecha(navState.fecha);
    if (navState.franja && (FRANJAS as readonly string[]).includes(navState.franja)) {
      setFranja(navState.franja as Franja);
    }
    if (navState.radio && (RADIOS as readonly string[]).includes(navState.radio)) {
      const r = navState.radio as Radio;
      setRadio(r);
      if (r !== "Cualquier distancia") geolocation.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const precioMin = actividades.length ? Math.min(...actividades.map((a) => a.precio)) : 0;
  const precioMax = actividades.length ? Math.max(...actividades.map((a) => a.precio)) : 10000;
  const precioSlider = maxPrecio ?? precioMax;

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const toggleCategoria = (categoriaId: string) => {
    const next = new Set(catSel);
    if (next.has(categoriaId)) {
      next.delete(categoriaId);
      // Al ocultar los tipos de esta categoría, sacamos también los que
      // hubiera seleccionados: si no, seguirían filtrando en silencio sin
      // aparecer ya ningún chip que lo explique.
      setTipoSel((prev) => {
        const pruned = new Set(prev);
        for (const t of tiposActividad) {
          if (t.categoriaId === categoriaId) pruned.delete(t.id);
        }
        return pruned;
      });
    } else {
      next.add(categoriaId);
    }
    setCatSel(next);
  };

  const tiposVisibles = useMemo(
    () => tiposActividad.filter((t) => catSel.has(t.categoriaId)),
    [tiposActividad, catSel],
  );

  const clearFilters = () => {
    setCatSel(new Set());
    setTipoSel(new Set());
    setNivelSel(new Set());
    setMaxPrecio(null);
    setSoloDisponibles(false);
    setRadio("Cualquier distancia");
    setSearch("");
  };

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of actividades) {
      const tipo = getTipoActividad(a.tipoActividadId);
      if (!tipo) continue;
      counts[tipo.categoriaId] = (counts[tipo.categoriaId] ?? 0) + 1;
    }
    return counts;
  }, [actividades]);

  const filtered = useMemo(() => {
    const term = search.trim();
    let list = actividades.filter((a) => {
      const tipo = getTipoActividad(a.tipoActividadId);
      if (term) {
        const instructor = instructorNombre[a.instructorId] ?? "";
        if (!incluye(a.nombre, term) && !incluye(instructor, term)) return false;
      }
      if (catSel.size > 0 && (!tipo || !catSel.has(tipo.categoriaId))) return false;
      if (tipoSel.size > 0 && !tipoSel.has(a.tipoActividadId)) return false;
      if (nivelSel.size > 0 && !nivelSel.has(a.nivelIntensidad)) return false;
      if (maxPrecio !== null && a.precio > maxPrecio) return false;
      if (!dentroDelRadio(distanciaKm(a, geolocation.coords), radio)) return false;
      if (fecha || franja !== "Cualquier horario") {
        // Sin próxima clase no hay ni fecha ni horario que puedan coincidir.
        if (!a.proximaClase) return false;
        if (fecha && diaLocal(a.proximaClase.fechaHora) !== fecha) return false;
        if (franja !== "Cualquier horario" && franjaDe(a.proximaClase.fechaHora) !== franja) return false;
      }
      if (soloDisponibles) {
        const props = cardProps(a, getTipoActividad, getCategoria, instructorNombre, geolocation.coords);
        if (props.disp.type === "sincupos") return false;
      }
      return true;
    });
    list = [...list];
    if (sort === "Precio: menor") list.sort((x, y) => x.precio - y.precio);
    else if (sort === "Precio: mayor") list.sort((x, y) => y.precio - x.precio);
    else if (sort === "Mejor valoradas") list.sort((x, y) => y.rating - x.rating);
    else if (sort === "Cercanía") {
      list.sort((x, y) => {
        const dx = distanciaKm(x, geolocation.coords) ?? Infinity;
        const dy = distanciaKm(y, geolocation.coords) ?? Infinity;
        return dx - dy;
      });
    }
    return list;
  }, [
    actividades,
    search,
    catSel,
    tipoSel,
    nivelSel,
    maxPrecio,
    radio,
    soloDisponibles,
    sort,
    getTipoActividad,
    getCategoria,
    instructorNombre,
    geolocation.coords,
  ]);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="explorar" />
      <div style={s("background:linear-gradient(135deg,#143A5E,#0E2A47);")}>
        <div style={s("max-width:1240px;margin:0 auto;padding:34px 28px 30px;")}>
          <h1 style={s("font:700 34px Space Grotesk,sans-serif;color:#fff;letter-spacing:-.8px;margin:0 0 8px;")}>
            Explorar actividades
          </h1>
          <p style={s("font-size:15.5px;color:#9DB3C9;max-width:560px;margin:0 0 20px;")}>
            Encontrá tu próxima actividad: filtrá por categoría, tipo, nivel de exigencia y precio.
          </p>
          <div
            style={s(
              "background:#fff;border-radius:14px;padding:6px;display:flex;align-items:center;gap:8px;max-width:520px;",
            )}
          >
            <div style={s("flex:1;display:flex;align-items:center;gap:10px;padding:8px 12px;")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por actividad o instructor…"
                style={s("border:none;outline:none;font:600 14px Manrope,sans-serif;color:#0E2A47;width:100%;")}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        className="ah-grid-side"
        style={s("max-width:1240px;margin:0 auto;padding:26px 28px 60px;display:grid;grid-template-columns:248px 1fr;gap:26px;")}
      >
        <aside
          style={s(
            "align-self:start;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
          )}
        >
          <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
            <span style={s("font:700 16px Space Grotesk,sans-serif;")}>Filtros</span>
            <span className="ah-link" onClick={clearFilters} style={s("font-size:13px;font-weight:700;color:#12B5A5;cursor:pointer;")}>
              Limpiar
            </span>
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:11px;")}>Categoría</div>
          <div style={s("display:flex;flex-direction:column;gap:10px;margin-bottom:22px;")}>
            {categorias.map((c) => {
              const on = catSel.has(c.id);
              return (
                <label
                  key={c.id}
                  style={s("display:flex;align-items:center;gap:10px;font-size:14px;color:#41566B;font-weight:600;cursor:pointer;")}
                  onClick={() => toggleCategoria(c.id)}
                >
                  <span
                    style={s(
                      `width:18px;height:18px;border-radius:5px;border:2px solid ${on ? "#12B5A5" : "#D6DEE7"};background:${on ? "#12B5A5" : "#fff"};display:flex;align-items:center;justify-content:center;flex:none;`,
                    )}
                  >
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  {c.nombre}
                  <span style={s("margin-left:auto;font-size:12px;color:#9AAABA;")}>{catCounts[c.id] ?? 0}</span>
                </label>
              );
            })}
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:11px;")}>Tipo de actividad</div>
          <div style={s("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:22px;")}>
            {tiposVisibles.length === 0 && (
              <span style={s("font-size:12.5px;color:#9AAABA;font-weight:600;")}>
                {catSel.size === 0
                  ? "Elegí una categoría para ver sus tipos."
                  : "Esta categoría todavía no tiene tipos de actividad."}
              </span>
            )}
            {tiposVisibles.map((t) => {
              const on = tipoSel.has(t.id);
              return (
                <span
                  key={t.id}
                  className="ah-btn"
                  onClick={() => toggle(tipoSel, t.id, setTipoSel)}
                  style={s(
                    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
                  )}
                >
                  {t.nombre}
                </span>
              );
            })}
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:11px;")}>Nivel de exigencia</div>
          <div style={s("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:22px;")}>
            {nivelesIntensidad.map((nivel) => {
              const n = nivel.nombre;
              const on = nivelSel.has(n);
              return (
                <span
                  key={n}
                  className="ah-btn"
                  onClick={() => toggle(nivelSel, n, setNivelSel)}
                  style={s(
                    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
                  )}
                >
                  {n}
                </span>
              );
            })}
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin-bottom:14px;")}>Precio máximo</div>
          <input
            type="range"
            min={precioMin}
            max={precioMax}
            value={precioSlider}
            onChange={(e) => setMaxPrecio(Number(e.target.value))}
            style={s("width:100%;accent-color:#FF6A2B;")}
          />
          <div style={s("display:flex;justify-content:space-between;font-size:12px;color:#9AAABA;font-weight:600;margin-top:6px;")}>
            <span>${precioMin.toLocaleString("es-AR")}</span>
            <span>${precioSlider.toLocaleString("es-AR")}</span>
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin:22px 0 11px;")}>Fecha</div>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={s("width:100%;border:1px solid #E2E9F0;border-radius:9px;padding:8px 10px;font:600 13px Manrope,sans-serif;color:#41566B;")}
          />
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin:22px 0 11px;")}>Horario</div>
          <div style={s("display:flex;flex-wrap:wrap;gap:7px;")}>
            {FRANJAS.map((opt) => {
              const on = franja === opt;
              return (
                <span
                  key={opt}
                  className="ah-btn"
                  onClick={() => setFranja(opt)}
                  style={s(
                    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
                  )}
                >
                  {opt}
                </span>
              );
            })}
          </div>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin:22px 0 11px;")}>Disponibilidad</div>
          <label
            style={s("display:flex;align-items:center;gap:10px;font-size:14px;color:#41566B;font-weight:600;cursor:pointer;")}
            onClick={() => setSoloDisponibles((v) => !v)}
          >
            <span
              style={s(
                `width:18px;height:18px;border-radius:5px;border:2px solid ${soloDisponibles ? "#12B5A5" : "#D6DEE7"};background:${soloDisponibles ? "#12B5A5" : "#fff"};display:flex;align-items:center;justify-content:center;flex:none;`,
              )}
            >
              {soloDisponibles && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            Solo con cupos
          </label>
          <div style={s("font:700 13px Manrope,sans-serif;color:#41566B;margin:22px 0 11px;")}>Distancia</div>
          <div style={s("display:flex;flex-wrap:wrap;gap:7px;")}>
            {RADIOS.map((opt) => {
              const on = radio === opt;
              return (
                <span
                  key={opt}
                  className="ah-btn"
                  title={opt !== "Cualquier distancia" ? GEO_TITLE(geolocation.status) : undefined}
                  onClick={() => {
                    setRadio(opt);
                    if (opt !== "Cualquier distancia") geolocation.request();
                  }}
                  style={s(
                    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
                  )}
                >
                  {opt}
                </span>
              );
            })}
          </div>
        </aside>

        <div>
          <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px;")}>
            <span style={s("font-size:14.5px;color:#65788C;font-weight:600;")}>
              <strong style={s("color:#0E2A47;")}>{filtered.length} actividades</strong> encontradas
            </span>
            <div style={s("display:flex;align-items:center;gap:9px;")}>
              <span style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;")}>Ordenar por</span>
              <div style={s("display:flex;gap:6px;background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:4px;")}>
                {SORTS.map((opt) => {
                  const on = sort === opt;
                  return (
                    <span
                      key={opt}
                      title={SORT_TITLES[opt]?.(geolocation.status)}
                      onClick={() => {
                        setSort(opt);
                        if (opt === "Cercanía") geolocation.request();
                      }}
                      style={s(
                        `padding:7px 13px;border-radius:8px;font:700 13px Manrope,sans-serif;cursor:pointer;color:${on ? "#fff" : "#65788C"};background:${on ? "#0E2A47" : "transparent"};`,
                      )}
                    >
                      {opt}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          {cargandoCatalogo ? (
            // Sin esto el catálogo vacío en vuelo se veía igual que "no hay actividades
            // que coincidan", y encima con los contadores de los filtros en cero.
            <CargandoSeccion seccion="actividades" />
          ) : filtered.length === 0 ? (
            <div
              style={s(
                "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;",
              )}
            >
              {/* Si hay un filtro de distancia activo pero no tenemos la ubicación, el
                  resultado vacío no es "no hay actividades": es que no se puede calcular
                  la distancia. Decirlo evita que el alumno crea que no hay oferta. */}
              {radio !== "Cualquier distancia" && !geolocation.coords ? (
                <>
                  <div style={s("margin-bottom:12px;")}>
                    Para filtrar por distancia necesitamos tu ubicación, y todavía no la tenemos.
                  </div>
                  <button
                    className="ah-btn"
                    onClick={() => setRadio("Cualquier distancia")}
                    style={s(
                      "background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:9px 16px;font:700 13px Manrope;color:#41566B;cursor:pointer;",
                    )}
                  >
                    Ver todas sin filtrar por distancia
                  </button>
                </>
              ) : (
                "No se encontraron actividades con esos criterios."
              )}
            </div>
          ) : (
            <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;")}>
              {filtered.map((a) => (
                <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre, geolocation.coords)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
