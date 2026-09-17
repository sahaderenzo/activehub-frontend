import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { CargandoAccion, CargandoSeccion } from "../../components/Cargando";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAhora } from "../../lib/ahora";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { RosterClase } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { disponibilidad, formatFecha, formatHora } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";
import type { EstadoInscripcion } from "../../lib/types";

export default function InstructorGestionClase() {
  const ahora = useAhora();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const aprobado = currentUser?.perfilInstructor?.estadoVerificacion === "APROBADO";
  useEffect(() => {
    if (currentUser && !aprobado) navigate("/instructor/solicitud", { replace: true });
  }, [currentUser, aprobado, navigate]);

  const clase = data.clases.find((c) => c.id === id);
  const actividad = clase ? data.actividades.find((a) => a.id === clase.actividadId) : undefined;

  useEffect(() => {
    if (!clase || !actividad) {
      navigate("/instructor/actividades", { replace: true });
      return;
    }
    if (currentUser && actividad.instructorId !== currentUser.id) {
      navigate("/instructor/actividades", { replace: true });
    }
  }, [clase, actividad, currentUser, navigate]);

  const [roster, setRoster] = useState<RosterClase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [cargandoRoster, setCargandoRoster] = useState(true);
  const [confirmandoCobro, setConfirmandoCobro] = useState(false);

  const cargarRoster = () => {
    if (!id) return;
    data
      .listarRosterClase(id)
      .then(setRoster)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar el listado de alumnos."))
      .finally(() => setCargandoRoster(false));
  };

  useEffect(() => {
    cargarRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!currentUser || !aprobado) return null;
  if (!clase || !actividad) return null;

  const tipo = data.getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? data.getCategoria(tipo.categoriaId) : undefined;
  const disp = disponibilidad(clase);

  const CUATRO_DIAS_MS = 4 * 24 * 60 * 60 * 1000;
  const dentroDeVentanaDePago = new Date(clase.fechaHora).getTime() - ahora <= CUATRO_DIAS_MS;

  const alumnos = roster?.alumnos ?? [];
  const pagoAprobado = alumnos.filter((a) => a.estado === "Inscripto").length;
  const pendienteDePago = alumnos.filter((a) => a.estado === "PagoPendiente").length;
  const preinscriptos = roster?.cantidadPreInscripcion ?? 0;

  const confirmarCobro = async (inscripcionId: string) => {
    setError(null);
    setConfirmandoCobro(true);
    try {
      await data.confirmarCobroEfectivo(inscripcionId);
      cargarRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos confirmar el cobro.");
    } finally {
      setConfirmandoCobro(false);
    }
  };

  const cancelarClase = async () => {
    if (!window.confirm("¿Cancelar esta clase? Se cancelan también las inscripciones de los alumnos anotados.")) return;
    setError(null);
    setCancelando(true);
    try {
      await data.cancelarClase(clase.id);
      cargarRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cancelar la clase.");
    } finally {
      setCancelando(false);
    }
  };

  const notificarAusencia = async () => {
    if (
      !window.confirm(
        "¿Notificar que no vas a poder dar esta clase? Se cancela la clase, se reintegran los pagos y cada alumno anotado recibe una notificación.",
      )
    )
      return;
    setError(null);
    setNotificando(true);
    try {
      const mensaje = `El instructor avisó que no podrá dar la clase de "${actividad.nombre}" del ${formatFecha(clase.fechaHora)} a las ${formatHora(clase.fechaHora)} hs. La clase fue cancelada.`;
      await data.notificarAusenciaProfesor(clase.id, mensaje);
      cargarRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos notificar la ausencia.");
    } finally {
      setNotificando(false);
    }
  };

  return (
    <DashLayout role="instructor" active="misactividades">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <span
          className="ah-link"
          onClick={() => navigate(`/instructor/actividades/${actividad.id}`)}
          style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope;color:#41566B;cursor:pointer;")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a la actividad
        </span>
      </div>
      <div style={s("padding:26px 32px 50px;")}>
        <div
          style={s(
            "display:flex;align-items:flex-start;gap:18px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;margin-bottom:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);flex-wrap:wrap;",
          )}
        >
          <div style={s(`width:96px;height:96px;border-radius:14px;flex:none;background:${actividad.photoTint};`)} />
          <div style={s("flex:1;min-width:0;")}>
            <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:7px;flex-wrap:wrap;")}>
              <span style={s("font:700 11px Manrope;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;")}>
                {cat?.nombre ?? "—"}
              </span>
              <span
                style={s(
                  "font:700 11px Manrope;padding:3px 9px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;",
                )}
              >
                {actividad.nivelIntensidad}
              </span>
              <StatusBadge type={disp.type} label={disp.label} />
            </div>
            <h1 style={s("font:700 24px Space Grotesk;margin:0 0 8px;")}>{actividad.nombre}</h1>
            <div style={s("display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px;color:#65788C;font-weight:600;")}>
              <span>
                📅 {formatFecha(clase.fechaHora)} · {formatHora(clase.fechaHora)} hs
              </span>
              <span>📍 {actividad.ubicacion}</span>
              {/* Precio de ESTA clase (V23), no el de lista de la actividad: si la clase ya
                  tiene inscriptos quedó congelada y sigue valiendo lo que pagaron. */}
              <span>💵 ${clase.precio.toLocaleString("es-AR")} / clase</span>
              {clase.precio !== actividad.precio && (
                <span style={s("color:#B9741A;")}>
                  (la actividad hoy figura a ${actividad.precio.toLocaleString("es-AR")})
                </span>
              )}
            </div>
          </div>
          <div style={s("display:flex;gap:9px;flex:none;")}>
            <button
              className="ah-btn"
              onClick={() => navigate(`/instructor/actividades/${actividad.id}`)}
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#41566B;cursor:pointer;",
              )}
            >
              Editar
            </button>
            <button
              className="ah-btn"
              onClick={cancelarClase}
              disabled={clase.estado === "Cancelada" || cancelando}
              style={s(
                `background:#FBEAEB;border:1px solid #F3D2D3;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#BE3A3E;cursor:${
                  clase.estado === "Cancelada" ? "not-allowed" : "pointer"
                };opacity:${clase.estado === "Cancelada" || cancelando ? ".55" : "1"};`,
              )}
            >
              {clase.estado === "Cancelada" ? "Clase cancelada" : cancelando ? "Cancelando…" : "Cancelar clase"}
            </button>
            {clase.estado !== "Cancelada" && clase.estado !== "Finalizada" && (
              <button
                className="ah-btn"
                onClick={notificarAusencia}
                disabled={notificando || !dentroDeVentanaDePago}
                title={
                  dentroDeVentanaDePago
                    ? undefined
                    : "Disponible a partir de los 4 días previos a la clase, cuando los alumnos ya pagaron su inscripción."
                }
                style={s(
                  `background:#FFF3E0;border:1px solid #F3DBAE;border-radius:11px;padding:11px 16px;font:700 13.5px Manrope;color:#B9741A;cursor:${
                    dentroDeVentanaDePago ? "pointer" : "not-allowed"
                  };opacity:${notificando || !dentroDeVentanaDePago ? ".55" : "1"};`,
                )}
              >
                {notificando ? "Notificando…" : "Notificar ausencia"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            style={s(
              "display:flex;align-items:center;gap:11px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 15px;margin-bottom:18px;",
            )}
          >
            <span style={s("font-size:13px;line-height:1.4;color:#BE3A3E;font-weight:600;")}>{error}</span>
          </div>
        )}

        <div className="ah-grid-5" style={s("display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:22px;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{alumnos.length}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Inscriptos</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#2D5BC8;")}>{preinscriptos}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Preinscriptos</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0C8576;")}>{pagoAprobado}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Pago aprobado</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#B9741A;")}>{pendienteDePago}</div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Pendiente de pago</div>
          </div>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:14px;padding:16px;")}>
            <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>
              {clase.cuposMax - clase.cuposOcupados}/{clase.cuposMax}
            </div>
            <div style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Cupos libres</div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:18px 22px;")}>
            <div style={s("font:700 16px Space Grotesk;")}>Alumnos inscriptos</div>
          </div>
          <div
            className="ah-grid-4"
            style={s(
              "display:grid;grid-template-columns:1.6fr 1fr 1fr 150px;padding:11px 22px;background:#F7FAFC;border-top:1px solid #EEF2F6;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
            )}
          >
            <span>Alumno</span>
            <span>Contacto</span>
            <span>Estado inscripción</span>
            <span>Pago efectivo</span>
          </div>
          {cargandoRoster && (
            <div style={s("padding:22px;")}>
              <CargandoSeccion seccion="el listado de alumnos" />
            </div>
          )}
          {!cargandoRoster && alumnos.length === 0 && (
            <div style={s("padding:26px 22px;color:#90A1B2;font-weight:600;font-size:13.5px;")}>
              Todavía no hay alumnos inscriptos en esta clase.
            </div>
          )}
          {alumnos.map((a) => {
            const avatar = `${a.nombre.charAt(0)}${a.apellido.charAt(0)}`.toUpperCase();
            const esPendiente = a.estado === "PagoPendiente";
            return (
              <div
                key={a.inscripcionId}
                className="ah-grid-4"
                style={s(
                  "display:grid;grid-template-columns:1.6fr 1fr 1fr 150px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;",
                )}
              >
                <div style={s("display:flex;align-items:center;gap:11px;")}>
                  <span
                    style={s(
                      "width:36px;height:36px;border-radius:99px;background:#EEF4FB;color:#2D5BC8;display:flex;align-items:center;justify-content:center;font:700 14px Space Grotesk;flex:none;",
                    )}
                  >
                    {avatar}
                  </span>
                  <span style={s("font:700 14px Manrope;color:#0E2A47;")}>{a.nombre} {a.apellido}</span>
                </div>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{a.telefono ?? "—"}</span>
                <StatusBadge type={inscripcionStatusType(a.estado as EstadoInscripcion)} />
                <div>
                  {esPendiente && (
                    <button
                      className="ah-btn"
                      onClick={() => confirmarCobro(a.inscripcionId)}
                      style={s(
                        "background:#E7F8F5;border:1px solid #CBEDE7;border-radius:9px;padding:8px 12px;font:700 12px Manrope;color:#0C8576;cursor:pointer;display:flex;align-items:center;gap:6px;",
                      )}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.6}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Confirmar cobro
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Confirmar un cobro mueve plata: el doble click no puede llegar. */}
      <CargandoAccion activo={confirmandoCobro} mensaje="Confirmando el cobro" />
    </DashLayout>
  );
}
