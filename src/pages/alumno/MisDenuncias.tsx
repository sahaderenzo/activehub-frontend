import { useCallback, useEffect, useState } from "react";
import AlumnoNav from "../../components/AlumnoNav";
import StatusBadge from "../../components/StatusBadge";
import ErrorReintentar from "../../components/ErrorReintentar";
import { s } from "../../lib/style";
import Modal from "../../components/Modal";
import { useAhora } from "../../lib/ahora";
import { useAuth } from "../../context/AuthContext";
import { siPuede } from "../../lib/cargaParcial";
import { useData } from "../../context/DataContext";
import type { MiDenuncia, MiInscripcion, ResolucionDenuncia } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/mockData";
import { denunciaStatusType } from "../../lib/status";

const ETIQUETA_RESOLUCION: Record<ResolucionDenuncia, string> = {
  REINTEGRAR: "se te reintegró el pago",
  SUSPENDER: "el instructor fue suspendido",
  PENALIZAR: "se le aplicó una penalización al instructor",
  DESESTIMAR: "se desestimó la denuncia",
  OCULTAR_RESENIA: "la reseña fue ocultada",
};

export default function AlumnoMisDenuncias() {
  const ahora = useAhora();
  const { currentUser, puede } = useAuth();
  const { crearDenuncia, listarMisDenuncias, listarMisInscripciones } = useData();
  const [misDenuncias, setMisDenuncias] = useState<MiDenuncia[]>([]);
  const [clasesReportables, setClasesReportables] = useState<MiInscripcion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [claseId, setClaseId] = useState("");
  const [motivo, setMotivo] = useState("");

  const [errorCarga, setErrorCarga] = useState(false);

  // Las clases reportables alimentan el select de "Nueva denuncia": si no cargan, el
  // formulario queda vacío sin decir por qué.
  //
  // Son de módulos distintos: el listado es `denuncias.crear` (el permiso de esta pantalla)
  // y las inscripciones `inscripciones.gestionar`. Sin ese segundo permiso el historial de
  // denuncias se sigue viendo y lo que no se puede es abrir una nueva — que es exactamente
  // lo que corresponde (ver lib/cargaParcial.ts).
  const cargar = useCallback(() => {
    if (!currentUser) return;
    Promise.all([
      listarMisDenuncias(),
      siPuede(puede("inscripciones.gestionar"), () => listarMisInscripciones("Inscripto"), []),
    ])
      .then(([denuncias, inscripcionesAlumno]) => {
        setMisDenuncias(denuncias);
        setClasesReportables(inscripcionesAlumno);
        setError(null);
        setErrorCarga(false);
      })
      .catch(() => setErrorCarga(true));
  }, [currentUser, puede, listarMisDenuncias, listarMisInscripciones]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const enviar = async () => {
    if (!currentUser || !claseId || !motivo.trim()) return;
    setError(null);
    try {
      await crearDenuncia(claseId, motivo.trim());
      setShowForm(false);
      setClaseId("");
      setMotivo("");
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar la denuncia.");
    }
  };

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <AlumnoNav active="misclases" />
      <div style={s("max-width:920px;margin:0 auto;padding:30px 28px 60px;")}>
        <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;")}>
          <div>
            <h1 style={s("font:700 30px Space Grotesk,sans-serif;letter-spacing:-.7px;margin:0 0 4px;")}>Mis denuncias</h1>
            <p style={s("font-size:14.5px;color:#7A8C9E;margin:0;")}>
              Reportes que hiciste sobre clases o instructores. El equipo de ActiveHub los audita y resuelve.
            </p>
          </div>
          <button
            className="ah-btn"
            onClick={() => setShowForm(true)}
            style={s(
              "background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:12px 20px;font:700 14px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva denuncia
          </button>
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

        {errorCarga ? (
          <ErrorReintentar mensaje="No pudimos cargar tus denuncias." onReintentar={cargar} />
        ) : misDenuncias.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:16px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            No hiciste ninguna denuncia todavía.
          </div>
        ) : (
          <div style={s("display:flex;flex-direction:column;gap:14px;")}>
            {misDenuncias.map((d) => (
              <div key={d.id} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
                <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:10px;")}>
                  <span style={s("width:40px;height:40px;border-radius:11px;background:#FBEAEB;display:flex;align-items:center;justify-content:center;flex:none;")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2}>
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                  </span>
                  <div style={s("flex:1;min-width:0;")}>
                    <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{d.actividadNombre}</div>
                    <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{formatFecha(d.createdAt)}</div>
                  </div>
                  <StatusBadge type={denunciaStatusType(d.estado)} />
                </div>
                <p style={s("font-size:14px;line-height:1.55;color:#65788C;margin:0;padding-left:52px;")}>{d.motivo}</p>

                {/* Antes la denuncia pasaba a "Resuelta" y el alumno nunca se enteraba de qué
                    se había decidido (E3A-HU11 criterios 2 y 7). */}
                {d.resolucion && (
                  <div style={s("margin:12px 0 0 52px;background:#F4F7FA;border:1px solid #E2E9F0;border-radius:12px;padding:12px 14px;")}>
                    <div style={s("display:flex;align-items:center;gap:7px;margin-bottom:5px;")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={2.6}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span style={s("font:700 12.5px Manrope,sans-serif;color:#0E2A47;")}>
                        Resolución: {ETIQUETA_RESOLUCION[d.resolucion]}
                      </span>
                    </div>
                    {d.detalle && (
                      <p style={s("font-size:13.5px;line-height:1.55;color:#65788C;margin:0;font-weight:600;")}>{d.detalle}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:460px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:16px;")}>Nueva denuncia</div>
            <label style={s("display:block;font:700 12.5px Manrope,sans-serif;color:#41566B;margin-bottom:7px;")}>Clase</label>
            <select
              value={claseId}
              onChange={(e) => setClaseId(e.target.value)}
              style={s(
                "width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;margin-bottom:16px;background:#fff;",
              )}
            >
              <option value="">Elegí una clase…</option>
              {clasesReportables
                .filter((c) => {
                  const horasDesdeInicio = (ahora - new Date(c.claseFechaHora).getTime()) / (1000 * 60 * 60);
                  const yaDenunciada = misDenuncias.some((d) => d.claseId === c.claseId);
                  return horasDesdeInicio >= 1 && !yaDenunciada;
                })
                .map((c) => (
                  <option key={c.claseId} value={c.claseId}>
                    {c.actividadNombre} · {formatFecha(c.claseFechaHora)}
                  </option>
                ))}
            </select>
            <label style={s("display:block;font:700 12.5px Manrope,sans-serif;color:#41566B;margin-bottom:7px;")}>Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Contanos qué pasó…"
              rows={4}
              style={s(
                "width:100%;border:1px solid #E2E9F0;border-radius:12px;padding:12px 14px;font:500 14px Manrope,sans-serif;color:#0E2A47;resize:vertical;margin-bottom:18px;",
              )}
            />
            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setShowForm(false)}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={enviar}
                disabled={!claseId || !motivo.trim()}
                style={s(
                  `flex:1;background:${claseId && motivo.trim() ? "#BE3A3E" : "#EAC3C4"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:pointer;`,
                )}
              >
                Enviar denuncia
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
