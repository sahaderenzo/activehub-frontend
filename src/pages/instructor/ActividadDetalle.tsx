import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import ActivityPhoto from "../../components/ActivityPhoto";
import { s } from "../../lib/style";
import { useAhora } from "../../lib/ahora";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha, formatHora } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateInputLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputLocal(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InstructorActividadDetalle() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const actividad = data.actividades.find((a) => a.id === id);

  useEffect(() => {
    if (!actividad) {
      navigate("/instructor/actividades", { replace: true });
      return;
    }
    if (currentUser && actividad.instructorId !== currentUser.id) {
      navigate("/instructor/actividades", { replace: true });
    }
  }, [actividad, currentUser, navigate]);

  useEffect(() => {
    if (id) data.cargarDetalleActividad(id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ahora = useAhora();
  /** 4 días: el mismo umbral que `VentanaInscripcion.UMBRAL_PREINSCRIPCION` del backend. */
  const UMBRAL_PREINSCRIPCION_MS = 4 * 24 * 60 * 60 * 1000;

  const [formOpen, setFormOpen] = useState(false);
  const [editingClaseId, setEditingClaseId] = useState<string | null>(null);
  const [fechaStr, setFechaStr] = useState("");
  const [horaStr, setHoraStr] = useState("");
  const [cuposStr, setCuposStr] = useState("");
  // E2I-HU06 criterio 6: "Repetir cada semana" crea la AgendaClases de la recurrencia.
  const [repetir, setRepetir] = useState(false);
  const [repetirHasta, setRepetirHasta] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!currentUser || !aprobado) return null;
  if (!actividad) return null;

  const tipo = data.getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? data.getCategoria(tipo.categoriaId) : undefined;
  const clases = data
    .getClasesDeActividad(actividad.id)
    .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

  /**
   * Clase CONGELADA: ya entró a la ventana de inscripción (faltan 4 días o menos) y tiene al
   * menos un inscripto. A partir de ahí hay gente que pagó por esos datos, así que no se
   * editan ni los pisa un cambio de precio de la actividad. Espejo de
   * `VentanaInscripcion.estaCongelada` en el backend, que es quien lo hace cumplir: esto
   * sólo evita ofrecer un botón que va a volver con 400.
   *
   * <p>El camino para una clase congelada que no se va a dictar es cancelarla (desde la
   * gestión de la clase), que reintegra y avisa a cada alumno.
   */
  const estaCongelada = (clase: { fechaHora: string; cuposOcupados: number }) =>
    clase.cuposOcupados > 0 &&
    new Date(clase.fechaHora).getTime() - ahora <= UMBRAL_PREINSCRIPCION_MS;

  /**
   * La hora de fin ya no se pide: la calcula el backend con la duración de la actividad. Acá
   * sólo se muestra, para que el instructor vea a qué hora termina antes de guardar.
   */
  const finCalculado = (hora: string) => {
    if (!hora) return "";
    const [h, m] = hora.split(":").map(Number);
    const total = h * 60 + m + actividad.duracionMin;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const openCrear = () => {
    setEditingClaseId(null);
    setFechaStr("");
    setHoraStr("");
    setCuposStr("");
    setRepetir(false);
    setRepetirHasta("");
    setError(null);
    setFormOpen(true);
  };

  const openEditar = (claseId: string) => {
    const c = clases.find((x) => x.id === claseId);
    if (!c) return;
    const d = new Date(c.fechaHora);
    setEditingClaseId(claseId);
    setFechaStr(toDateInputLocal(d));
    setHoraStr(toTimeInputLocal(d));
    setCuposStr(String(c.cuposMax));
    setRepetir(false);
    setRepetirHasta("");
    setError(null);
    setFormOpen(true);
  };

  const submitClase = async (e: FormEvent) => {
    e.preventDefault();
    if (!fechaStr || !horaStr) return;
    setError(null);

    const inicio = new Date(`${fechaStr}T${horaStr}:00`);

    // El cupo ya no cae a un valor de la actividad: es obligatorio y propio de la clase.
    const cupos = Number(cuposStr);
    if (!Number.isInteger(cupos) || cupos <= 0) {
      setError("El cupo debe ser un número entero mayor a 0");
      return;
    }
    // eslint-disable-next-line react-hooks/purity -- corre al enviar el formulario, no en el render
    if (!editingClaseId && inicio.getTime() <= Date.now()) {
      setError("La fecha y hora deben ser futuras");
      return;
    }

    try {
      if (editingClaseId) {
        await data.actualizarClase(editingClaseId, actividad.id, {
          fechaHora: inicio.toISOString(),
          cuposMax: cupos,
        });
      } else {
        await data.crearClase(actividad.id, {
          fechaHora: inicio.toISOString(),
          cuposMax: cupos,
          repetirSemanalmente: repetir,
          repetirHasta: repetir && repetirHasta ? repetirHasta : undefined,
        });
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la clase. Intentá de nuevo.");
    }
  };

  // Sólo se puede eliminar una clase sin inscriptos (E2I-HU05 criterio 7). El backend es
  // quien decide de verdad — acá se oculta el botón cuando ya hay cupos ocupados para no
  // ofrecer una acción que va a fallar.
  const eliminarClase = async (claseId: string) => {
    if (window.confirm("¿Eliminar esta clase? No tiene inscriptos.")) {
      try {
        await data.eliminarClase(claseId, actividad.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No pudimos eliminar la clase.");
      }
    }
  };

  const eliminarActividad = async () => {
    if (window.confirm(`¿Eliminar la actividad "${actividad.nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        // NO borrar las clases una por una antes: `eliminarClase` es una baja lógica pelada
        // y dejaba las clases invisibles (@SQLRestriction). El backend decide todo en una
        // transacción: si alguna clase vigente tiene inscriptos rechaza con 409
        // ACTIVIDAD_CON_INSCRIPTOS y no borra nada (E2I-HU06 criterio 7); si están vacías,
        // las cancela y da de baja la actividad.
        await data.eliminarActividad(actividad.id);
        navigate("/instructor/actividades");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No pudimos eliminar la actividad.");
      }
    }
  };

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
      <div style={s("padding:26px 32px 50px;")}>
        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}
        <div
          style={s(
            "display:flex;align-items:flex-start;gap:18px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;margin-bottom:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;",
          )}
        >
          <div style={s(`width:96px;height:96px;border-radius:14px;flex:none;position:relative;overflow:hidden;background:${actividad.photoTint};`)}>
            <ActivityPhoto actividadId={actividad.id} />
          </div>
          <div style={s("flex:1;min-width:0;")}>
            <div style={s("display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;")}>
              <span style={s("font:700 11px Manrope;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>
                {cat?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:2px 8px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;border:1px solid #D5E2FB;",
                )}
              >
                {tipo?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:2px 8px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;",
                )}
              >
                {actividad.nivelIntensidad}
              </span>
            </div>
            <h1 style={s("font:700 24px Space Grotesk;margin:0 0 6px;")}>{actividad.nombre}</h1>
            <p style={s("font-size:14px;line-height:1.55;color:#65788C;margin:0 0 8px;max-width:560px;")}>{actividad.descripcion}</p>
            <div style={s("display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px;color:#65788C;font-weight:600;")}>
              <span>💵 ${actividad.precio.toLocaleString("es-AR")} / clase</span>
              <span>📍 {actividad.ubicacion}</span>
              <span>📅 {clases.length} clases</span>
            </div>
          </div>
          <div style={s("display:flex;gap:9px;flex:none;")}>
            <button
              className="ah-btn"
              onClick={() => navigate(`/instructor/actividades/${actividad.id}/editar`)}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Editar actividad
            </button>
            <button
              className="ah-btn"
              onClick={eliminarActividad}
              style={s(
                "background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#BE3A3E;cursor:pointer;",
              )}
            >
              Eliminar
            </button>
          </div>
        </div>

        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;")}>
          <div>
            <div style={s("font:700 18px Space Grotesk;")}>Clases de esta actividad</div>
            <p style={s("font-size:13px;color:#7A8C9E;margin:3px 0 0;")}>Cada clase es un horario concreto al que los alumnos se inscriben.</p>
          </div>
          <button
            className="ah-btn"
            onClick={openCrear}
            style={s(
              "background:#0FB8A9;color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 14px Manrope;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 18px rgba(15,184,169,.28);",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear clase
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={submitClase}
            style={s(
              "background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 22px;margin-bottom:18px;display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;box-shadow:0 1px 2px rgba(14,42,71,.04);",
            )}
          >
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Fecha</label>
              <input
                type="date"
                required
                value={fechaStr}
                onChange={(e) => setFechaStr(e.target.value)}
                style={s("border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Hora inicio</label>
              <input
                type="time"
                required
                value={horaStr}
                onChange={(e) => setHoraStr(e.target.value)}
                style={s("border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>
            <div>
              {/*
                La hora de fin es CALCULADA, no un campo: sale de la duración de la actividad
                (${actividad.duracionMin} min). Se muestra para que el instructor la vea antes
                de guardar, pero no se edita — una clase que dura algo distinto de lo que
                promete su actividad no tendría cómo explicarse al alumno.
              */}
              {/*
                La duración va en la ETIQUETA, no debajo de la caja: la fila del formulario es
                `align-items:flex-end`, así que un texto colgando abajo empujaba esta caja hacia
                arriba y quedaba desalineada respecto de los demás campos.
              */}
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;white-space:nowrap;")}>
                Hora fin <span style={s("font-weight:600;color:#90A1B2;")}>({actividad.duracionMin} min)</span>
              </label>
              <div
                title="Se calcula con la duración de la actividad"
                style={s(
                  "border:1px dashed #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#65788C;background:#F7FAFC;min-width:88px;",
                )}
              >
                {horaStr ? finCalculado(horaStr) : "—"}
              </div>
            </div>
            <div>
              <label style={s("display:block;font:700 12px Manrope;color:#41566B;margin-bottom:6px;")}>Cupo máximo</label>
              <input
                required
                value={cuposStr}
                onChange={(e) => setCuposStr(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Ej. 15"
                style={s("width:100px;border:1px solid #D9E1EA;border-radius:9px;padding:9px 12px;font:600 13.5px Manrope;color:#0E2A47;outline:none;")}
              />
            </div>

            {!editingClaseId && (
              <div style={s("display:flex;flex-direction:column;gap:6px;")}>
                <label style={s("display:flex;align-items:center;gap:8px;font:700 12.5px Manrope;color:#41566B;cursor:pointer;")}>
                  <input type="checkbox" checked={repetir} onChange={(e) => setRepetir(e.target.checked)} />
                  Repetir cada semana
                </label>
                {repetir && (
                  <label style={s("display:flex;align-items:center;gap:8px;font:600 12px Manrope;color:#7A8C9E;")}>
                    Hasta
                    <input
                      type="date"
                      value={repetirHasta}
                      onChange={(e) => setRepetirHasta(e.target.value)}
                      style={s("border:1px solid #D9E1EA;border-radius:9px;padding:7px 10px;font:600 12.5px Manrope;color:#0E2A47;outline:none;")}
                    />
                  </label>
                )}
              </div>
            )}

            <button
              type="submit"
              className="ah-btn"
              style={s("background:#0FB8A9;color:#fff;border:none;border-radius:9px;padding:10px 18px;font:700 13.5px Manrope;cursor:pointer;")}
            >
              {editingClaseId ? "Guardar cambios" : repetir ? "Generar clases" : "Crear clase"}
            </button>
            <button
              type="button"
              className="ah-btn"
              onClick={() => setFormOpen(false)}
              style={s("background:#fff;border:1px solid #E2E9F0;border-radius:9px;padding:10px 18px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;")}
            >
              Cancelar
            </button>

            {repetir && !editingClaseId && (
              <div style={s("flex-basis:100%;background:#EAF1FE;border:1px solid #D5E2FB;border-radius:11px;padding:11px 14px;font:600 12.5px Manrope;color:#2D5BC8;line-height:1.5;")}>
                Se va a crear la clase del {fechaStr || "día elegido"} y una agenda semanal para ese mismo día y
                horario. Cada clase siguiente se genera automáticamente <strong>una semana antes</strong> de
                dictarse, así podés darla de baja con anticipación.
              </div>
            )}
          </form>
        )}

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div
            className="ah-grid-5"
            style={s(
              "display:grid;grid-template-columns:1.2fr 1.1fr .8fr .9fr 1fr 170px;padding:11px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
            )}
          >
            <span>Fecha</span>
            <span>Horario</span>
            <span>Cupos</span>
            {/* Cada clase tiene su propio precio (V23): las congeladas conservan el viejo
                cuando se edita el de la actividad, así que una sola columna en el encabezado
                de la actividad no alcanzaba para saber a cuánto se está vendiendo cada una. */}
            <span>Precio</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {clases.length === 0 && (
            <div style={s("padding:30px 22px;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
              Todavía no creaste ninguna clase para esta actividad.
            </div>
          )}
          {clases.map((c) => (
            <div
              key={c.id}
              className="ah-grid-5"
              style={s(
                "display:grid;grid-template-columns:1.2fr 1.1fr .8fr .9fr 1fr 170px;padding:13px 22px;border-bottom:1px solid #F1F4F8;align-items:center;",
              )}
            >
              <span style={s("font:700 13.5px Manrope;color:#0E2A47;")}>{formatFecha(c.fechaHora)}</span>
              <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatHora(c.fechaHora)}</span>
              <span style={s("font-size:13px;color:#41566B;font-weight:700;")}>
                {c.cuposOcupados}/{c.cuposMax}
              </span>
              <span
                title={
                  c.precio !== actividad.precio
                    ? `Congelado: la actividad hoy figura a $${actividad.precio.toLocaleString("es-AR")}.`
                    : undefined
                }
                style={s(`font:700 13px Space Grotesk;color:${c.precio !== actividad.precio ? "#B9741A" : "#41566B"};`)}
              >
                ${c.precio.toLocaleString("es-AR")}
              </span>
              <StatusBadge type={claseStatusType(c.estado)} />
              <div style={s("display:flex;gap:6px;")}>
                <button
                  className="ah-btn"
                  onClick={() => navigate(`/instructor/clases/${c.id}`)}
                  style={s("background:#EEF4FB;border:none;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#2D5BC8;cursor:pointer;")}
                >
                  Ver
                </button>
                {estaCongelada(c) ? (
                  <span
                    title="Ya tiene inscriptos y está en período de inscripción: sus datos quedaron congelados. Si no la vas a dictar, cancelala desde “Ver”."
                    style={s(
                      "display:flex;align-items:center;gap:5px;background:#F4F7FA;border:1px solid #E2E9F0;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#90A1B2;",
                    )}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#90A1B2" strokeWidth={2.4}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Congelada
                  </span>
                ) : (
                  <button
                    className="ah-btn"
                    onClick={() => openEditar(c.id)}
                    style={s(
                      "background:#fff;border:1px solid #E2E9F0;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#41566B;cursor:pointer;",
                    )}
                  >
                    Editar
                  </button>
                )}
                {c.cuposOcupados === 0 && (
                  <button
                    className="ah-btn"
                    onClick={() => eliminarClase(c.id)}
                    style={s(
                      "background:#fff;border:1px solid #F3D2D3;border-radius:8px;padding:7px 11px;font:700 12px Manrope;color:#BE3A3E;cursor:pointer;",
                    )}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
