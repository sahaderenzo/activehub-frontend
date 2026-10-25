import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import ErrorReintentar from "../../components/ErrorReintentar";
import { CargandoSeccion } from "../../components/Cargando";
import Paginacion from "../../components/Paginacion";
import { usePaginado } from "../../lib/paginado";
import { incluye } from "../../lib/texto";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { Actividad, Categoria, TipoActividad } from "../../lib/types";

/** 3 filas de la grilla de 4 columnas. */
const POR_PAGINA = 12;

const ORDENES = ["Nombre", "Precio: menor", "Precio: mayor", "Mejor valoradas", "Próxima clase"] as const;
type Orden = (typeof ORDENES)[number];

const chip = (on: boolean) =>
  s(
    `cursor:pointer;padding:6px 12px;border-radius:99px;font:700 12.5px Manrope,sans-serif;background:${on ? "#0E2A47" : "#F2F5F9"};color:${on ? "#fff" : "#41566B"};border:1px solid ${on ? "#0E2A47" : "#E2E9F0"};`,
  );

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
    disp,
  };
}

export default function AlumnoFavoritos() {
  const { currentUser } = useAuth();
  const { actividades, listarMisFavoritos, quitarFavorito, getTipoActividad, getCategoria, instructorNombre, cargandoCatalogo } =
    useData();

  const [favoritoIds, setFavoritoIds] = useState<string[]>([]);

  const [errorCarga, setErrorCarga] = useState(false);
  // También espera al catálogo: los favoritos son ids y sin las actividades cargadas la lista
  // se resuelve vacía, que se lee como "no tenés favoritos".
  const [cargandoFavoritos, setCargandoFavoritos] = useState(true);

  const cargar = useCallback(() => {
    if (!currentUser) return;
    listarMisFavoritos()
      .then((ids) => {
        setFavoritoIds(ids);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargandoFavoritos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const misFavoritas = useMemo(
    () => favoritoIds.map((id) => actividades.find((a) => a.id === id)).filter((a): a is Actividad => !!a),
    [favoritoIds, actividades],
  );

  // Filtros (2026-10-24): texto (nombre o instructor, sin tildes), categoría, nivel y orden.
  // Las opciones de categoría y nivel salen de los favoritos, no del catálogo entero.
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [nivelSel, setNivelSel] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("Nombre");

  const categoriaDe = useCallback(
    (a: Actividad) => {
      const tipo = getTipoActividad(a.tipoActividadId);
      return tipo ? getCategoria(tipo.categoriaId) : undefined;
    },
    [getTipoActividad, getCategoria],
  );

  const categorias = useMemo(() => {
    const porId = new Map<string, Categoria>();
    for (const a of misFavoritas) {
      const c = categoriaDe(a);
      if (c) porId.set(c.id, c);
    }
    return [...porId.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, "es-AR"));
  }, [misFavoritas, categoriaDe]);

  const niveles = useMemo(
    () => [...new Set(misFavoritas.map((a) => a.nivelIntensidad))].sort((x, y) => x.localeCompare(y, "es-AR")),
    [misFavoritas],
  );

  const filtradas = useMemo(() => {
    const term = busqueda.trim();
    const lista = misFavoritas.filter((a) => {
      if (term && !incluye(a.nombre, term) && !incluye(instructorNombre[a.instructorId] ?? "", term)) return false;
      if (categoriaSel && categoriaDe(a)?.id !== categoriaSel) return false;
      if (nivelSel && a.nivelIntensidad !== nivelSel) return false;
      return true;
    });
    const fecha = (a: Actividad) => (a.proximaClase ? new Date(a.proximaClase.fechaHora).getTime() : Infinity);
    switch (orden) {
      case "Precio: menor":
        return lista.sort((x, y) => x.precio - y.precio);
      case "Precio: mayor":
        return lista.sort((x, y) => y.precio - x.precio);
      case "Mejor valoradas":
        return lista.sort((x, y) => y.rating - x.rating);
      case "Próxima clase":
        return lista.sort((x, y) => fecha(x) - fecha(y));
      default:
        return lista.sort((x, y) => x.nombre.localeCompare(y.nombre, "es-AR"));
    }
  }, [misFavoritas, busqueda, categoriaSel, nivelSel, orden, categoriaDe, instructorNombre]);

  const hayFiltros = busqueda.trim() !== "" || categoriaSel !== null || nivelSel !== null;
  const limpiar = () => {
    setBusqueda("");
    setCategoriaSel(null);
    setNivelSel(null);
  };
  // La clave son los filtros, no la lista: quitar un favorito no tiene que mandar a la página 1.
  const pag = usePaginado(filtradas, POR_PAGINA, [busqueda.trim(), categoriaSel, nivelSel, orden].join("|"));

  const quitar = (actividadId: string) => {
    setFavoritoIds((prev) => prev.filter((id) => id !== actividadId));
    quitarFavorito(actividadId).catch(() => setFavoritoIds((prev) => [...prev, actividadId]));
  };

  const habilitadasEstaSemana = useMemo(() => {
    return misFavoritas.filter((a) => {
      const props = cardProps(a, getTipoActividad, getCategoria, instructorNombre);
      return props.disp.type !== "sincupos";
    }).length;
  }, [misFavoritas, getTipoActividad, getCategoria, instructorNombre]);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="favoritos" />
      <div style={s("max-width:1240px;margin:0 auto;padding:30px 28px 60px;")}>
        <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:4px;")}>
          <span style={s("width:34px;height:34px;border-radius:10px;background:#FFF4EE;display:flex;align-items:center;justify-content:center;")}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="#FF6A2B" stroke="#FF6A2B" strokeWidth={2}>
              <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
            </svg>
          </span>
          <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0;")}>Mis actividades favoritas</h1>
        </div>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 16px;")}>
          Te avisamos cuando se habilite la inscripción a una nueva clase de estas actividades. Marcar favoritos no te preinscribe ni
          inscribe.
        </p>

        {cargandoFavoritos || cargandoCatalogo ? (
          <CargandoSeccion seccion="favoritos" />
        ) : errorCarga ? (
          <ErrorReintentar mensaje="No pudimos cargar tus favoritos." onReintentar={cargar} />
        ) : misFavoritas.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            No tenés actividades favoritas todavía.{" "}
            <Link to="/alumno/explorar" className="ah-link" style={s("color:#FF6A2B;font-weight:700;text-decoration:none;")}>
              Explorá actividades →
            </Link>
          </div>
        ) : (
          <>
            {habilitadasEstaSemana > 0 && (
              <div style={s("display:flex;gap:11px;background:#EAF1FE;border:1px solid #D5E2FB;border-radius:13px;padding:13px 16px;margin-bottom:26px;max-width:560px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2} style={s("flex:none;margin-top:1px;")}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={s("font-size:13px;line-height:1.5;color:#2D5BC8;font-weight:600;")}>
                  {habilitadasEstaSemana} de tus favoritas tienen clases con cupos disponibles esta semana.
                </span>
              </div>
            )}
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:16px 18px;margin-bottom:18px;display:flex;flex-direction:column;gap:12px;")}>
              <div style={s("display:flex;gap:12px;flex-wrap:wrap;align-items:center;")}>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por actividad o instructor…"
                  style={s("flex:1;min-width:220px;border:1px solid #E2E9F0;border-radius:10px;padding:10px 13px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
                <label style={s("display:flex;align-items:center;gap:8px;font:600 13.5px Manrope,sans-serif;color:#7A8C9E;")}>
                  Ordenar por
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as Orden)}
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
                  <span className="ah-btn" onClick={() => setCategoriaSel(null)} style={chip(categoriaSel === null)}>
                    Todas
                  </span>
                  {categorias.map((c) => (
                    <span key={c.id} className="ah-btn" onClick={() => setCategoriaSel(c.id)} style={chip(categoriaSel === c.id)}>
                      {c.nombre}
                    </span>
                  ))}
                </div>
              )}
              {niveles.length > 1 && (
                <div style={s("display:flex;flex-wrap:wrap;align-items:center;gap:7px;")}>
                  <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;width:72px;")}>Nivel</span>
                  <span className="ah-btn" onClick={() => setNivelSel(null)} style={chip(nivelSel === null)}>
                    Todos
                  </span>
                  {niveles.map((n) => (
                    <span key={n} className="ah-btn" onClick={() => setNivelSel(n)} style={chip(nivelSel === n)}>
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;")}>
              <span style={s("font-size:14px;color:#65788C;font-weight:600;")}>
                <strong style={s("color:#0E2A47;")}>
                  {filtradas.length} {filtradas.length === 1 ? "favorita" : "favoritas"}
                </strong>
                {hayFiltros ? ` de ${misFavoritas.length}` : ""}
              </span>
              {hayFiltros && (
                <span className="ah-link" onClick={limpiar} style={s("font-size:13px;font-weight:700;color:#12B5A5;cursor:pointer;")}>
                  Limpiar filtros
                </span>
              )}
            </div>
            {filtradas.length === 0 && (
              <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
                Ninguna de tus favoritas coincide con la búsqueda.
              </div>
            )}
            <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:20px;")}>
              {pag.visibles.map((a) => (
                <div key={a.id} style={s("display:flex;flex-direction:column;gap:8px;")}>
                  <ActivityCard {...cardProps(a, getTipoActividad, getCategoria, instructorNombre)} />
                  <button
                    className="ah-btn"
                    onClick={() => quitar(a.id)}
                    style={s(
                      "background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:9px;font:700 12.5px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;",
                    )}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2}>
                      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
                    </svg>
                    Quitar de favoritos
                  </button>
                </div>
              ))}
            </div>
            <Paginacion paginaActual={pag.paginaActual} totalPaginas={pag.totalPaginas} irAPagina={pag.irAPagina} />
          </>
        )}
      </div>
    </div>
  );
}
