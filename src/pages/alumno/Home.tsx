import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { Actividad, Categoria, TipoActividad } from "../../lib/types";

const CAT_ICON: Record<string, string> = {
  Bienestar: "🧘",
  Aventura: "🏔️",
  "Formación Técnica": "🎓",
  "Defensa Personal": "🥋",
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

export default function AlumnoHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { actividades, categorias, getTipoActividad, getCategoria, instructorNombre } = useData();

  const goExplorar = () => navigate("/alumno/explorar");
  const goCalendario = () => navigate("/alumno/calendario");

  const intereses = currentUser?.perfilAlumno?.intereses ?? [];

  const recomendado = useMemo(() => {
    const matched = actividades.filter((a) => {
      const tipo = getTipoActividad(a.tipoActividadId);
      const hay = `${a.nombre} ${tipo?.nombre ?? ""}`.toLowerCase();
      return intereses.some((i) => hay.includes(i.toLowerCase()));
    });
    const rest = actividades.filter((a) => !matched.includes(a));
    return [...matched, ...rest].slice(0, 3);
  }, [actividades, intereses, getTipoActividad]);

  const cerca = useMemo(() => {
    const excluidas = new Set(recomendado.map((a) => a.id));
    return actividades.filter((a) => !excluidas.has(a.id)).slice(0, 3);
  }, [actividades, recomendado]);

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
            <div
              style={s(
                "background:#fff;border-radius:16px;padding:8px;display:flex;align-items:center;gap:6px;max-width:760px;box-shadow:0 14px 30px rgba(0,0,0,.18);",
              )}
            >
              <div style={s("flex:1.4;display:flex;align-items:center;gap:10px;padding:9px 14px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  placeholder="Meditación, running, trekking…"
                  style={s("border:none;outline:none;font:600 14.5px Manrope,sans-serif;color:#0E2A47;width:100%;")}
                  onKeyDown={(e) => {
<<<<<<< Updated upstream
                    if (e.key === "Enter") goExplorar();
=======
                    // Enter tiene que hacer lo mismo que el botón "Buscar": buscar por
                    // texto, sin filtro de distancia. Antes aplicaba un radio de 5 km en
                    // silencio, así que la misma búsqueda daba resultados distintos según
                    // se apretara Enter o el botón. El radio se pide explícitamente con el
                    // control "cerca tuyo" de al lado.
                    if (e.key === "Enter") irAExplorar();
>>>>>>> Stashed changes
                  }}
                />
              </div>
              <div style={s("width:1px;height:30px;background:#E7EDF3;")} />
              <div style={s("flex:1;display:flex;align-items:center;gap:10px;padding:9px 14px;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6A2B" strokeWidth={2}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={s("font-size:14.5px;font-weight:600;color:#0E2A47;")}>Cerca tuyo · 5 km</span>
              </div>
              <button
                className="ah-btn"
                onClick={goExplorar}
                style={s(
                  "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:13px 24px;font:700 15px Manrope,sans-serif;cursor:pointer;",
                )}
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        <div style={s("display:flex;gap:10px;flex-wrap:wrap;margin-bottom:36px;")}>
          {categorias.map((c) => (
            <button
              key={c.id}
              className="ah-btn"
              onClick={goExplorar}
              style={s(
                "display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E2E9F0;border-radius:11px;padding:10px 16px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;",
              )}
            >
              <span>{CAT_ICON[c.nombre] ?? "•"}</span>
              {c.nombre}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          ))}
        </div>

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
          <div>
            <h2 style={s("font:700 23px Space Grotesk,sans-serif;letter-spacing:-.4px;margin:0;")}>Recomendado para vos</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:4px 0 0;")}>
              {intereses.length > 0 ? `En base a tus intereses: ${intereses.join(", ")}` : "Descubrí actividades pensadas para vos"}
            </p>
          </div>
          <span className="ah-link" onClick={goExplorar} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:14.5px;")}>
            Ver más →
          </span>
        </div>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:42px;")}>
          {recomendado.map((a) => (
            <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre)} />
          ))}
        </div>

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}>
          <div>
            <h2 style={s("font:700 23px Space Grotesk,sans-serif;letter-spacing:-.4px;margin:0;")}>Cerca de tu ubicación</h2>
            <p style={s("font-size:14px;color:#7A8C9E;margin:4px 0 0;")}>Actividades a menos de 5 km de Ciudad de Mendoza</p>
          </div>
          <span className="ah-link" onClick={goExplorar} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:14.5px;")}>
            Ver mapa →
          </span>
        </div>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:42px;")}>
          {cerca.map((a) => (
            <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre)} />
          ))}
        </div>

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
            <ActivityCard key={a.id} {...cardProps(a, getTipoActividad, getCategoria, instructorNombre)} />
          ))}
        </div>
      </div>
    </div>
  );
}
