import { useMemo, useState } from "react";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { Actividad, Clase, NivelIntensidad } from "../../lib/types";
import { categorias, disponibilidad, getCategoria, getTipoActividad, getUsuario } from "../../lib/mockData";

const NIVELES: NivelIntensidad[] = ["Física baja", "Física media", "Física alta"];
const SORTS = ["Relevancia", "Precio: menor", "Precio: mayor", "Mejor valoradas"] as const;
type Sort = (typeof SORTS)[number];

function cardProps(a: Actividad, clases: Clase[]) {
  const tipo = getTipoActividad(a.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const instructor = getUsuario(a.instructorId);
  const proxima = clases
    .filter((c) => c.actividadId === a.id && c.estado !== "Cancelada" && c.estado !== "Finalizada")
    .sort((x, y) => x.fechaHora.localeCompare(y.fechaHora))[0];
  const disp = proxima ? disponibilidad(proxima) : { label: "Disponible", type: "disponible" as const };
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
    instructor: instructor ? `${instructor.nombre} ${instructor.apellido}` : "",
    price: a.precio,
    cupText: disp.label,
    cupColor,
    disp,
  };
}

export default function AlumnoExplorar() {
  const { actividades, clases, tiposActividad } = useData();
  const [search, setSearch] = useState("");
  const [catSel, setCatSel] = useState<Set<string>>(new Set());
  const [tipoSel, setTipoSel] = useState<Set<string>>(new Set());
  const [nivelSel, setNivelSel] = useState<Set<NivelIntensidad>>(new Set());
  const [maxPrecio, setMaxPrecio] = useState(8000);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [sort, setSort] = useState<Sort>("Relevancia");

  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const clearFilters = () => {
    setCatSel(new Set());
    setTipoSel(new Set());
    setNivelSel(new Set());
    setMaxPrecio(8000);
    setSoloDisponibles(false);
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
    const term = search.trim().toLowerCase();
    let list = actividades.filter((a) => {
      const tipo = getTipoActividad(a.tipoActividadId);
      if (term && !a.nombre.toLowerCase().includes(term)) return false;
      if (catSel.size > 0 && (!tipo || !catSel.has(tipo.categoriaId))) return false;
      if (tipoSel.size > 0 && !tipoSel.has(a.tipoActividadId)) return false;
      if (nivelSel.size > 0 && !nivelSel.has(a.nivelIntensidad)) return false;
      if (a.precio > maxPrecio) return false;
      if (soloDisponibles) {
        const props = cardProps(a, clases);
        if (props.disp.type === "sincupos") return false;
      }
      return true;
    });
    list = [...list];
    if (sort === "Precio: menor") list.sort((x, y) => x.precio - y.precio);
    else if (sort === "Precio: mayor") list.sort((x, y) => y.precio - x.precio);
    else if (sort === "Mejor valoradas") list.sort((x, y) => y.rating - x.rating);
    return list;
  }, [actividades, search, catSel, tipoSel, nivelSel, maxPrecio, soloDisponibles, sort, clases]);

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
                placeholder="Buscar por nombre de actividad…"
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
                  onClick={() => toggle(catSel, c.id, setCatSel)}
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
            {tiposActividad.map((t) => {
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
            {NIVELES.map((n) => {
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
            min={2000}
            max={8000}
            value={maxPrecio}
            onChange={(e) => setMaxPrecio(Number(e.target.value))}
            style={s("width:100%;accent-color:#FF6A2B;")}
          />
          <div style={s("display:flex;justify-content:space-between;font-size:12px;color:#9AAABA;font-weight:600;margin-top:6px;")}>
            <span>$2.000</span>
            <span>${maxPrecio.toLocaleString("es-AR")}</span>
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
                      onClick={() => setSort(opt)}
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
          {filtered.length === 0 ? (
            <div
              style={s(
                "background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:50px 20px;text-align:center;color:#7A8C9E;font-weight:600;",
              )}
            >
              No encontramos actividades con esos filtros. Probá ajustando los criterios.
            </div>
          ) : (
            <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;")}>
              {filtered.map((a) => (
                <ActivityCard key={a.id} {...cardProps(a, clases)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
