import { useCallback, useEffect, useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { CargandoSeccion } from "../../components/Cargando";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { AccionResolucion, DenunciaAdmin } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { denunciaStatusType } from "../../lib/status";

interface ResolAction {
  key: AccionResolucion;
  label: string;
  icon: string;
  tint: string;
  color: string;
}

const ICON_REINTEGRO = '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>';
const ICON_SUSPENDER = '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>';
const ICON_PENALIZAR = '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>';
const ICON_DESESTIMAR = '<path d="M18 6 6 18M6 6l12 12"/>';

/** Espejo de `VentanaPenalizacion.MINIMO_DIAS_SUSPENSION` del backend (y de `admin/Gestion.tsx`). */
const MIN_DIAS_SUSPENSION = 15;

/** Borrador del modal de suspensión: los días y la multa se escriben como texto y se validan al confirmar. */
interface SuspensionEnCurso {
  denuncia: DenunciaAdmin;
  dias: string;
  monto: string;
}

const ACTIONS: ResolAction[] = [
  { key: "REINTEGRAR", label: "Reintegrar pago", icon: ICON_REINTEGRO, tint: "#E7F8F5", color: "#0C8576" },
  { key: "SUSPENDER", label: "Suspender instructor denunciado", icon: ICON_SUSPENDER, tint: "#FBEAEB", color: "#BE3A3E" },
  { key: "PENALIZAR", label: "Aplicar penalización", icon: ICON_PENALIZAR, tint: "#FFF3E0", color: "#B9741A" },
  { key: "DESESTIMAR", label: "Desestimar denuncia", icon: ICON_DESESTIMAR, tint: "#F4F7FA", color: "#65788C" },
];

function ActionIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <g dangerouslySetInnerHTML={{ __html: d }} />
    </svg>
  );
}

