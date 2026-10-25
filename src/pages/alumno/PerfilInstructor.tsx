import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import Avatar from "../../components/Avatar";
import Paginacion from "../../components/Paginacion";
import { CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { incluye } from "../../lib/texto";
import { usePaginado } from "../../lib/paginado";
import { formatFecha, formatHora } from "../../lib/mockData";
import { useAhora } from "../../lib/ahora";
import { useData } from "../../context/DataContext";
import type { Actividad, Categoria, TipoActividad } from "../../lib/types";

/** 3 filas de la grilla de 3 columnas. */
const POR_PAGINA = 9;

const ORDENES = ["Próxima clase", "Nombre", "Precio: menor", "Precio: mayor", "Mejor valoradas"] as const;
type Orden = (typeof ORDENES)[number];

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
  };
}

const chip = (on: boolean) =>
  s(
    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
  );

/**
 * Perfil público del instructor (`/alumno/instructor/:id`), al que lleva "Ver perfil" del
 * detalle de una actividad.
 *
 * **Sólo con lo que el frontend ya tiene** (decisión del usuario, sin endpoint nuevo): el nombre
 * y la foto, y lo que se calcula del catálogo público — sus actividades, las categorías que
 * dicta, la calificación promedio y su próxima clase. Especialidad, experiencia y descripción
 * existen en `PerfilInstructor`, pero hoy sólo las devuelve un endpoint de administrador. Nada
 * de contacto ni de identidad: el catálogo no los trae.
 *
 * El catálogo sólo incluye oferta de instructores verificados (RN-16), así que un instructor sin
 * actividades publicadas o no verificado no tiene perfil que mostrar.
 */
