import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";

/**
 * Simplification note: the prototype renders this screen with its own
 * standalone top bar (logo + "Cerrar sesión", no sidebar) since an
 * unverified instructor can't use the rest of the dashboard yet. The shared
 * DashLayout shell (sidebar + logout already built in) is used instead, per
 * the instruction to keep that shell consistent across every instructor
 * screen — the sidebar's own "Cerrar sesión" link covers the same need.
 */
export default function InstructorSolicitud() {
  const { currentUser, updateUsuario } = useAuth();
  const navigate = useNavigate();

  const estado = currentUser?.perfilInstructor?.estadoVerificacion;

  useEffect(() => {
    if (currentUser && estado === "APROBADO") {
      navigate("/instructor", { replace: true });
    }
  }, [currentUser, estado, navigate]);

  if (!currentUser || !currentUser.perfilInstructor || estado === "APROBADO") return null;

  const isRechazada = estado === "RECHAZADO";
  const perfil = currentUser.perfilInstructor;

  const solBd = isRechazada ? "#F3D2D3" : "#F6E2C0";
  const solTint = isRechazada ? "#FBEAEB" : "#FFF3E0";
  const solFg = isRechazada ? "#BE3A3E" : "#B9741A";
  const solBadge = isRechazada ? "Rechazada" : "En revisión";
  const solTitle = isRechazada ? "Tu solicitud fue rechazada" : "Tu solicitud está en revisión";
  const solText = isRechazada
    ? "No pudimos validar tu perfil de instructor con los datos enviados. Revisá el motivo más abajo, actualizá lo que haga falta y volvé a postularte."
    : "Nuestro equipo está revisando tus datos y certificaciones como instructor. Te avisaremos por correo apenas se apruebe tu cuenta — normalmente lleva entre 24 y 72 horas.";

  const solDatos: { label: string; value: string }[] = [
    { label: "Nombre completo", value: `${currentUser.nombre} ${currentUser.apellido}` },
    { label: "Correo electrónico", value: currentUser.email },
    { label: "Teléfono", value: currentUser.telefono ?? "—" },
    { label: "Fecha de nacimiento", value: currentUser.fechaNacimiento ?? "—" },
    { label: "Especialidad", value: perfil.especialidad || "—" },
    { label: "Años de experiencia", value: perfil.aniosExperiencia != null ? String(perfil.aniosExperiencia) : "—" },
  ];

  const volverAPostularme = () => {
    updateUsuario(currentUser.id, {
      perfilInstructor: { ...perfil, estadoVerificacion: "PENDIENTE", motivoRechazo: undefined },
    });
  };

  return (
    <DashLayout role="instructor" active="instructor">
      <div style={s("max-width:680px;margin:0 auto;padding:44px 28px 60px;")}>
        <div
          style={s(
            `background:#fff;border:1px solid ${solBd};border-radius:20px;padding:32px;text-align:center;box-shadow:0 1px 2px rgba(14,42,71,.04);margin-bottom:22px;`,
          )}
        >
          <div
            style={s(
              `width:78px;height:78px;border-radius:99px;background:${solTint};display:flex;align-items:center;justify-content:center;margin:0 auto 18px;`,
            )}
          >
            {isRechazada ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={solFg} strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            ) : (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={solFg} strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            )}
          </div>
          <span
            style={s(
              `display:inline-block;background:${solTint};color:${solFg};border:1px solid ${solBd};padding:6px 14px;border-radius:99px;font:700 12.5px Manrope;margin-bottom:14px;`,
            )}
          >
            Estado de solicitud: {solBadge}
          </span>
          <h1 style={s("font:700 26px Space Grotesk;letter-spacing:-.5px;margin:0 0 10px;color:#0E2A47;")}>{solTitle}</h1>
          <p style={s("font-size:14.5px;line-height:1.6;color:#65788C;margin:0 auto;max-width:460px;")}>{solText}</p>
          {isRechazada && (
            <div
              style={s(
                "margin-top:18px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:13px 16px;text-align:left;display:flex;gap:11px;align-items:flex-start;",
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2} style={{ flex: "none", marginTop: 1 }}>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <span style={s("font-size:13.5px;line-height:1.5;color:#BE3A3E;font-weight:600;")}>
                Motivo:{" "}
                {perfil.motivoRechazo ||
                  "la documentación de certificación adjunta no pudo ser validada. Podés actualizar tus datos y volver a postularte."}
              </span>
            </div>
          )}
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:20px 24px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;gap:11px;")}>
            <span style={s("width:38px;height:38px;border-radius:10px;background:#EEF4FB;display:flex;align-items:center;justify-content:center;flex:none;")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
              </svg>
            </span>
            <div>
              <div style={s("font:700 16px Space Grotesk;color:#0E2A47;")}>Mis datos personales</div>
              <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>
                Mientras tu solicitud no esté aprobada, solo podés ver y editar tus datos.
              </div>
            </div>
          </div>
          <div className="ah-grid-2" style={s("padding:22px 24px;display:grid;grid-template-columns:1fr 1fr;gap:18px;")}>
            {solDatos.map((d) => (
              <div key={d.label}>
                <div style={s("font:700 11.5px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;")}>
                  {d.label}
                </div>
                <div style={s("font:600 15px Manrope;color:#0E2A47;")}>{d.value}</div>
              </div>
            ))}
          </div>
          <div style={s("padding:0 24px 22px;display:flex;gap:11px;flex-wrap:wrap;")}>
            <button
              className="ah-btn"
              style={s(
                "background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px 20px;font:700 14px Manrope;color:#41566B;cursor:pointer;display:flex;align-items:center;gap:8px;",
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Editar mis datos
            </button>
            {isRechazada && (
              <button
                className="ah-btn"
                onClick={volverAPostularme}
                style={s(
                  "background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:12px 20px;font:700 14px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.26);",
                )}
              >
                Volver a postularme
              </button>
            )}
          </div>
        </div>
      </div>
    </DashLayout>
  );
}