export default function AdminAuditoria() {
  const { listarDenunciasAdmin, resolverDenuncia, tomarDenuncia } = useData();
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(false);
  /**
   * "Suspender instructor denunciado" no es un botón directo: el backend exige `diasSuspension`
   * (mínimo 15) y acepta una multa opcional. Sin este modal la pantalla mandaba la acción pelada
   * y el backend contestaba "Indicá cuántos días dura la suspensión." sin que hubiera ningún
   * lado donde indicarlo — el botón estaba roto de punta a punta. Es el mismo formulario que
   * ya tenía la pestaña Reclamos de `admin/Gestion.tsx`.
   */
  const [suspension, setSuspension] = useState<SuspensionEnCurso | null>(null);
  const [errorSuspension, setErrorSuspension] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    listarDenunciasAdmin()
      .then(setDenuncias)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar las denuncias."))
      .finally(() => setCargando(false));
  }, [listarDenunciasAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const selected = useMemo(() => denuncias.find((d) => d.id === selectedId) ?? null, [denuncias, selectedId]);

  // Criterio 3: abrir una denuncia Pendiente la pasa a "En Auditoría" y deja el evento en
  // trazabilidad. Antes el click sólo cambiaba un useState local y el estado del medio de la
  // máquina nunca se asignaba: la denuncia saltaba de Pendiente a Resuelta.
  const abrirDenuncia = async (id: string) => {
    setSelectedId(id);
    const d = denuncias.find((x) => x.id === id);
    if (!d || d.estado !== "Pendiente") return;
    try {
      await tomarDenuncia(id);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir la denuncia para auditarla.");
    }
  };

  const confirmarSuspension = async () => {
    if (!suspension) return;
    const dias = Number(suspension.dias);
    const monto = suspension.monto.trim() === "" ? 0 : Number(suspension.monto);

    if (!Number.isInteger(dias) || dias < MIN_DIAS_SUSPENSION) {
      return setErrorSuspension(`La suspensión no puede durar menos de ${MIN_DIAS_SUSPENSION} días.`);
    }
    if (!Number.isFinite(monto) || monto < 0) {
      return setErrorSuspension("El monto no puede ser negativo. Dejalo en 0 si no querés aplicar multa.");
    }

    setErrorSuspension(null);
    setResolviendo(true);
    try {
      await resolverDenuncia(suspension.denuncia.id, "SUSPENDER", undefined, {
        montoMulta: monto,
        diasSuspension: dias,
      });
      setSuspension(null);
      setSelectedId(null);
      cargar();
    } catch (err) {
      setErrorSuspension(err instanceof ApiError ? err.message : "No pudimos aplicar la suspensión.");
    } finally {
      setResolviendo(false);
    }
  };

  const resolver = async (accion: AccionResolucion) => {
    if (!selected) return;
    if (accion === "SUSPENDER") {
      setErrorSuspension(null);
      setSuspension({ denuncia: selected, dias: String(MIN_DIAS_SUSPENSION), monto: "0" });
      return;
    }
    setResolviendo(true);
    setError(null);
    try {
      await resolverDenuncia(selected.id, accion);
      cargar();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos resolver la denuncia.");
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <DashLayout role="admin" active="auditoria">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Auditoría de denuncias</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Revisá las denuncias y resolvé: reintegro, sanción, penalización o desestimar.
        </p>
      </div>

      {error && (
        <div style={s("padding:13px 32px;background:#FBEAEB;border-bottom:1px solid #F3D2D3;")}>
          <span style={s("font-size:13px;color:#BE3A3E;font-weight:600;")}>{error}</span>
        </div>
      )}

      <div
        className="ah-grid-auto"
        style={s("padding:26px 32px 50px;display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:24px;align-items:start;")}
      >
        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:auto;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("min-width:600px;")}>
            <div
              style={s(
                "display:grid;grid-template-columns:1.3fr 1.6fr 1.4fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
              )}
            >
              <span>Denunciante</span>
              <span>Motivo</span>
              <span>Instructor denunciado</span>
              <span>Estado</span>
            </div>
            {(cargando ? [] : denuncias).map((d) => (
              <div
                key={d.id}
                className="ah-row"
                onClick={() => abrirDenuncia(d.id)}
                style={s(
                  `display:grid;grid-template-columns:1.3fr 1.6fr 1.4fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;cursor:pointer;transition:background .14s;${selectedId === d.id ? "background:#F7FAFC;" : ""}`,
                )}
              >
                {/* `denunciante` y no `alumno`: en una denuncia de reseña la hace el
                    instructor y `alumno` viene nulo. */}
                <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>
                  {d.denunciante.nombre} {d.denunciante.apellido}
                </span>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.motivo}</span>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.instructor.nombre} {d.instructor.apellido}</span>
                <StatusBadge type={denunciaStatusType(d.estado)} />
              </div>
            ))}
            {cargando && (
              <div style={s("padding:22px;")}>
                <CargandoSeccion seccion="denuncias" />
              </div>
            )}
            {!cargando && denuncias.length === 0 && (
              <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay denuncias registradas.</div>
            )}
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Resolver denuncia</div>
          <p style={s("font-size:12.5px;color:#8194A8;margin:0 0 16px;")}>
            {selected ? (
              <>
                {selected.actividadNombre} · instructor {selected.instructor.nombre} {selected.instructor.apellido} · {selected.estado}
                {selected.pago && <> · pago {selected.pago.estado} ${selected.pago.monto.toLocaleString("es-AR")}</>}
              </>
            ) : (
              "Seleccioná una denuncia de la lista para ver las acciones disponibles."
            )}
          </p>
          <div style={s("display:flex;flex-direction:column;gap:10px;")}>
            {selected ? (
              ACTIONS.map((a) => (
                <button
                  key={a.key}
                  className="ah-btn"
                  onClick={() => resolver(a.key)}
                  disabled={selected.estado === "Resuelta" || resolviendo}
                  style={s(
                    `display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #E7EDF3;border-radius:12px;padding:12px 14px;font:700 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;text-align:left;${selected.estado === "Resuelta" || resolviendo ? "opacity:.5;cursor:not-allowed;" : ""}`,
                  )}
                >
                  <span style={s(`width:34px;height:34px;border-radius:9px;background:${a.tint};display:flex;align-items:center;justify-content:center;flex:none;`)}>
                    <ActionIcon d={a.icon} color={a.color} />
                  </span>
                  {a.label}
                </button>
              ))
            ) : (
              <div style={s("padding:24px;text-align:center;color:#C3CFDA;font:600 13px Manrope,sans-serif;border:1px dashed #E2E9F0;border-radius:12px;")}>
                Sin caso seleccionado
              </div>
            )}
          </div>
          <div style={s("margin-top:16px;padding-top:14px;border-top:1px solid #EEF2F6;font-size:12px;color:#8194A8;font-weight:600;line-height:1.5;")}>
            Toda resolución queda registrada con autor, fecha y entidad afectada para auditoría.
          </div>
        </div>
      </div>

      {suspension && (
        <Modal onClose={() => !resolviendo && setSuspension(null)} zIndex={60}>
          <div style={s("background:#fff;border-radius:18px;padding:26px;max-width:460px;width:100%;")}>
            <div style={s("font:700 18px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:4px;")}>
              Suspender al instructor
            </div>
            <div style={s("font-size:13.5px;color:#7A8C9E;font-weight:600;margin-bottom:18px;")}>
              {suspension.denuncia.instructor.nombre} {suspension.denuncia.instructor.apellido} · la suspensión se
              levanta sola al vencer.
            </div>

            <div
              style={s(
                "background:#FFF9EF;border:1px solid #F6E2C0;border-radius:11px;padding:11px 14px;margin-bottom:16px;font:600 12.5px Manrope,sans-serif;color:#8A5A12;line-height:1.5;",
              )}
            >
              Lo inhabilita por los días indicados, cancela sus clases de ese período y reintegra el pago a todos los
              inscriptos. La multa es opcional.
            </div>

            <div style={s("display:flex;flex-direction:column;gap:12px;")}>
              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>
                  Días de suspensión (mínimo {MIN_DIAS_SUSPENSION})
                </span>
                <input
                  type="number"
                  min={MIN_DIAS_SUSPENSION}
                  step={1}
                  value={suspension.dias}
                  onChange={(e) => setSuspension({ ...suspension, dias: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
              </label>

              <label style={s("display:flex;flex-direction:column;gap:6px;")}>
                <span style={s("font:700 12.5px Manrope,sans-serif;color:#41566B;")}>Multa (puede ser 0)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={suspension.monto}
                  onChange={(e) => setSuspension({ ...suspension, monto: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
                <span style={s("font-size:11.5px;color:#9AAABA;font-weight:600;")}>
                  En 0 no se aplica penalización económica, solo la suspensión.
                </span>
              </label>
            </div>

            {errorSuspension && (
              <div
                style={s("margin-top:12px;background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 13px;font:600 13px Manrope,sans-serif;")}
                role="alert"
              >
                {errorSuspension}
              </div>
            )}

            <div style={s("display:flex;gap:10px;margin-top:18px;")}>
              <button
                className="ah-btn"
                onClick={() => setSuspension(null)}
                disabled={resolviendo}
                style={s("flex:1;background:#fff;border:1px solid #D6DEE7;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={confirmarSuspension}
                disabled={resolviendo}
                style={s(
                  `flex:1;background:${resolviendo ? "#D89A9C" : "#BE3A3E"};border:none;border-radius:11px;padding:12px;font:700 14px Manrope,sans-serif;color:#fff;cursor:${resolviendo ? "wait" : "pointer"};`,
                )}
              >
                {resolviendo ? "Aplicando…" : "Suspender"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashLayout>
  );
}
