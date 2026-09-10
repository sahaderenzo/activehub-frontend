import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import ErrorReintentar from "../../components/ErrorReintentar";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { haversineKm, useGeolocation } from "../../lib/geo";
import type { Actividad, Categoria, TipoActividad } from "../../lib/types";

/** Criterio 5: menos de esto no dispara la búsqueda. */
const MIN_BUSQUEDA = 2;

/** Lo que un filtro rápido le manda a Explorar (mismo contrato que su `ExplorarNavState`). */
interface FiltroRapido {
  categoriaId?: string;
  tipoActividadId?: string;
  nivel?: string;
  maxPrecio?: number;
  radio?: string;
  fecha?: string;
  franja?: string;
}

function hoyLocal(desplazamientoDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + desplazamientoDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface OpcionesFiltro {
  categorias: Categoria[];
  tiposActividad: TipoActividad[];
  /** Nombres de nivel presentes en el catálogo. */
  niveles: string[];
  precios: number[];
}

/**
 * Los 7 filtros rápidos del criterio 1. Cada opción es una intención que viaja a Explorar
 * por `location.state`; ninguno filtra acá, así que el alumno siempre termina en la pantalla
 * que sí sabe mostrar y limpiar filtros.
 */
const FILTROS_RAPIDOS: {
  key: string;
  label: string;
  opciones: (data: OpcionesFiltro) => { label: string; filtro: FiltroRapido }[];
}[] = [
  {
    key: "categoria",
    label: "Categoría",
    opciones: ({ categorias }) => categorias.map((c) => ({ label: c.nombre, filtro: { categoriaId: c.id } })),
  },
  {
    key: "tipo",
    label: "Tipo",
    opciones: ({ tiposActividad }) =>
      tiposActividad.map((t) => ({
        label: t.nombre,
        // La categoría viaja junto al tipo: Explorar solo muestra los tipos de las
        // categorías marcadas, si no el chip quedaría filtrando sin verse.
        filtro: { categoriaId: t.categoriaId, tipoActividadId: t.id },
      })),
  },
  {
    key: "nivel",
    label: "Nivel",
    opciones: ({ niveles }) => niveles.map((n) => ({ label: n, filtro: { nivel: n } })),
  },
  {
    key: "ubicacion",
    label: "Ubicación",
    opciones: () => ["5 km", "10 km", "25 km"].map((r) => ({ label: "A menos de " + r, filtro: { radio: r } })),
  },
  {
    key: "fecha",
    label: "Fecha",
    opciones: () => [
      { label: "Hoy", filtro: { fecha: hoyLocal() } },
      { label: "Mañana", filtro: { fecha: hoyLocal(1) } },
      { label: "Pasado mañana", filtro: { fecha: hoyLocal(2) } },
    ],
  },
  {
    key: "horario",
    label: "Horario",
    opciones: () => ["Mañana", "Tarde", "Noche"].map((f) => ({ label: f, filtro: { franja: f } })),
  },
  {
    key: "precio",
    label: "Precio",
    opciones: ({ precios }) =>
      precios.map((p) => ({ label: "Hasta $" + p.toLocaleString("es-AR"), filtro: { maxPrecio: p } })),
  },
];

function disponibilidadDe(a: Actividad): { label: string; type: "disponible" | "ultimos" | "sincupos" } {
  const p = a.proximaClase;
  if (!p) return { label: "Disponible", type: "disponible" };
  const libres = p.cuposMax - p.cuposOcupados;
  if (libres <= 0) return { label: "Sin cupos", type: "sincupos" };
  if (libres <= 3) return { label: `${libres} cupos · Últimos`, type: "ultimos" };
  return { label: "Disponible", type: "disponible" };
}

function distanciaKm(a: Actividad, userCoords: { lat: number; lng: number } | null): number | undefined {
  if (!userCoords || a.lat === undefined || a.lng === undefined) return undefined;
  return haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
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
  };
}

