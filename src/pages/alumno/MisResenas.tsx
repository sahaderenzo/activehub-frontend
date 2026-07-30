import { useMemo, useState } from "react";
import AlumnoNav from "../../components/AlumnoNav";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, getUsuario } from "../../lib/mockData";
import type { Actividad, Clase } from "../../lib/types";

function Stars({ n, onPick }: { n: number; onPick?: (v: number) => void }) {
  return (
    <div style={s("display:flex;gap:2px;")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={onPick ? 24 : 14}
          height={onPick ? 24 : 14}
          viewBox="0 0 24 24"
          fill={i <= n ? "#FFC53D" : "#E3E9EF"}
          style={s(onPick ? "cursor:pointer;" : "")}
          onClick={onPick ? () => onPick(i) : undefined}
        >
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

interface FormState {
  claseId: string;
  actividad: string;
  editingId?: string;
  puntaje: number;
  comentario: string;
}

export default function AlumnoMisResenas() {
  const { currentUser } = useAuth();
  const { inscripciones, clases, actividades, resenias, crearResenia, moderarResenia } = useData();
  const [form, setForm] = useState<FormState | null>(null);

  const pendientes = useMemo(() => {
    if (!currentUser) return [] as { clase: Clase; actividad: Actividad }[];
    const result: { clase: Clase; actividad: Actividad }[] = [];
    for (const i of inscripciones) {
      if (i.alumnoId !== currentUser.id || i.estado !== "Inscripto") continue;
      const clase = clases.find((c) => c.id === i.claseId);
      if (!clase || clase.estado !== "Finalizada") continue;
      const actividad = actividades.find((a) => a.id === clase.actividadId);
      if (!actividad) continue;
      const yaReseniada = resenias.some((r) => r.claseId === i.claseId && r.alumnoId === currentUser.id);
      if (yaReseniada) continue;
      result.push({ clase, actividad });
    }
    return result;
  }, [inscripciones, clases, actividades, resenias, currentUser]);

  const hechas = useMemo(() => {
    if (!currentUser) return [];
    return resenias
      .filter((r) => r.alumnoId === currentUser.id)
      .map((r) => {
        const clase = clases.find((c) => c.id === r.claseId);
        const actividad = clase ? actividades.find((a) => a.id === clase.actividadId) : undefined;
        return { resenia: r, clase, actividad };
      })
      .sort((a, b) => b.resenia.createdAt.localeCompare(a.resenia.createdAt));
  }, [resenias, clases, actividades, currentUser]);

  const abrirNueva = (claseId: string, actividadNombre: string) => {
    setForm({ claseId, actividad: actividadNombre, puntaje: 5, comentario: "" });
  };

  const abrirEdicion = (reseniaId: string, claseId: string, actividadNombre: string, puntaje: number, comentario: string) => {
    setForm({ claseId, actividad: actividadNombre, editingId: reseniaId, puntaje, comentario });
  };

  const guardar = () => {
    if (!form || !currentUser || !form.comentario.trim()) return;
    if (form.editingId) {
      // No hay mutador de edición: se elimina la reseña anterior y se crea
      // una nueva (vuelve a quedar en moderación, ya que cambió el contenido).
      moderarResenia(form.editingId, false);
    }
    crearResenia({ claseId: form.claseId, alumnoId: currentUser.id, puntaje: form.puntaje, comentario: form.comentario.trim() });
    setForm(null);
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="misreservas" />
      <div style={s("max-width:920px;margin:0 auto;padding:30px 28px 60px;")}>
        <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Mis reseñas</h1>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 24px;")}>
          Las reseñas que dejaste y las clases finalizadas que podés reseñar. Solo se puede reseñar tras haber estado inscripto en
          una clase finalizada.
        </p>

        {pendientes.length > 0 && (
          <>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Pendientes de reseñar</div>
            <div style={s("display:flex;flex-direction:column;gap:12px;margin-bottom:32px;")}>
              {pendientes.map(({ clase, actividad }) => (
                <div
                  key={clase.id}
                  style={s(
                    "background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
                  )}
                >
                  <span style={s("width:42px;height:42px;border-radius:11px;background:#FFF4EE;display:flex;align-items:center;justify-content:center;flex:none;")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6A2B" strokeWidth={2}>
                      <path d="M11.5 3.5 13.8 8l5 .7-3.6 3.5.9 5L11.5 15l-4.5 2.4.9-5L4.3 8.7l5-.7z" />
                    </svg>
                  </span>
                  <div style={s("flex:1;")}>
                    <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{actividad.nombre}</div>
                    <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>
                      {getUsuario(actividad.instructorId)?.nombre} · {formatFecha(clase.fechaHora)}
                    </div>
                  </div>
                  <button
                    className="ah-btn"
                    onClick={() => abrirNueva(clase.id, actividad.nombre)}
                    style={s("background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:10px 18px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
                  >
                    Dejar reseña
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Reseñas que hiciste</div>
        {hechas.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            Todavía no dejaste ninguna reseña.
          </div>
        ) : (
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {hechas.map(({ resenia, clase, actividad }) => (
              <div key={resenia.id} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
                <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:10px;")}>
                  <div style={s("flex:1;")}>
                    <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{actividad?.nombre ?? "Actividad"}</div>
                    <div style={s("font-size:12.5px;color:#9AAABA;font-weight:600;")}>
                      {actividad ? getUsuario(actividad.instructorId)?.nombre : ""} · {clase ? formatFecha(clase.fechaHora) : formatFecha(resenia.createdAt)}
                    </div>
                  </div>
                  <Stars n={resenia.puntaje} />
                </div>
                <p style={s("font-size:14.5px;line-height:1.6;color:#54697E;margin:0 0 12px;")}>{resenia.comentario}</p>
                <div style={s("display:flex;align-items:center;gap:9px;")}>
                  {resenia.enModeracion && (
                    <span style={s("font:700 11px Manrope,sans-serif;background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;padding:4px 10px;border-radius:99px;")}>
                      En moderación
                    </span>
                  )}
                  <button
                    className="ah-btn"
                    onClick={() => abrirEdicion(resenia.id, resenia.claseId, actividad?.nombre ?? "", resenia.puntaje, resenia.comentario)}
                    style={s("background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:7px 14px;font:700 12.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                  >
                    Editar
                  </button>
                  <button
                    className="ah-btn"
                    onClick={() => moderarResenia(resenia.id, false)}
                    style={s("background:#fff;border:1px solid #F3D2D3;border-radius:9px;padding:7px 14px;font:700 12.5px Manrope,sans-serif;color:#BE3A3E;cursor:pointer;")}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <div
          onClick={() => setForm(null)}
          style={s("position:fixed;inset:0;background:rgba(14,42,71,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px;")}
        >
          <div onClick={(e) => e.stopPropagation()} style={s("background:#fff;border-radius:18px;padding:26px;max-width:440px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
              {form.editingId ? "Editar reseña" : "Dejar reseña"}
            </div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:16px;")}>{form.actividad}</div>
            <div style={s("margin-bottom:16px;")}>
              <Stars n={form.puntaje} onPick={(v) => setForm({ ...form, puntaje: v })} />
            </div>
            <textarea
              value={form.comentario}
              onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              placeholder="Contanos cómo fue tu experiencia…"
              rows={4}
              style={s(
                "width:100%;border:1px solid #E2E9F0;border-radius:12px;padding:12px 14px;font:500 14px Manrope,sans-serif;color:#0E2A47;resize:vertical;margin-bottom:18px;",
              )}
            />
            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setForm(null)}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={guardar}
                disabled={!form.comentario.trim()}
                style={s(
                  `flex:1;background:${form.comentario.trim() ? "#FF6A2B" : "#F1C7B4"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:pointer;`,
                )}
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
