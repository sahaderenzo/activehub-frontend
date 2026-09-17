import { useCallback, useEffect, useMemo, useState } from "react";
import AlumnoNav from "../../components/AlumnoNav";
import { s } from "../../lib/style";
import { ESTILO_RESALTE, useResaltado } from "../../lib/resaltado";
import Modal from "../../components/Modal";
import { CargandoAccion, CargandoSeccion } from "../../components/Cargando";
import { useData } from "../../context/DataContext";
import type { MiInscripcion, MiResenia } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { siPuede } from "../../lib/cargaParcial";

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
  const data = useData();
  const { puede } = useAuth();
  const [misInscripciones, setMisInscripciones] = useState<MiInscripcion[]>([]);
  const [misResenias, setMisResenias] = useState<MiResenia[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A dónde aterrizan las notificaciones de reseña del alumno: aprobada, ocultada, respondida.
  const resaltado = useResaltado("resenia");
  const [cargando, setCargando] = useState(true);
  /** Qué acción está en vuelo, para el texto del overlay. */
  const [accion, setAccion] = useState<"guardando" | "eliminando" | null>(null);

  // Las inscripciones son de otro módulo (`inscripciones.gestionar`) y sólo alimentan la
  // lista de clases calificables: sin ese permiso las reseñas ya escritas se siguen viendo y
  // lo que no se puede es escribir una nueva (ver lib/cargaParcial.ts).
  const cargar = useCallback(() => {
    Promise.all([
      siPuede(puede("inscripciones.gestionar"), () => data.listarMisInscripciones("Inscripto"), []),
      data.listarMisResenas(),
    ])
      .then(([insc, res]) => {
        setMisInscripciones(insc);
        setMisResenias(res);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar tus reseñas."))
      .finally(() => setCargando(false));
  }, [puede, data.listarMisInscripciones, data.listarMisResenas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pendientes = useMemo(() => {
    const reseñadas = new Set(misResenias.map((r) => r.claseId));
    return misInscripciones
      .filter((i) => i.claseEstado === "Finalizada" && !reseñadas.has(i.claseId))
      .map((i) => {
        const actividad = data.actividades.find((a) => a.id === i.actividadId);
        const instructor = actividad ? data.instructorNombre[actividad.instructorId] : undefined;
        return {
          claseId: i.claseId,
          actividadNombre: i.actividadNombre,
          claseFechaHora: i.claseFechaHora,
          instructor,
        };
      });
  }, [misInscripciones, misResenias, data.actividades, data.instructorNombre]);

  const hechas = useMemo(
    () => [...misResenias].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [misResenias],
  );

  const abrirNueva = (claseId: string, actividadNombre: string) => {
    setForm({ claseId, actividad: actividadNombre, puntaje: 5, comentario: "" });
  };

  const abrirEdicion = (reseniaId: string, claseId: string, actividadNombre: string, puntaje: number, comentario: string) => {
    setForm({ claseId, actividad: actividadNombre, editingId: reseniaId, puntaje, comentario });
  };

  const guardar = async () => {
    if (!form || !form.puntaje) return;
    setError(null);
    setAccion("guardando");
    try {
      // Editar es un PUT, no un borrar+crear: antes, si la creación fallaba después
      // del borrado, la reseña original quedaba perdida sin nada que la reemplazara.
      if (form.editingId) {
        await data.actualizarResenia(form.editingId, form.puntaje, form.comentario.trim());
      } else {
        await data.crearResenia(form.claseId, form.puntaje, form.comentario.trim());
      }
      setForm(null);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la reseña.");
    } finally {
      setAccion(null);
    }
  };

  const eliminar = async (id: string) => {
    if (!window.confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    setError(null);
    setAccion("eliminando");
    try {
      await data.eliminarResenia(id);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos eliminar la reseña.");
    } finally {
      setAccion(null);
    }
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="misclases" />
      <div style={s("max-width:920px;margin:0 auto;padding:30px 28px 60px;")}>
        <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Mis reseñas</h1>
        <p style={s("font-size:14.5px;color:#7A8C9E;margin:0 0 24px;")}>
          Las reseñas que dejaste y las clases finalizadas que podés reseñar. Solo se puede reseñar tras haber estado inscripto en
          una clase finalizada.
        </p>

        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}

        {cargando && <CargandoSeccion seccion="reseñas" />}

        {!cargando && pendientes.length > 0 && (
          <>
            <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Pendientes de reseñar</div>
            <div style={s("display:flex;flex-direction:column;gap:12px;margin-bottom:32px;")}>
              {pendientes.map((p) => (
                <div
                  key={p.claseId}
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
                    <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{p.actividadNombre}</div>
                    <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>
                      {p.instructor} · {formatFecha(p.claseFechaHora)}
                    </div>
                  </div>
                  <button
                    className="ah-btn"
                    onClick={() => abrirNueva(p.claseId, p.actividadNombre)}
                    style={s("background:#FF6A2B;color:#fff;border:none;border-radius:10px;padding:10px 18px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
                  >
                    Dejar reseña
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!cargando && (
          <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:14px;")}>Reseñas que hiciste</div>
        )}
        {cargando ? null : hechas.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            Todavía no dejaste ninguna reseña.
          </div>
        ) : (
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {hechas.map((r) => (
              <div
                key={r.id}
                ref={resaltado.ref(r.id)}
                style={s(
                  "background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);"
                    + (resaltado.activo(r.id) ? ESTILO_RESALTE : ""),
                )}
              >
                <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:10px;")}>
                  <div style={s("flex:1;")}>
                    <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{r.actividadNombre}</div>
                    <div style={s("font-size:12.5px;color:#9AAABA;font-weight:600;")}>
                      {r.instructorNombre} · {formatFecha(r.claseFechaHora)}
                    </div>
                  </div>
                  <Stars n={r.puntaje} />
                </div>
                <p style={s("font-size:14.5px;line-height:1.6;color:#54697E;margin:0 0 12px;")}>
                  {r.comentario?.trim() ? r.comentario : <span style={s("color:#9AAABA;font-style:italic;")}>Sin comentario</span>}
                </p>
                {/*
                  La respuesta del instructor. Antes no se mostraba en ningún lado del lado del
                  alumno: la notificación "El instructor respondió tu reseña" no tenía a dónde
                  llevar, y el único lugar donde aparecía era la página pública de la actividad.
                */}
                {r.respuestaInstructor && (
                  <div style={s("background:#F4F8FB;border-left:3px solid #12B5A5;border-radius:0 10px 10px 0;padding:11px 14px;margin:0 0 12px;")}>
                    <div style={s("font:700 11.5px Manrope,sans-serif;color:#0C8576;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;")}>
                      Respuesta de {r.instructorNombre}
                    </div>
                    <div style={s("font-size:13.5px;line-height:1.55;color:#54697E;font-weight:500;")}>{r.respuestaInstructor}</div>
                  </div>
                )}
                <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                  {/* Ocultada por moderación: sigue acá (no se borra), pero ya no se ve en la
                      actividad. Sin el cartel, la notificación de "ocultamos tu reseña"
                      aterrizaba en una fila que se veía igual que el resto. */}
                  {r.oculta && (
                    <span style={s("font:700 11px Manrope,sans-serif;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;padding:4px 10px;border-radius:99px;")}>
                      Oculta por moderación
                    </span>
                  )}
                  {r.enModeracion && (
                    <span style={s("font:700 11px Manrope,sans-serif;background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;padding:4px 10px;border-radius:99px;")}>
                      En moderación
                    </span>
                  )}
                  <button
                    className="ah-btn"
                    onClick={() => abrirEdicion(r.id, r.claseId, r.actividadNombre, r.puntaje, r.comentario ?? "")}
                    style={s("background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:7px 14px;font:700 12.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                  >
                    Editar
                  </button>
                  <button
                    className="ah-btn"
                    onClick={() => eliminar(r.id)}
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
        <Modal onClose={() => setForm(null)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:440px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
              {form.editingId ? "Editar reseña" : "Dejar reseña"}
            </div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:16px;")}>{form.actividad}</div>
            {form.editingId && (
              <div style={s("background:#FFF3E0;border:1px solid #F6E2C0;border-radius:10px;padding:9px 12px;font:600 12.5px Manrope,sans-serif;color:#B9741A;margin-bottom:14px;")}>
                Al editarla vuelve a moderación hasta que un administrador la apruebe.
              </div>
            )}
            <div style={s("margin-bottom:16px;")}>
              <Stars n={form.puntaje} onPick={(v) => setForm({ ...form, puntaje: v })} />
            </div>
            <textarea
              value={form.comentario}
              onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              placeholder="Tu comentario (opcional) — contanos cómo fue tu experiencia…"
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
                style={s(
                  "flex:1;background:#FF6A2B;border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:pointer;",
                )}
              >
                {form.editingId ? "Guardar cambios" : "Publicar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Va por encima del modal (z-index 120 vs. 80): la reseña se publica desde adentro. */}
      <CargandoAccion
        activo={accion !== null}
        mensaje={accion === "eliminando" ? "Eliminando tu reseña" : "Publicando tu reseña"}
      />
    </div>
  );
}
