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
import { ACCIONES_POR_TIPO, DESCRIPCION_ACCION, ETIQUETA_ACCION } from "../../lib/denuncias";
import { MAX_DIAS_SUSPENSION, MIN_DIAS_SUSPENSION, MULTA_MAXIMA, MULTA_MINIMA, errorDiasSuspension, errorMulta } from "../../lib/limites";
import Paginacion from "../../components/Paginacion";
import { usePaginado } from "../../lib/paginado";

/** Denuncias por página: la lista crece con cada reclamo y las resueltas no se van. */
const POR_PAGINA = 10;

/** Cómo se dibuja cada resolución. El texto sale de `lib/denuncias.ts`, compartido con Gestión. */
interface ResolEstilo {
  icon: string;
  tint: string;
  color: string;
}

const ICON_REINTEGRO = '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>';
const ICON_SUSPENDER = '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>';
const ICON_PENALIZAR = '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>';
const ICON_DESESTIMAR = '<path d="M18 6 6 18M6 6l12 12"/>';
const ICON_OCULTAR =
  '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>';

/** Borrador del modal de suspensión: los días y la multa se escriben como texto y se validan al confirmar. */
interface SuspensionEnCurso {
  denuncia: DenunciaAdmin;
  dias: string;
  monto: string;
}

const ESTILO_ACCION: Record<AccionResolucion, ResolEstilo> = {
  REINTEGRAR: { icon: ICON_REINTEGRO, tint: "#E7F8F5", color: "#0C8576" },
  SUSPENDER: { icon: ICON_SUSPENDER, tint: "#FBEAEB", color: "#BE3A3E" },
  PENALIZAR: { icon: ICON_PENALIZAR, tint: "#FFF3E0", color: "#B9741A" },
  OCULTAR_RESENIA: { icon: ICON_OCULTAR, tint: "#EEF2F6", color: "#41566B" },
  DESESTIMAR: { icon: ICON_DESESTIMAR, tint: "#F4F7FA", color: "#65788C" },
};

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
  const paginado = usePaginado(denuncias, POR_PAGINA);

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

    const errorDatos = errorDiasSuspension(dias) ?? errorMulta(monto, true);
    if (errorDatos) return setErrorSuspension(errorDatos);

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
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Gestión de denuncias</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Revisá las denuncias y resolvelas. Sobre una clase: reintegro, suspensión, penalización o desestimar. Sobre una
          reseña: ocultarla o desestimar.
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
                "display:grid;grid-template-columns:80px 1.3fr 1.6fr 1.4fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
              )}
            >
              <span>Tipo</span>
              <span>Denunciante</span>
              <span>Motivo</span>
              <span>Denunciado</span>
              <span>Estado</span>
            </div>
            {(cargando ? [] : paginado.visibles).map((d) => (
              <div
                key={d.id}
                className="ah-row"
                onClick={() => abrirDenuncia(d.id)}
                style={s(
                  `display:grid;grid-template-columns:80px 1.3fr 1.6fr 1.4fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;cursor:pointer;transition:background .14s;${selectedId === d.id ? "background:#F7FAFC;" : ""}`,
                )}
              >
                {/* `denunciante` y no `alumno`: en una denuncia de reseña la hace el
                    instructor y `alumno` viene nulo. */}
                <span
                  style={s(
                    `font:700 11px Manrope,sans-serif;padding:3px 8px;border-radius:99px;justify-self:start;${
                      d.tipo === "RESENIA" ? "background:#EEF4FB;color:#2D5BC8;" : "background:#F4F7FA;color:#41566B;"
                    }`,
                  )}
                >
                  {d.tipo === "RESENIA" ? "Reseña" : "Clase"}
                </span>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>
                  {d.denunciante.nombre} {d.denunciante.apellido}
                </span>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.motivo}</span>
                {/* En una denuncia de reseña el denunciado es el alumno que la escribió: el
                    instructor es justamente quien denunció. */}
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>
                  {d.tipo === "RESENIA" && d.resenia
                    ? `${d.resenia.autor.nombre} ${d.resenia.autor.apellido}`
                    : `${d.instructor.nombre} ${d.instructor.apellido}`}
                </span>
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
            {!cargando && <Paginacion {...paginado} />}
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Resolver denuncia</div>
          <p style={s("font-size:12.5px;color:#8194A8;margin:0 0 16px;")}>
            {selected ? (
              <>
                {selected.tipo === "RESENIA" ? (
                  <>
                    Reseña de {selected.resenia?.autor.nombre} {selected.resenia?.autor.apellido} sobre {selected.actividadNombre}
                    {selected.resenia && <> · {selected.resenia.puntaje}★</>} · {selected.estado}
                  </>
                ) : (
                  <>
                    {selected.actividadNombre} · instructor {selected.instructor.nombre} {selected.instructor.apellido} · {selected.estado}
                    {selected.pago && <> · pago {selected.pago.estado} ${selected.pago.monto.toLocaleString("es-AR")}</>}
                  </>
                )}
              </>
            ) : (
              "Seleccioná una denuncia de la lista para ver las acciones disponibles."
            )}
          </p>
          <div style={s("display:flex;flex-direction:column;gap:10px;")}>
            {selected && selected.tipo === "RESENIA" && selected.resenia?.comentario && (
              <div
                style={s(
                  "background:#F7FAFC;border:1px solid #EAF0F6;border-radius:12px;padding:11px 13px;font-size:13px;line-height:1.5;color:#41566B;font-weight:600;font-style:italic;",
                )}
              >
                “{selected.resenia.comentario}”
              </div>
            )}
            {selected ? (
              // Sólo las acciones que aplican a lo denunciado: sobre una reseña no hay pago ni
              // instructor que sancionar, y el backend rechaza esas cuatro con 400.
              ACCIONES_POR_TIPO[selected.tipo].map((key) => ({ key, ...ESTILO_ACCION[key] })).map((a) => (
                <button
                  key={a.key}
                  className="ah-btn"
                  title={DESCRIPCION_ACCION[a.key]}
                  onClick={() => resolver(a.key)}
                  disabled={selected.estado === "Resuelta" || resolviendo}
                  style={s(
                    `display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #E7EDF3;border-radius:12px;padding:12px 14px;font:700 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;text-align:left;${selected.estado === "Resuelta" || resolviendo ? "opacity:.5;cursor:not-allowed;" : ""}`,
                  )}
                >
                  <span style={s(`width:34px;height:34px;border-radius:9px;background:${a.tint};display:flex;align-items:center;justify-content:center;flex:none;`)}>
                    <ActionIcon d={a.icon} color={a.color} />
                  </span>
                  {ETIQUETA_ACCION[a.key]}
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
                  Días de suspensión (entre {MIN_DIAS_SUSPENSION} y {MAX_DIAS_SUSPENSION})
                </span>
                <input
                  type="number"
                  min={MIN_DIAS_SUSPENSION}
                  max={MAX_DIAS_SUSPENSION}
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
                  max={MULTA_MAXIMA}
                  step={100}
                  value={suspension.monto}
                  onChange={(e) => setSuspension({ ...suspension, monto: e.target.value })}
                  style={s("border:1px solid #E2E9F0;border-radius:10px;padding:11px 12px;font:600 14px Manrope,sans-serif;color:#0E2A47;")}
                />
                <span style={s("font-size:11.5px;color:#9AAABA;font-weight:600;")}>
                  En 0 no se aplica penalización económica, solo la suspensión. Si cargás una multa, va de ${MULTA_MINIMA.toLocaleString("es-AR")} a ${MULTA_MAXIMA.toLocaleString("es-AR")}.
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
