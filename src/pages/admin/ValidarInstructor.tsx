import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { ClaseInstructorAdmin, DocumentoInstructor, InstructorAdmin } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha, formatHora } from "../../lib/mockData";
import { claseStatusType } from "../../lib/status";
import type { EstadoClase } from "../../lib/types";

const ESTADOS_CLASE: EstadoClase[] = ["Programada", "Habilitada", "Cancelada", "Finalizada"];

function formatTamanioDoc(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function AdminValidarInstructor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    obtenerInstructor,
    aprobarInstructor,
    rechazarInstructor,
    listarClasesInstructor,
    listarDocumentosInstructor,
    verDocumentoInstructor,
  } = useData();
  const [instructor, setInstructor] = useState<InstructorAdmin | null | undefined>(undefined);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [clases, setClases] = useState<ClaseInstructorAdmin[]>([]);
  const [errorClases, setErrorClases] = useState<string | null>(null);
  const [queryClases, setQueryClases] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoClase | "todos">("todos");
  const [ordenFecha, setOrdenFecha] = useState<"asc" | "desc">("asc");
  const [documentos, setDocumentos] = useState<DocumentoInstructor[]>([]);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const [abriendoDocumentoId, setAbriendoDocumentoId] = useState<string | null>(null);

  const goGestion = () => navigate("/admin/gestion/instructores");

  const cargar = () => {
    if (!id) return;
    obtenerInstructor(id)
      .then(setInstructor)
      .catch(() => setInstructor(null));
    listarClasesInstructor(id)
      .then(setClases)
      .catch((err) => setErrorClases(err instanceof ApiError ? err.message : "No pudimos cargar las clases."));
    listarDocumentosInstructor(id)
      .then(setDocumentos)
      .catch((err) => setErrorDocumentos(err instanceof ApiError ? err.message : "No pudimos cargar los documentos."));
  };

  useEffect(cargar, [id]);

  const verDocumento = async (documentoId: string) => {
    if (!id) return;
    setAbriendoDocumentoId(documentoId);
    try {
      await verDocumentoInstructor(id, documentoId);
    } catch (err) {
      setErrorDocumentos(err instanceof ApiError ? err.message : "No pudimos abrir el documento.");
    } finally {
      setAbriendoDocumentoId(null);
    }
  };

  const clasesFiltradas = useMemo(() => {
    const q = queryClases.trim().toLowerCase();
    const filtradas = clases.filter((c) => {
      const coincideQuery = !q || c.actividadNombre.toLowerCase().includes(q);
      const coincideEstado = estadoFiltro === "todos" || c.estado === estadoFiltro;
      return coincideQuery && coincideEstado;
    });
    return [...filtradas].sort((a, b) => {
      const diff = new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      return ordenFecha === "asc" ? diff : -diff;
    });
  }, [clases, queryClases, estadoFiltro, ordenFecha]);

  if (instructor === undefined) return null;

  if (!instructor) {
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

  const nombreCompleto = `${instructor.nombre} ${instructor.apellido}`;
  const badgeType = instructor.estadoVerificacion === "APROBADO" ? "validado" : instructor.estadoVerificacion === "RECHAZADO" ? "rechazado" : "revision";

  const datos: { label: string; value: string }[] = [
    { label: "Nombre completo", value: nombreCompleto },
    { label: "Correo electrónico", value: instructor.email },
    { label: "Teléfono", value: instructor.telefono ?? "—" },
    { label: "Fecha de nacimiento", value: instructor.fechaNacimiento ? formatFecha(instructor.fechaNacimiento) : "—" },
    { label: "Especialidad declarada", value: instructor.especialidad },
    { label: "Años de experiencia", value: instructor.aniosExperiencia != null ? `${instructor.aniosExperiencia} años` : "—" },
  ];


  const aprobar = async () => {
    setError(null);
    setEnviando(true);
    try {
      await aprobarInstructor(instructor.id);
      goGestion();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos aprobar al instructor.");
      setEnviando(false);
    }
  };

  const confirmarRechazo = async () => {
    setError(null);
    setEnviando(true);
    try {
      await rechazarInstructor(instructor.id, motivoRechazo.trim() || undefined);
      goGestion();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos rechazar la solicitud.");
      setEnviando(false);
    }
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
              Solicitud enviada el {formatFecha(instructor.createdAt)} · Especialidad declarada: {instructor.especialidad}
            </div>
            {instructor.estadoVerificacion === "RECHAZADO" && instructor.motivoRechazo && (
              <div style={s("margin-top:8px;font-size:12.5px;color:#BE3A3E;font-weight:700;")}>Motivo de rechazo: {instructor.motivoRechazo}</div>
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
            {errorDocumentos && (
              <div style={s("padding:12px 20px;font-size:12.5px;color:#BE3A3E;font-weight:600;")}>{errorDocumentos}</div>
            )}
            <div style={s("padding:14px 20px;display:flex;flex-direction:column;gap:10px;")}>
              {documentos.length === 0 && !errorDocumentos && (
                <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>
                  El instructor todavía no subió documentación.
                </div>
              )}
              {documentos.map((doc) => (
                <div key={doc.id} style={s("display:flex;align-items:center;gap:11px;border:1px solid #E7EDF3;border-radius:11px;padding:11px 13px;")}>
                  <span style={s("width:34px;height:34px;border-radius:9px;background:#EEF4FB;display:flex;align-items:center;justify-content:center;flex:none;")}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </span>
                  <div style={s("flex:1;min-width:0;")}>
                    <div style={s("font:700 13px Manrope,sans-serif;color:#0E2A47;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{doc.nombreArchivo}</div>
                    <div style={s("font-size:11.5px;color:#90A1B2;font-weight:600;")}>
                      Subido {formatFecha(doc.createdAt)} · {formatTamanioDoc(doc.tamanioBytes)}
                    </div>
                  </div>
                  <span
                    className="ah-link"
                    onClick={() => verDocumento(doc.id)}
                    style={s(
                      `font:700 12px Manrope,sans-serif;color:${abriendoDocumentoId === doc.id ? "#90A1B2" : "#2D5BC8"};cursor:pointer;flex:none;`,
                    )}
                  >
                    {abriendoDocumentoId === doc.id ? "Abriendo…" : "Ver"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;margin-top:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:16px 20px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;")}>
            <div style={s("font:700 15px Space Grotesk,sans-serif;")}>Clases del instructor</div>
            <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
              <div
                style={s(
                  "display:flex;align-items:center;gap:9px;background:#F7FAFC;border:1px solid #E2E9F0;border-radius:11px;padding:9px 13px;min-width:200px;",
                )}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={queryClases}
                  onChange={(e) => setQueryClases(e.target.value)}
                  placeholder="Buscar por actividad…"
                  style={s("border:none;outline:none;background:transparent;font:600 13px Manrope,sans-serif;color:#0E2A47;width:100%;")}
                />
              </div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoClase | "todos")}
                style={s(
                  "background:#F7FAFC;border:1px solid #E2E9F0;border-radius:11px;padding:9px 13px;font:600 13px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
                )}
              >
                <option value="todos">Todos los estados</option>
                {ESTADOS_CLASE.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ah-btn"
                onClick={() => setOrdenFecha((prev) => (prev === "asc" ? "desc" : "asc"))}
                title={ordenFecha === "asc" ? "Más antiguas primero" : "Más nuevas primero"}
                style={s(
                  "display:flex;align-items:center;gap:7px;background:#F7FAFC;border:1px solid #E2E9F0;border-radius:11px;padding:9px 13px;font:600 13px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#65788C" strokeWidth={2}>
                  {ordenFecha === "asc" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
                </svg>
                Fecha
              </button>
            </div>
          </div>
          {errorClases && (
            <div style={s("padding:13px 20px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
              <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{errorClases}</span>
            </div>
          )}
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:620px;")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.6fr 1.2fr 1fr 1fr;padding:10px 20px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Actividad</span>
                <span>Fecha y hora</span>
                <span>Estado</span>
                <span>Cupos</span>
              </div>
              {clasesFiltradas.map((c) => (
                <div
                  key={c.claseId}
                  style={s("display:grid;grid-template-columns:1.6fr 1.2fr 1fr 1fr;padding:12px 20px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                >
                  <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>{c.actividadNombre}</span>
                  <span style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>
                    {formatFecha(c.fechaHora)} · {formatHora(c.fechaHora)}
                  </span>
                  <StatusBadge type={claseStatusType(c.estado)} />
                  <span style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>
                    {c.cuposOcupados}/{c.cuposMax}
                  </span>
                </div>
              ))}
              {clasesFiltradas.length === 0 && (
                <div style={s("padding:30px 20px;text-align:center;color:#90A1B2;font:600 13px Manrope,sans-serif;")}>
                  {clases.length === 0 ? "Este instructor todavía no tiene clases." : "Sin resultados."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px 22px;margin-top:18px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          {instructor.estadoVerificacion !== "PENDIENTE" ? (
            <>
              <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Solicitud ya procesada</div>
              <p style={s("font-size:13.5px;color:#7A8C9E;margin:0;line-height:1.5;")}>
                Esta solicitud fue {instructor.estadoVerificacion === "APROBADO" ? "aprobada" : "rechazada"}. Podés volver a cambiar su estado desde acá si fue un error.
              </p>
              <div style={s("display:flex;gap:11px;margin-top:16px;")}>
                {instructor.estadoVerificacion !== "APROBADO" && (
                  <button
                    className="ah-btn"
                    onClick={aprobar}
                    disabled={enviando}
                    style={s(
                      "flex:1;background:#0FB8A9;color:#fff;border:none;border-radius:12px;padding:14px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
                    )}
                  >
                    Aceptar instructor
                  </button>
                )}
                {instructor.estadoVerificacion !== "RECHAZADO" && (
                  <button
                    className="ah-btn"
                    onClick={() => setShowRechazo(true)}
                    disabled={enviando}
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
                  disabled={enviando}
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
                  disabled={enviando}
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