export default function AlumnoPerfilInstructor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { actividades, instructorNombre, getTipoActividad, getCategoria, cargandoCatalogo } = useData();

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [nivelSel, setNivelSel] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("Próxima clase");
  const seccionRef = useRef<HTMLDivElement>(null);
  const ahora = useAhora();

  const nombre = instructorNombre[id];
  const suyas = useMemo(() => actividades.filter((a) => a.instructorId === id), [actividades, id]);

  const categoriaDe = useCallback(
    (a: Actividad) => {
      const tipo = getTipoActividad(a.tipoActividadId);
      return tipo ? getCategoria(tipo.categoriaId) : undefined;
    },
    [getTipoActividad, getCategoria],
  );

  const categorias = useMemo(() => {
    const porId = new Map<string, Categoria>();
    for (const a of suyas) {
      const c = categoriaDe(a);
      if (c) porId.set(c.id, c);
    }
    return [...porId.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, "es-AR"));
  }, [suyas, categoriaDe]);

  const niveles = useMemo(
    () => [...new Set(suyas.map((a) => a.nivelIntensidad))].sort((x, y) => x.localeCompare(y, "es-AR")),
    [suyas],
  );

  // Promedio de las actividades que ya tienen calificación: una sin reseñas no es un 0.
  const calificadas = suyas.filter((a) => a.rating > 0);
  const promedio = calificadas.length ? calificadas.reduce((t, a) => t + a.rating, 0) / calificadas.length : null;

  const proxima = suyas
    .map((a) => a.proximaClase?.fechaHora)
    .filter((f): f is string => !!f && new Date(f).getTime() >= ahora)
    .sort()[0];

  const filtradas = useMemo(() => {
    const lista = suyas.filter((a) => {
      if (!incluye(a.nombre, busqueda.trim())) return false;
      if (categoriaSel && categoriaDe(a)?.id !== categoriaSel) return false;
      if (nivelSel && a.nivelIntensidad !== nivelSel) return false;
      return true;
    });
    const fecha = (a: Actividad) => (a.proximaClase ? new Date(a.proximaClase.fechaHora).getTime() : Infinity);
    switch (orden) {
      case "Nombre":
        return lista.sort((x, y) => x.nombre.localeCompare(y.nombre, "es-AR"));
      case "Precio: menor":
        return lista.sort((x, y) => x.precio - y.precio);
      case "Precio: mayor":
        return lista.sort((x, y) => y.precio - x.precio);
      case "Mejor valoradas":
        return lista.sort((x, y) => y.rating - x.rating);
      default:
        // Primero lo que se puede cursar antes; las que no tienen clases, al final.
        return lista.sort((x, y) => fecha(x) - fecha(y));
    }
  }, [suyas, busqueda, categoriaSel, nivelSel, orden, categoriaDe]);

  const pag = usePaginado(filtradas, POR_PAGINA);
  const hayFiltros = busqueda.trim() !== "" || categoriaSel !== null || nivelSel !== null;

  // Cualquier cambio de filtro vuelve a la primera página (mismo criterio que Auditoría).
  const conPaginaUno =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      pag.irAPagina(1);
    };
  const limpiar = () => {
    setBusqueda("");
    setCategoriaSel(null);
    setNivelSel(null);
    pag.irAPagina(1);
  };
  // Al cambiar de página, la grilla vuelve a empezar desde arriba de la sección, no del pie.
  const irAPagina = (n: number) => {
    pag.irAPagina(n);
    seccionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="explorar" />
      <div style={s("max-width:1240px;margin:0 auto;padding:26px 28px 60px;")}>
        <button
          type="button"
          className="ah-link"
          onClick={() => navigate(-1)}
          style={s("background:none;border:none;padding:0;margin-bottom:18px;font:700 13.5px Manrope,sans-serif;color:#12B5A5;cursor:pointer;")}
        >
          ← Volver
        </button>

        {cargandoCatalogo ? (
          <CargandoSeccion seccion="perfil del instructor" />
        ) : suyas.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            <div style={s("margin-bottom:14px;")}>Este instructor no tiene actividades publicadas en este momento.</div>
            <Link
              to="/alumno/explorar"
              className="ah-btn"
              style={s("display:inline-block;background:#0E2A47;color:#fff;border-radius:10px;padding:10px 18px;font:700 13.5px Manrope,sans-serif;text-decoration:none;")}
            >
              Ir a Explorar
            </Link>
          </div>
        ) : (
          <>
            <section
              style={s(
                "background:#fff;border:1px solid #E7EDF3;border-radius:20px;padding:26px 28px;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:28px;",
              )}
            >
              <div style={s("display:flex;align-items:center;gap:20px;flex-wrap:wrap;")}>
                <Avatar usuarioId={id} nombre={nombre ?? "?"} size={84} fontSize={32} />
                <div style={s("flex:1;min-width:220px;")}>
                  <h1 style={s("font:700 28px Space Grotesk,sans-serif;letter-spacing:-.6px;margin:0 0 6px;color:#0E2A47;")}>
                    {nombre ?? "Instructor"}
                  </h1>
                  <span
                    style={s(
                      "display:inline-flex;align-items:center;gap:6px;font:700 12px Manrope,sans-serif;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:4px 10px;border-radius:99px;",
                    )}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={3}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Instructor verificado
                  </span>
                  {categorias.length > 0 && (
                    <div style={s("display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px;")}>
                      <span style={s("font-size:13px;color:#7A8C9E;font-weight:600;margin-right:2px;")}>Dicta:</span>
                      {categorias.map((c) => (
                        <span key={c.id} style={s("font:700 12px Manrope,sans-serif;background:#F2F5F9;color:#41566B;border:1px solid #E2E9F0;padding:4px 10px;border-radius:99px;")}>
                          {c.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px;")}>
                <div style={s("background:#F7FAFC;border:1px solid #EEF2F6;border-radius:14px;padding:14px 16px;")}>
                  <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:700;")}>Actividades publicadas</div>
                  <div style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin-top:4px;")}>{suyas.length}</div>
                </div>
                <div style={s("background:#F7FAFC;border:1px solid #EEF2F6;border-radius:14px;padding:14px 16px;")}>
                  <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:700;")}>Calificación promedio</div>
                  {promedio !== null ? (
                    <div style={s("display:flex;align-items:center;gap:6px;font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin-top:4px;")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFC53D" stroke="none">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                      </svg>
                      {promedio.toFixed(1)}
                    </div>
                  ) : (
                    <div style={s("font:700 15px Manrope,sans-serif;color:#9AAABA;margin-top:8px;")}>Sin calificaciones todavía</div>
                  )}
                </div>
                <div style={s("background:#F7FAFC;border:1px solid #EEF2F6;border-radius:14px;padding:14px 16px;")}>
                  <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:700;")}>Próxima clase</div>
                  {proxima ? (
                    <div style={s("font:700 17px Manrope,sans-serif;color:#0E2A47;margin-top:8px;")}>
                      {formatFecha(proxima)} · {formatHora(proxima)}
                    </div>
                  ) : (
                    <div style={s("font:700 15px Manrope,sans-serif;color:#9AAABA;margin-top:8px;")}>Sin clases programadas</div>
                  )}
                </div>
              </div>
            </section>

            <div ref={seccionRef} style={s("scroll-margin-top:90px;")}>
              <h2 style={s("font:700 20px Space Grotesk,sans-serif;margin:0 0 14px;color:#0E2A47;")}>
                Actividades de {nombre ?? "este instructor"}
              </h2>

              <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px 18px;margin-bottom:18px;display:flex;flex-direction:column;gap:12px;")}>
                <div style={s("display:flex;gap:12px;flex-wrap:wrap;align-items:center;")}>
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => conPaginaUno(setBusqueda)(e.target.value)}
                    placeholder="Buscar entre sus actividades…"
                    style={s("flex:1;min-width:220px;border:1px solid #E2E9F0;border-radius:10px;padding:10px 13px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                  />
                  <label style={s("display:flex;align-items:center;gap:8px;font:600 13.5px Manrope,sans-serif;color:#7A8C9E;")}>
                    Ordenar por
                    <select
                      value={orden}
                      onChange={(e) => conPaginaUno(setOrden)(e.target.value as Orden)}
                      style={s("border:1px solid #E2E9F0;border-radius:10px;padding:9px 11px;font:700 13px Manrope,sans-serif;color:#0E2A47;background:#fff;")}
                    >
                      {ORDENES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {categorias.length > 1 && (
                  <div style={s("display:flex;flex-wrap:wrap;align-items:center;gap:7px;")}>
                    <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;width:72px;")}>Categoría</span>
                    <span className="ah-btn" onClick={() => conPaginaUno(setCategoriaSel)(null)} style={chip(categoriaSel === null)}>
                      Todas
                    </span>
                    {categorias.map((c) => (
                      <span key={c.id} className="ah-btn" onClick={() => conPaginaUno(setCategoriaSel)(c.id)} style={chip(categoriaSel === c.id)}>
                        {c.nombre}
                      </span>
                    ))}
                  </div>
                )}
                {niveles.length > 1 && (
                  <div style={s("display:flex;flex-wrap:wrap;align-items:center;gap:7px;")}>
                    <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;width:72px;")}>Nivel</span>
                    <span className="ah-btn" onClick={() => conPaginaUno(setNivelSel)(null)} style={chip(nivelSel === null)}>
                      Todos
                    </span>
                    {niveles.map((n) => (
                      <span key={n} className="ah-btn" onClick={() => conPaginaUno(setNivelSel)(n)} style={chip(nivelSel === n)}>
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;")}>
                <span style={s("font-size:14px;color:#65788C;font-weight:600;")}>
                  <strong style={s("color:#0E2A47;")}>
                    {filtradas.length} {filtradas.length === 1 ? "actividad" : "actividades"}
                  </strong>
                  {hayFiltros ? ` de ${suyas.length}` : ""}
                </span>
                {hayFiltros && (
                  <span className="ah-link" onClick={limpiar} style={s("font-size:13px;font-weight:700;color:#12B5A5;cursor:pointer;")}>
                    Limpiar filtros
                  </span>
                )}
              </div>

              {filtradas.length === 0 ? (
                <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
                  Ninguna de sus actividades coincide con la búsqueda.
                </div>
              ) : (
                <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;")}>
                  {pag.visibles.map((a) => (
                    <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre)} />
                  ))}
                </div>
              )}
              <Paginacion paginaActual={pag.paginaActual} totalPaginas={pag.totalPaginas} irAPagina={irAPagina} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
