import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Logo from "../../components/Logo";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, formatHora, getCategoria, getTipoActividad, getUsuario, tipoIngreso } from "../../lib/mockData";

export default function AlumnoReserva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { clases, actividades, inscribirse } = useData();
  const [confirmado, setConfirmado] = useState(false);

  const clase = clases.find((c) => c.id === id);
  const actividad = clase ? actividades.find((a) => a.id === clase.actividadId) : undefined;

  useEffect(() => {
    // La preinscripción solo aplica cuando faltan más de 4 días para la
    // clase; si ya estamos dentro de la ventana de inscripción definitiva,
    // mandamos directo al flujo de inscripción y pago.
    if (clase && tipoIngreso(clase) !== "preinscripcion" && !confirmado) {
      navigate(`/alumno/inscripcion/${clase.id}`, { replace: true });
    }
  }, [clase, confirmado, navigate]);

  if (!clase || !actividad) {
    return (
      <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;display:flex;align-items:center;justify-content:center;")}>
        <p style={s("color:#65788C;font-weight:600;")}>Clase no encontrada.</p>
      </div>
    );
  }

  const tipo = getTipoActividad(actividad.tipoActividadId);
  const cat = tipo ? getCategoria(tipo.categoriaId) : undefined;
  const instructor = getUsuario(actividad.instructorId);

  const confirmReserva = () => {
    if (!currentUser) return;
    inscribirse(clase.id, currentUser.id);
    setConfirmado(true);
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <header style={s("background:#fff;border-bottom:1px solid #E7EDF3;")}>
        <div style={s("max-width:920px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;gap:14px;")}>
          <span
            className="ah-link"
            onClick={() => navigate(`/alumno/actividad/${actividad.id}`)}
            style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver a la actividad
          </span>
          <div style={s("margin-left:auto;")}>
            <Logo size={32} to="/alumno" />
          </div>
        </div>
      </header>
      <div style={s("max-width:680px;margin:0 auto;padding:34px 28px 70px;")}>
        <div style={s("display:flex;align-items:center;gap:6px;margin-bottom:30px;")}>
          <Step n={1} label="Resumen" active={!confirmado} done={confirmado} />
          <div style={s(`flex:1;height:2px;background:${confirmado ? "#FF6A2B" : "#E2E9F0"};`)} />
          <Step n={2} label="Confirmación" active={confirmado} done={false} />
          <div style={s("flex:1;height:2px;background:#E2E9F0;")} />
          <Step n={3} label="Listo" active={false} done={false} />
        </div>

        {!confirmado ? (
          <>
            <span
              style={s(
                "display:inline-block;background:#EAF1FE;color:#2D5BC8;border:1px solid #D5E2FB;padding:5px 12px;border-radius:99px;font:700 12px Manrope,sans-serif;margin-bottom:14px;",
              )}
            >
              Preinscripción · sin pago
            </span>
            <h1 style={s("font:700 28px Space Grotesk,sans-serif;letter-spacing:-.6px;margin:0 0 6px;")}>Preinscribite a la clase</h1>
            <p style={s("font-size:15px;color:#65788C;margin:0 0 26px;")}>
              Estás marcando tu interés en esta clase. Todavía no se realiza ningún pago ni se ocupa cupo definitivo.
            </p>

            <div
              style={s(
                "background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:20px;",
              )}
            >
              <div style={s("display:flex;gap:16px;padding:18px 20px;border-bottom:1px solid #EEF2F6;")}>
                <div style={s(`width:88px;height:88px;border-radius:13px;flex:none;background:${actividad.photoTint};`)} />
                <div style={s("flex:1;")}>
                  <div style={s("font:700 12px Manrope,sans-serif;color:#12B5A5;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;")}>
                    {tipo?.nombre} · {cat?.nombre}
                  </div>
                  <div style={s("font:700 19px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:6px;")}>{actividad.nombre}</div>
                  <div style={s("display:flex;align-items:center;gap:7px;font-size:13.5px;color:#65788C;font-weight:600;")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
                    </svg>
                    {instructor ? `${instructor.nombre} ${instructor.apellido}` : ""}
                  </div>
                </div>
              </div>
              <div style={s("padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;")}>
                <InfoTile bg="#EEF4FB" stroke="#2D5BC8" label="Fecha" value={formatFecha(clase.fechaHora)}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </InfoTile>
                <InfoTile bg="#E7F8F5" stroke="#0C8576" label="Horario" value={`${formatHora(clase.fechaHora)} hs`}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </InfoTile>
                <InfoTile bg="#FFF3E0" stroke="#B9741A" label="Ubicación" value={actividad.ubicacion}>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </InfoTile>
                <InfoTile
                  bg="#EFEAFB"
                  stroke="#7A52D9"
                  label="Precio estimado"
                  value={`$${actividad.precio.toLocaleString("es-AR")} (al inscribirte)`}
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </InfoTile>
              </div>
            </div>

            <div style={s("display:flex;gap:11px;background:#EAF1FE;border:1px solid #D5E2FB;border-radius:14px;padding:15px 17px;margin-bottom:24px;")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2} style={s("flex:none;margin-top:1px;")}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div>
                <div style={s("font:700 14px Manrope,sans-serif;color:#2D5BC8;margin-bottom:3px;")}>
                  La inscripción definitiva se habilita 4 días antes
                </div>
                <div style={s("font-size:13.5px;line-height:1.55;color:#3F6AC4;font-weight:500;")}>
                  Cuando falten 4 días para la clase vas a poder inscribirte pagando y confirmar tu lugar.
                </div>
              </div>
            </div>

            <div style={s("display:flex;gap:12px;")}>
              <button
                className="ah-btn"
                onClick={() => navigate(`/alumno/actividad/${actividad.id}`)}
                style={s("background:#fff;border:1px solid #D6DEE7;border-radius:12px;padding:15px 24px;font:700 15px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={confirmReserva}
                style={s(
                  "flex:1;background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:15px;font:700 15.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(15,184,169,.3);display:flex;align-items:center;justify-content:center;gap:9px;",
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                  <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Confirmar preinscripción
              </button>
            </div>
          </>
        ) : (
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:44px 30px;text-align:center;")}>
            <span
              style={s(
                "display:inline-flex;width:64px;height:64px;border-radius:99px;background:#E7F8F5;align-items:center;justify-content:center;margin-bottom:18px;",
              )}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.4}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h1 style={s("font:700 24px Space Grotesk,sans-serif;color:#0E2A47;margin:0 0 8px;")}>¡Preinscripción confirmada!</h1>
            <p style={s("font-size:14.5px;color:#65788C;margin:0 0 26px;max-width:420px;margin-inline:auto;")}>
              Marcamos tu interés en <strong>{actividad.nombre}</strong> del {formatFecha(clase.fechaHora)}. Te avisaremos cuando
              falten 4 días para que puedas inscribirte y pagar tu lugar.
            </p>
            <button
              className="ah-btn"
              onClick={() => navigate("/alumno/mis-clases")}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:14px 26px;font:700 15px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Ver mis clases
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const bg = done ? "#0FB8A9" : active ? "#FF6A2B" : "#E8EDF2";
  const fg = done || active ? "#fff" : "#90A1B2";
  return (
    <div style={s("display:flex;align-items:center;gap:9px;")}>
      <span
        style={s(
          `width:28px;height:28px;border-radius:99px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk,sans-serif;`,
        )}
      >
        {done ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          n
        )}
      </span>
      <span style={s(`font:700 13.5px Manrope,sans-serif;color:${active || done ? "#0E2A47" : "#90A1B2"};`)}>{label}</span>
    </div>
  );
}

function InfoTile({
  bg,
  stroke,
  label,
  value,
  children,
}: {
  bg: string;
  stroke: string;
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div style={s("display:flex;align-items:center;gap:11px;")}>
      <span style={s(`width:38px;height:38px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;flex:none;`)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2}>
          {children}
        </svg>
      </span>
      <div>
        <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>{label}</div>
        <div style={s("font:700 14.5px Manrope,sans-serif;color:#0E2A47;")}>{value}</div>
      </div>
    </div>
  );
}
