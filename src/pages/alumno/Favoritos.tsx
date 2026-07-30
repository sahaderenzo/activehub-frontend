import { useMemo } from "react";
import { Link } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import ActivityCard from "../../components/ActivityCard";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { disponibilidad, getCategoria, getTipoActividad, getUsuario } from "../../lib/mockData";
import type { Actividad, Clase } from "../../lib/types";

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

export default function AlumnoFavoritos() {
  const { currentUser } = useAuth();
  const { favoritos, actividades, clases, toggleFavorito } = useData();

  const misFavoritas = useMemo(() => {
    if (!currentUser) return [];
    const ids = favoritos.filter((f) => f.usuarioId === currentUser.id).map((f) => f.actividadId);
    return ids.map((id) => actividades.find((a) => a.id === id)).filter((a): a is Actividad => !!a);
  }, [favoritos, actividades, currentUser]);

  const habilitadasEstaSemana = useMemo(() => {
    return misFavoritas.filter((a) => {
      const props = cardProps(a, clases);
      return props.disp.type !== "sincupos";
    }).length;
  }, [misFavoritas, clases]);

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
          Te avisamos cuando se habilite la inscripción a una nueva clase de estas actividades. Marcar favoritos no reserva ni
          inscribe.
        </p>

        {misFavoritas.length === 0 ? (
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
            <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:20px;")}>
              {misFavoritas.map((a) => (
                <div key={a.id} style={s("display:flex;flex-direction:column;gap:8px;")}>
                  <ActivityCard {...cardProps(a, clases)} />
                  <button
                    className="ah-btn"
                    onClick={() => currentUser && toggleFavorito(currentUser.id, a.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
