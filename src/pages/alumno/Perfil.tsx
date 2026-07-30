import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha, INTERESES } from "../../lib/mockData";
import { inscripcionStatusType } from "../../lib/status";
import type { Actividad, Clase, Inscripcion } from "../../lib/types";

interface HistorialItem {
  inscripcion: Inscripcion;
  clase: Clase;
  actividad: Actividad;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatMesAnio(iso: string): string {
  const d = new Date(iso);
  return `${MESES[d.getMonth()]}. ${d.getFullYear()}`;
}

function formatDDMMYYYY(iso?: string): string {
  if (!iso) return "No especificada";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AlumnoPerfil() {
  const navigate = useNavigate();
  const { currentUser, updateUsuario, logout } = useAuth();
  const { inscripciones, clases, actividades, resenias, denuncias } = useData();

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(currentUser?.nombre ?? "");
  const [apellido, setApellido] = useState(currentUser?.apellido ?? "");
  const [telefono, setTelefono] = useState(currentUser?.telefono ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(currentUser?.fechaNacimiento ?? "");
  const [notifs, setNotifs] = useState([
    { label: "Nuevas clases disponibles", on: true },
    { label: "Recordatorios antes de la clase", on: true },
    { label: "Promociones y novedades", on: false },
    { label: "Respuestas a tus reseñas", on: true },
  ]);

  const intereses = currentUser?.perfilAlumno?.intereses ?? [];
  const disponiblesParaAgregar = INTERESES.filter((i) => !intereses.includes(i));

  const historial = useMemo(() => {
    if (!currentUser) return [] as HistorialItem[];
    const rows: HistorialItem[] = [];
    for (const i of inscripciones) {
      if (i.alumnoId !== currentUser.id) continue;
      const clase = clases.find((c) => c.id === i.claseId);
      if (!clase) continue;
      const actividad = actividades.find((a) => a.id === clase.actividadId);
      if (!actividad) continue;
      rows.push({ inscripcion: i, clase, actividad });
    }
    rows.sort((a, b) => b.clase.fechaHora.localeCompare(a.clase.fechaHora));
    return rows.slice(0, 4);
  }, [inscripciones, clases, actividades, currentUser]);

  const misResenias = currentUser ? resenias.filter((r) => r.alumnoId === currentUser.id) : [];
  const reseniasPendientes = useMemo(() => {
    if (!currentUser) return 0;
    let n = 0;
    for (const i of inscripciones) {
      if (i.alumnoId !== currentUser.id || i.estado !== "Inscripto") continue;
      const clase = clases.find((c) => c.id === i.claseId);
      if (!clase || clase.estado !== "Finalizada") continue;
      if (!resenias.some((r) => r.claseId === i.claseId && r.alumnoId === currentUser.id)) n++;
    }
    return n;
  }, [inscripciones, clases, resenias, currentUser]);

  const misDenuncias = currentUser ? denuncias.filter((d) => d.alumnoId === currentUser.id) : [];
  const denunciasPendientes = misDenuncias.filter((d) => d.estado === "Pendiente").length;
  const denunciasAuditoria = misDenuncias.filter((d) => d.estado === "En Auditoría").length;

  if (!currentUser) return null;

  const guardarEdicion = () => {
    updateUsuario(currentUser.id, { nombre, apellido, telefono, fechaNacimiento });
    setEditando(false);
  };

  const cancelarEdicion = () => {
    setNombre(currentUser.nombre);
    setApellido(currentUser.apellido);
    setTelefono(currentUser.telefono ?? "");
    setFechaNacimiento(currentUser.fechaNacimiento ?? "");
    setEditando(false);
  };

  const quitarInteres = (i: string) => {
    updateUsuario(currentUser.id, {
      perfilAlumno: { usuarioId: currentUser.id, intereses: intereses.filter((x) => x !== i) },
    });
  };

  const agregarInteres = (i: string) => {
    updateUsuario(currentUser.id, {
      perfilAlumno: { usuarioId: currentUser.id, intereses: [...intereses, i] },
    });
  };

  const cerrarSesion = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="home" />
      <div style={s("max-width:1000px;margin:0 auto;padding:30px 28px 60px;")}>
        <div
          style={s(
            "background:linear-gradient(135deg,#0E2A47,#143A5E);border-radius:22px;padding:28px 32px;display:flex;align-items:center;gap:22px;margin-bottom:26px;position:relative;overflow:hidden;flex-wrap:wrap;",
          )}
        >
          <div style={s("position:absolute;top:-60px;right:-20px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(18,181,165,.26),transparent 70%);")} />
          <span
            style={s(
              "width:84px;height:84px;border-radius:99px;background:linear-gradient(140deg,#12B5A5,#FF6A2B);display:flex;align-items:center;justify-content:center;color:#fff;font:700 34px Space Grotesk,sans-serif;flex:none;position:relative;",
            )}
          >
            {currentUser.nombre.charAt(0)}
          </span>
          <div style={s("position:relative;flex:1;min-width:200px;")}>
            <h1 style={s("font:700 26px Space Grotesk,sans-serif;color:#fff;margin:0 0 5px;")}>
              {currentUser.nombre} {currentUser.apellido}
            </h1>
            <div style={s("display:flex;flex-wrap:wrap;gap:16px;font-size:13.5px;color:#9DB3C9;font-weight:600;")}>
              <span style={s("display:flex;align-items:center;gap:6px;")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                {currentUser.email}
              </span>
              <span style={s("display:flex;align-items:center;gap:6px;")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Miembro desde {formatMesAnio(currentUser.createdAt)}
              </span>
            </div>
          </div>
          <div style={s("position:relative;display:flex;gap:10px;")}>
            <button
              className="ah-btn"
              onClick={cerrarSesion}
              style={s(
                "background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 18px;font:700 14px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Cerrar sesión
            </button>
            <button
              className="ah-btn"
              onClick={() => (editando ? cancelarEdicion() : setEditando(true))}
              style={s(
                "background:#fff;color:#0E2A47;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
              </svg>
              {editando ? "Cancelar edición" : "Editar perfil"}
            </button>
          </div>
        </div>

        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;")}>
          <QuickLink
            onClick={() => navigate("/alumno/mis-pagos")}
            bg="#FFF3E0"
            stroke="#B9741A"
            title="Mis pagos"
            caption="Historial y comprobantes"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </QuickLink>
          <QuickLink
            onClick={() => navigate("/alumno/mis-resenas")}
            bg="#FFF4EE"
            stroke="#FF6A2B"
            title="Mis reseñas"
            caption={`${misResenias.length} hechas · ${reseniasPendientes} pendientes`}
          >
            <path d="M11.5 3.5 13.8 8l5 .7-3.6 3.5.9 5L11.5 15l-4.5 2.4.9-5L4.3 8.7l5-.7z" />
          </QuickLink>
          <QuickLink
            onClick={() => navigate("/alumno/mis-denuncias")}
            bg="#FBEAEB"
            stroke="#BE3A3E"
            title="Mis denuncias"
            caption={`${denunciasPendientes} pendiente · ${denunciasAuditoria} en auditoría`}
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </QuickLink>
        </div>

        <div className="ah-grid-2" style={s("display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;")}>
          <div style={s("display:flex;flex-direction:column;gap:20px;")}>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:18px;")}>Datos personales</div>
              {!editando ? (
                <div style={s("display:flex;flex-direction:column;gap:14px;")}>
                  <DataRow label="Nombre completo" value={`${currentUser.nombre} ${currentUser.apellido}`} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Teléfono" value={currentUser.telefono || "No especificado"} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Fecha de nacimiento" value={formatDDMMYYYY(currentUser.fechaNacimiento)} />
                  <div style={s("height:1px;background:#EEF2F6;")} />
                  <DataRow label="Email" value={currentUser.email} />
                </div>
              ) : (
                <div style={s("display:flex;flex-direction:column;gap:12px;")}>
                  <Field label="Nombre" value={nombre} onChange={setNombre} />
                  <Field label="Apellido" value={apellido} onChange={setApellido} />
                  <Field label="Teléfono" value={telefono} onChange={setTelefono} />
                  <Field label="Fecha de nacimiento" value={fechaNacimiento} onChange={setFechaNacimiento} type="date" />
                  <div style={s("display:flex;gap:10px;margin-top:6px;")}>
                    <button
                      className="ah-btn"
                      onClick={cancelarEdicion}
                      style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                    >
                      Cancelar
                    </button>
                    <button
                      className="ah-btn"
                      onClick={guardarEdicion}
                      style={s("flex:1;background:#FF6A2B;border:none;border-radius:11px;padding:11px;font:700 13.5px Manrope,sans-serif;color:#fff;cursor:pointer;")}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Intereses deportivos</div>
              <p style={s("font-size:13px;color:#8194A8;margin:0 0 14px;")}>Usamos esto para tus recomendaciones.</p>
              <div style={s("display:flex;flex-wrap:wrap;gap:9px;")}>
                {intereses.map((i) => (
                  <span
                    key={i}
                    onClick={() => quitarInteres(i)}
                    className="ah-btn"
                    style={s(
                      "cursor:pointer;padding:8px 15px;border-radius:999px;font:700 13.5px Manrope,sans-serif;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;display:flex;align-items:center;gap:6px;",
                    )}
                    title="Quitar interés"
                  >
                    {i}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={3}>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                ))}
                {disponiblesParaAgregar.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && agregarInteres(e.target.value)}
                    style={s(
                      "padding:8px 12px;border-radius:999px;font:700 13px Manrope,sans-serif;background:#fff;color:#65788C;border:1px dashed #C9D5E1;cursor:pointer;",
                    )}
                  >
                    <option value="">+ Agregar interés</option>
                    {disponiblesParaAgregar.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div style={s("display:flex;flex-direction:column;gap:20px;")}>
            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:16px;")}>Historial de actividades</div>
              {historial.length === 0 ? (
                <p style={s("font-size:13.5px;color:#9AAABA;font-weight:600;margin:0;")}>Todavía no tenés clases registradas.</p>
              ) : (
                <div style={s("display:flex;flex-direction:column;gap:13px;")}>
                  {historial.map(({ inscripcion, clase, actividad }) => (
                    <div key={inscripcion.id} style={s("display:flex;align-items:center;gap:12px;")}>
                      <span style={s(`width:36px;height:36px;border-radius:10px;background:${actividad.photoTint};flex:none;`)} />
                      <div style={s("flex:1;")}>
                        <div style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{actividad.nombre}</div>
                        <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{formatFecha(clase.fechaHora)}</div>
                      </div>
                      <StatusBadge type={inscripcionStatusType(inscripcion.estado)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font:700 16px Space Grotesk,sans-serif;margin-bottom:6px;")}>Notificaciones</div>
              <p style={s("font-size:13px;color:#8194A8;margin:0 0 16px;")}>Elegí sobre qué querés que te avisemos.</p>
              <div style={s("display:flex;flex-direction:column;gap:15px;")}>
                {notifs.map((n, idx) => (
                  <div key={n.label} style={s("display:flex;align-items:center;justify-content:space-between;gap:12px;")}>
                    <span style={s("font-size:14px;color:#41566B;font-weight:600;")}>{n.label}</span>
                    <span
                      onClick={() => setNotifs((prev) => prev.map((x, i) => (i === idx ? { ...x, on: !x.on } : x)))}
                      style={s(
                        `width:42px;height:24px;border-radius:99px;background:${n.on ? "#12B5A5" : "#D8E0E7"};position:relative;flex:none;cursor:pointer;transition:background .2s;`,
                      )}
                    >
                      <span
                        style={s(
                          `position:absolute;top:3px;left:${n.on ? "21px" : "3px"};width:18px;height:18px;border-radius:99px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s;`,
                        )}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  onClick,
  bg,
  stroke,
  title,
  caption,
  children,
}: {
  onClick: () => void;
  bg: string;
  stroke: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="ah-hov"
      style={s(
        "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
      )}
    >
      <span style={s(`width:44px;height:44px;border-radius:12px;background:${bg};display:flex;align-items:center;justify-content:center;flex:none;`)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2}>
          {children}
        </svg>
      </span>
      <div style={s("flex:1;")}>
        <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{title}</div>
        <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{caption}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2CCD6" strokeWidth={2}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={s("display:flex;justify-content:space-between;align-items:center;")}>
      <span style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;")}>{label}</span>
      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={s("display:flex;flex-direction:column;gap:6px;")}>
      <span style={s("font-size:12.5px;color:#7A8C9E;font-weight:700;")}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={s("border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
      />
    </label>
  );
}