export default function AlumnoHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    actividades,
    tiposActividad,
    categorias,
    getTipoActividad,
    getCategoria,
    instructorNombre,
    errorCatalogo,
    refrescarCatalogo,
  } = useData();
  const [search, setSearch] = useState("");
  // Filtro rápido desplegado (criterio 1) y foco del buscador, que abre los
  // resultados debajo del campo (criterios 4 a 6).
  const [filtroAbierto, setFiltroAbierto] = useState<string | null>(null);
  const [buscadorEnFoco, setBuscadorEnFoco] = useState(false);
  const geolocation = useGeolocation();

  // Igual que en el detalle de actividad: entrar a Home ya es una decisión
  // deliberada del alumno, así que pedir la ubicación de una vez (para "Cerca
  // de tu ubicación" más abajo) no es una sorpresa como sí lo sería en medio
  // de una lista larga de resultados.
  useEffect(() => {
    geolocation.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const irAExplorar = (extra?: FiltroRapido) => {
    navigate("/alumno/explorar", { state: { search, ...extra } });
  };
  const goCalendario = () => navigate("/alumno/calendario");

  // Criterios 4 a 6: los resultados se despliegan debajo del buscador, no se navega
  // a ciegas. Con menos de 2 caracteres ni siquiera se busca.
  const termino = search.trim();
  const sugerencias = useMemo(() => {
    if (termino.length < MIN_BUSQUEDA) return [];
    const q = termino.toLowerCase();
    return actividades
      .filter((a) => {
        const tipo = getTipoActividad(a.tipoActividadId);
        const instructor = instructorNombre[a.instructorId] ?? "";
        return (
          a.nombre.toLowerCase().includes(q) ||
          (tipo?.nombre ?? "").toLowerCase().includes(q) ||
          a.ubicacion.toLowerCase().includes(q) ||
          instructor.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [actividades, termino, getTipoActividad, instructorNombre]);

  const nivelesDisponibles = useMemo(
    () => [...new Set(actividades.map((a) => a.nivelIntensidad))],
    [actividades],
  );

  const preciosSugeridos = useMemo(() => {
    if (actividades.length === 0) return [];
    const max = Math.max(...actividades.map((a) => a.precio));
    // Tres cortes sobre el precio real del catálogo: un tope fijo queda viejo apenas
    // aparece una actividad más cara.
    return [0.25, 0.5, 0.75].map((f) => Math.ceil((max * f) / 500) * 500).filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  }, [actividades]);

  /** Un filtro rápido no filtra acá: manda a Explorar con la intención ya elegida. */
  const aplicarFiltro = (extra: FiltroRapido) => {
    setFiltroAbierto(null);
    irAExplorar(extra);
  };

  const intereses = currentUser?.perfilAlumno?.intereses ?? [];

  // Desde V19 un interés ES un tipo de actividad, así que el cruce es por id y no por
  // coincidencia de texto contra el nombre: eso metía falsos positivos y, al revés, se
  // perdía las actividades cuyo nombre no repetía la palabra del interés.
  const recomendado = useMemo(() => {
    const tiposElegidos = new Set(intereses.map((i) => i.tipoActividadId));
    const matched = actividades.filter((a) => tiposElegidos.has(a.tipoActividadId));
    const rest = actividades.filter((a) => !matched.includes(a));
    return [...matched, ...rest].slice(0, 3);
  }, [actividades, intereses]);

  // Real: ordenada por distancia calculada con la ubicación del alumno, no
  // "lo que haya sobrado" de recomendado como antes. Sin permiso de ubicación,
  // o si nada cae dentro de los 5km, se muestra un estado vacío en vez de
  // actividades cualquiera con el rótulo engañoso de "cerca tuyo".
  const cerca = useMemo(() => {
    if (!geolocation.coords) return [];
    return actividades
      .map((a) => ({ a, dist: distanciaKm(a, geolocation.coords) }))
      .filter((x): x is { a: Actividad; dist: number } => x.dist !== undefined && x.dist <= 5)
      .sort((x, y) => x.dist - y.dist)
      .slice(0, 3)
      .map((x) => x.a);
  }, [actividades, geolocation.coords]);

  const proximasClases = useMemo(() => {
    return [...actividades]
      .filter((a) => a.proximaClase && a.proximaClase.estado !== "Cancelada" && a.proximaClase.estado !== "Finalizada")
      .sort((x, y) => x.proximaClase!.fechaHora.localeCompare(y.proximaClase!.fechaHora))
      .slice(0, 3);
  }, [actividades]);

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="home" />
      <div style={s("max-width:1240px;margin:0 auto;padding:30px 28px 60px;")}>
        <div
          style={s(
            "background:linear-gradient(135deg,#0E2A47,#143A5E);border-radius:24px;padding:34px 38px;position:relative;overflow:hidden;margin-bottom:34px;",
          )}
        >
          <div
            style={s(
              "position:absolute;top:-70px;right:-30px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(18,181,165,.28),transparent 70%);",
            )}
          />
          <div
            style={s(
              "position:absolute;bottom:-90px;right:160px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,106,43,.16),transparent 70%);",
            )}
          />
          <div style={s("position:relative;")}>
            <div style={s("font:700 13px Manrope,sans-serif;color:#9DB3C9;margin-bottom:8px;text-transform:capitalize;")}>
              {fechaHoy} · Mendoza
            </div>
            <h1 style={s("font:700 32px Space Grotesk,sans-serif;color:#fff;letter-spacing:-.7px;margin:0 0 6px;")}>
              ¡Hola, {currentUser?.nombre ?? "Alumno"}! 👋
            </h1>
            <p style={s("font-size:15.5px;color:#9DB3C9;margin:0 0 24px;")}>¿Qué actividad querés hacer hoy?</p>
            <div style={s("position:relative;max-width:760px;")}>
            <div
              style={s(
                "background:#fff;border-radius:16px;padding:8px;display:flex;align-items:center;gap:6px;box-shadow:0 14px 30px rgba(0,0,0,.18);",
              )}
            >
              <div style={s("flex:1.4;display:flex;align-items:center;gap:10px;padding:9px 14px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setBuscadorEnFoco(true)}
                  // El blur va con delay: sin él, el click sobre un resultado cierra el
                  // panel antes de que el handler llegue a ejecutarse.
                  onBlur={() => window.setTimeout(() => setBuscadorEnFoco(false), 150)}
                  placeholder="Meditación, running, trekking…"
                  style={s("border:none;outline:none;font:600 14.5px Manrope,sans-serif;color:#0E2A47;width:100%;")}
                  onKeyDown={(e) => {
                    // Enter tiene que hacer lo mismo que el botón "Buscar": buscar por
                    // texto, sin filtro de distancia. Antes aplicaba un radio de 5 km en
                    // silencio, así que la misma búsqueda daba resultados distintos según
                    // se apretara Enter o el botón. El radio se pide explícitamente con el
                    // control "cerca tuyo" de al lado.
                    if (e.key === "Enter") irAExplorar();
                  }}
                />
              </div>
              <div style={s("width:1px;height:30px;background:#E7EDF3;")} />
              <div
                className="ah-btn"
                title="Buscar solo actividades a menos de 5 km"
                onClick={() => irAExplorar({ radio: "5 km" })}
                style={s("flex:1;display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6A2B" strokeWidth={2}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={s("font-size:14.5px;font-weight:600;color:#0E2A47;")}>Cerca tuyo · 5 km</span>
              </div>
              <button
                className="ah-btn"
                onClick={() => irAExplorar()}
                style={s(
                  "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:13px 24px;font:700 15px Manrope,sans-serif;cursor:pointer;",
                )}
              >
                Buscar
              </button>
            </div>

            {/* Criterios 4 a 6: los resultados caen debajo del buscador. */}
            {buscadorEnFoco && termino.length > 0 && (
              <div
                style={s(
                  "position:absolute;top:calc(100% + 8px);left:0;right:0;background:#fff;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.22);overflow:hidden;z-index:20;",
                )}
              >
                {termino.length < MIN_BUSQUEDA ? (
                  <div style={s("padding:14px 18px;font:600 13.5px Manrope,sans-serif;color:#7A8C9E;")}>
                    Ingresá al menos 2 caracteres
                  </div>
                ) : sugerencias.length === 0 ? (
                  <div style={s("padding:14px 18px;font:600 13.5px Manrope,sans-serif;color:#7A8C9E;")}>
                    No se encontraron actividades con esos criterios
                  </div>
                ) : (
                  sugerencias.map((a) => {
                    const tipo = getTipoActividad(a.tipoActividadId);
                    const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
                    return (
                      <div
                        key={a.id}
                        className="ah-btn"
                        // onMouseDown y no onClick: el blur del input dispara antes que el click.
                        onMouseDown={() => navigate(`/alumno/actividad/${a.id}`)}
                        style={s(
                          "padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;border-bottom:1px solid #F1F4F8;",
                        )}
                      >
                        <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{a.nombre}</span>
                        <span style={s("font:600 12.5px Manrope,sans-serif;color:#7A8C9E;")}>
                          {cat?.nombre ?? tipo?.nombre ?? ""}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Criterio 1: fila de filtros rápidos. Cada uno abre su desplegable y lleva a
            Explorar con ese filtro ya aplicado — el Home no filtra por su cuenta. */}
        <div style={s("display:flex;flex-wrap:wrap;gap:9px;margin-bottom:26px;")}>
          {FILTROS_RAPIDOS.map((f) => {
            const abierto = filtroAbierto === f.key;
            const opciones = f.opciones({
              categorias,
              tiposActividad,
              niveles: nivelesDisponibles,
              precios: preciosSugeridos,
            });
            return (
              <div key={f.key} style={s("position:relative;")}>
                <button
                  className="ah-btn"
                  onClick={() => setFiltroAbierto(abierto ? null : f.key)}
                  style={s(
                    "background:#fff;border:1px solid " +
                      (abierto ? "#12B5A5" : "#E7EDF3") +
                      ";border-radius:11px;padding:9px 14px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:7px;",
                  )}
                >
                  {f.label}
                  <span style={s("font-size:11px;color:#9AAABA;")}>∨</span>
                </button>
                {abierto && (
                  <div
                    style={s(
                      "position:absolute;top:calc(100% + 6px);left:0;min-width:196px;background:#fff;border:1px solid #E7EDF3;border-radius:12px;box-shadow:0 14px 30px rgba(14,42,71,.14);z-index:15;overflow:hidden;",
                    )}
                  >
                    {opciones.length === 0 ? (
                      <div style={s("padding:11px 14px;font:600 13px Manrope,sans-serif;color:#9AAABA;")}>
                        Sin opciones
                      </div>
                    ) : (
                      opciones.map((o) => (
                        <div
                          key={o.label}
                          className="ah-btn"
                          onClick={() => aplicarFiltro(o.filtro)}
                          style={s(
                            "padding:10px 14px;font:600 13px Manrope,sans-serif;color:#41566B;cursor:pointer;border-bottom:1px solid #F1F4F8;",
                          )}
                        >
                          {o.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {errorCatalogo && (
          <div style={s("margin-bottom:26px;")}>
            <ErrorReintentar
              variant="bloque"
              mensaje="No se pudo cargar el inicio"
              onReintentar={() => {
                refrescarCatalogo();
              }}
            />
          </div>
        )}

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
          <div>
            <h2 style={s("font:700 23px Space Grotesk,sans-serif;letter-spacing:-.4px;margin:0;")}>Recomendado para vos</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:4px 0 0;")}>
              {intereses.length > 0
                ? `En base a tus intereses: ${intereses.map((i) => i.nombre).join(", ")}`
                : "Descubrí actividades pensadas para vos"}
            </p>
          </div>
          <span className="ah-link" onClick={() => irAExplorar()} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:14.5px;")}>
            Ver más →
          </span>
        </div>
        {recomendado.length === 0 ? (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:32px 20px;text-align:center;margin-bottom:42px;",
            )}
          >
            <div style={s("color:#7A8C9E;font-weight:600;font-size:13.5px;margin-bottom:14px;")}>
              Todavía no tenemos recomendaciones para vos. ¡Explorá todas las actividades!
            </div>
            <button
              className="ah-btn"
              onClick={() => irAExplorar()}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px 20px;font:700 13.5px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Explorar actividades
            </button>
          </div>
        ) : (
          <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:42px;")}>
            {recomendado.map((a) => (
              <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre, geolocation.coords)} />
            ))}
          </div>
        )}

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
          <div>
            <h2 style={s("font:700 23px Space Grotesk,sans-serif;letter-spacing:-.4px;margin:0;")}>Cerca de tu ubicación</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:4px 0 0;")}>Actividades a menos de 5 km de tu ubicación actual</p>
          </div>
          <span
            className="ah-link"
            onClick={() => irAExplorar({ radio: "5 km" })}
            style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:14.5px;")}
          >
            Ver más →
          </span>
        </div>
        {cerca.length === 0 ? (
          <div
            style={s(
              "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:28px 20px;text-align:center;color:#7A8C9E;font-weight:600;font-size:13.5px;margin-bottom:42px;",
            )}
          >
            {geolocation.status === "denied"
              ? "Activá la ubicación en tu navegador para ver actividades cerca tuyo."
              : geolocation.status === "unsupported"
                ? "Tu navegador no soporta geolocalización."
                : geolocation.coords
                  ? "No encontramos actividades a menos de 5 km de tu ubicación."
                  : "Buscando actividades cerca tuyo…"}
          </div>
        ) : (
          <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:42px;")}>
            {cerca.map((a) => (
              <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre, geolocation.coords)} />
            ))}
          </div>
        )}

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
          <div>
            <h2 style={s("font:700 23px Space Grotesk,sans-serif;letter-spacing:-.4px;margin:0;")}>Próximas clases disponibles</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:4px 0 0;")}>Con cupos para esta semana</p>
          </div>
          <span className="ah-link" onClick={goCalendario} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:14.5px;")}>
            Ver calendario →
          </span>
        </div>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;")}>
          {proximasClases.map((a) => (
            <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre, geolocation.coords)} />
          ))}
        </div>
      </div>
    </div>
  );
}
