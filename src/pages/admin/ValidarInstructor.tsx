import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { formatFecha } from "../../lib/mockData";

export default function AdminValidarInstructor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { users, updateUsuario } = useAuth();
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState(false);

  const instructor = users.find((u) => u.id === id && u.rol === "INSTRUCTOR");
  const goGestion = () => navigate("/admin/gestion/instructores");

  if (!instructor || !instructor.perfilInstructor) {
    return (
      <DashLayout role="admin" active="gestionadmin">
        <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
          <span className="ah-link" onClick={goGestion} style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;width:fit-content;")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver a Gestión
          </span>
        </div>
        <div style={s("padding:60px 32px;text-align:center;color:#65788C;font:600 14px Manrope,sans-serif;")}>
          No se encontró un instructor con ese identificador.
        </div>
      </DashLayout>
    );
  }

  const perfil = instructor.perfilInstructor;
  const nombreCompleto = `${instructor.nombre} ${instructor.apellido}`;
  const badgeType = perfil.estadoVerificacion === "APROBADO" ? "validado" : perfil.estadoVerificacion === "RECHAZADO" ? "rechazado" : "revision";

  const datos: { label: string; value: string }[] = [
    { label: "Nombre completo", value: nombreCompleto },
    { label: "Correo electrónico", value: instructor.email },
    { label: "Teléfono", value: instructor.telefono ?? "—" },
    { label: "Fecha de nacimiento", value: instructor.fechaNacimiento ? formatFecha(instructor.fechaNacimiento) : "—" },
    { label: "Especialidad declarada", value: perfil.especialidad },
    { label: "Años de experiencia", value: perfil.aniosExperiencia != null ? `${perfil.aniosExperiencia} años` : "—" },
  ];

  const docs = [
    { name: "DNI (frente y dorso).pdf", meta: "Subido · 1.4 MB" },
    { name: "Certificado de antecedentes.pdf", meta: "Subido · 820 KB" },
    { name: `Título o certificación — ${perfil.especialidad}.pdf`, meta: "Subido · 2.1 MB" },
  ];

  const aprobar = () => {
    updateUsuario(instructor.id, { perfilInstructor: { ...perfil, estadoVerificacion: "APROBADO", motivoRechazo: undefined } });
    goGestion();
  };

  const confirmarRechazo = () => {
    updateUsuario(instructor.id, { perfilInstructor: { ...perfil, estadoVerificacion: "RECHAZADO", motivoRechazo: motivoRechazo.trim() || undefined } });
    goGestion();
  };

  return (
    <DashLayout role="admin" active="gestionadmin">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <span className="ah-link" onClick={goGestion} style={s("display:flex;align-items:center;gap:7px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a Gestión
        </span>
      </div>

      <div style={s("max-width:880px;margin:0 auto;padding:26px 32px 50px;")}>
        <div
          style={s(
            "display:flex;align-items:flex-start;gap:18px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;margin-bottom:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
          )}
        >
          <span
            style={s(
              "width:62px;height:62px;border-radius:99px;flex:none;background:#E7F8F5;color:#0C8576;display:flex;align-items:center;justify-content:center;font:700 24px Space Grotesk,sans-serif;",
            )}
          >
            {instructor.nombre.charAt(0).toUpperCase()}
          </span>
          <div style={s("flex:1;")}>
            <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:5px;flex-wrap:wrap;")}>
              <h1 style={s("font:700 24px Space Grotesk,sans-serif;margin:0;")}>{nombreCompleto}</h1>
              <StatusBadge type={badgeType} />
            </div>
            <div style={s("font-size:13.5px;color:#65788C;font-weight:600;")}>
              {instructor.email} · {instructor.telefono ?? "sin teléfono"}
            </div>
            <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-top:4px;")}>
              Solicitud enviada el {formatFecha(instructor.createdAt)} · Especialidad declarada: {perfil.especialidad}
            </div>
            {perfil.estadoVerificacion === "RECHAZADO" && perfil.motivoRechazo && (
              <div style={s("margin-top:8px;font-size:12.5px;color:#BE3A3E;font-weight:700;")}>Motivo de rechazo: {perfil.motivoRechazo}</div>
            )}
          </div>
        </div>

        <div className="ah-grid-side" style={s("display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:start;")}>
          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("padding:16px 20px;border-bottom:1px solid #EEF2F6;font:700 15px Space Grotesk,sans-serif;")}>Datos personales</div>
            <div className="ah-grid-2" style={s("padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;")}>
              {datos.map((d) => (
                <div key={d.label}>
                  <div style={s("font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;")}>
                    {d.label}
                  </div>
                  <div style={s("font:600 14.5px Manrope,sans-serif;color:#0E2A47;")}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
            <div style={s("padding:16px 20px;border-bottom:1px solid #EEF2F6;font:700 15px Space Grotesk,sans-serif;")}>Documentación adjunta</div>
            <div style={s("padding:14px 20px;display:flex;flex-direction:column;gap:10px;")}>
              {docs.map((doc) => (
                <div key={doc.name} style={s("display:flex;align-items:center;gap:11px;border:1px solid #E7EDF3;border-radius:11px;padding:11px 13px;")}>
                  <span style={s("width:34px;height:34px;border-radius:9px;background:#EEF4FB;display:flex;align-items:center;justify-content:center;flex:none;")}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </span>
                  <div style={s("flex:1;min-width:0;")}>
                    <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{doc.name}</div>
                    <div style={s("font-size:11.5px;color:#90A1B2;font-weight:600;")}>{doc.meta}</div>
                  </div>
                  <span className="ah-link" title="Vista previa no disponible en este demo" style={s("font:700 12px Manrope,sans-serif;color:#2D5BC8;cursor:pointer;flex:none;")}>
                    Ver
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px 22px;margin-top:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          {perfil.estadoVerificacion !== "PENDIENTE" ? (
            <>
              <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Solicitud ya procesada</div>
              <p style={s("font-size:13.5px;color:#7A8C9E;margin:0;line-height:1.5;")}>
                Esta solicitud fue {perfil.estadoVerificacion === "APROBADO" ? "aprobada" : "rechazada"}. Podés volver a cambiar su estado desde acá si fue un error.
              </p>
              <div style={s("display:flex;gap:11px;margin-top:16px;")}>
                {perfil.estadoVerificacion !== "APROBADO" && (
                  <button
                    className="ah-btn"
                    onClick={aprobar}
                    style={s(
                      "flex:1;background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:14px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
                    )}
                  >
                    Aceptar instructor
                  </button>
                )}
                {perfil.estadoVerificacion !== "RECHAZADO" && (
                  <button
                    className="ah-btn"
                    onClick={() => setShowRechazo(true)}
                    style={s(
                      "flex:1;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;border-radius:12px;padding:14px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
                    )}
                  >
                    Rechazar solicitud
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Decisión sobre la solicitud</div>
              <p style={s("font-size:13.5px;color:#7A8C9E;margin:0 0 16px;line-height:1.5;")}>
                Revisá los datos y la documentación. Si aprobás, el instructor podrá publicar actividades. Si rechazás, podés indicar el motivo.
              </p>
              {showRechazo && (
                <div style={s("margin-bottom:14px;")}>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Motivo del rechazo (opcional)"
                    rows={3}
                    style={s("width:100%;border:1px solid #E2E9F0;border-radius:11px;padding:11px 13px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;resize:vertical;")}
                  />
                </div>
              )}
              <div style={s("display:flex;gap:11px;")}>
                <button
                  className="ah-btn"
                  onClick={aprobar}
                  style={s(
                    "flex:1;background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:14px;font:700 14.5px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 18px rgba(15,184,169,.28);",
                  )}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Aceptar instructor
                </button>
                <button
                  className="ah-btn"
                  onClick={() => (showRechazo ? confirmarRechazo() : setShowRechazo(true))}
                  style={s(
                    "flex:1;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;border-radius:12px;padding:14px;font:700 14.5px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;",
                  )}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2.4}>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  {showRechazo ? "Confirmar rechazo" : "Rechazar solicitud"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashLayout>
  );
}
