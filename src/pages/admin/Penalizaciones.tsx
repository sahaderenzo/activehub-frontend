import { useCallback, useEffect, useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useData } from "../../context/DataContext";
import type { PenalizacionAdmin, UsuarioAdmin } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { formatFecha } from "../../lib/mockData";
import type { TipoPenalizacion } from "../../lib/types";

const TIPO_STYLE: Record<TipoPenalizacion, [string, string, string]> = {
  Económica: ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "Suspensión temporal": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

/** Espejo de `VentanaPenalizacion.MINIMO_DIAS_SUSPENSION` del backend. */
const MIN_DIAS_SUSPENSION = 15;

interface FormState {
  usuarioId: string;
  /** Los dos tipos se pueden aplicar juntos; el backend guarda una penalización por cada uno. */
  economica: boolean;
  suspension: boolean;
  motivo: string;
  monto: string;
  fechaInicio: string;
  fechaFin: string;
}

const FORM_VACIO: FormState = {
  usuarioId: "",
  economica: true,
  suspension: false,
  motivo: "",
  monto: "",
  fechaInicio: "",
  fechaFin: "",
};

/** Días enteros entre dos fechas `YYYY-MM-DD`. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000);
}

export default function AdminPenalizaciones() {
  const { listarPenalizaciones, crearPenalizacion, listarUsuariosAdmin } = useData();

  const [penalizaciones, setPenalizaciones] = useState<PenalizacionAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Datos reales: antes la pantalla leía el dataset mock del DataContext, así que lo que el
  // admin "aplicaba" no se guardaba y las penalizaciones que sí creaba `resolverdenuncia`
  // no aparecían nunca.
  const cargar = useCallback(() => {
    listarPenalizaciones()
      .then((lista) => {
        setPenalizaciones(lista);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar las penalizaciones."));
    // Sin el listado de usuarios el formulario no tiene a quién penalizar, así que un fallo
    // acá también es un error de pantalla y no un select vacío sin explicación.
    //
    // Solo instructores (`puedeDarClases`): la penalización existe por la inasistencia del
    // profesor (E4Ad-HU06 / RN-13), así que multar o suspender a un alumno o a un
    // administrador no significa nada. El backend rechaza igual el resto — acá se evita
    // ofrecerlo. El flag viene calculado por permiso, no por nombre de rol (RN-19).
    listarUsuariosAdmin()
      .then((lista) => setUsuarios(lista.filter((u) => u.puedeDarClases)))
      .catch(() => setError("No pudimos cargar el listado de usuarios."));
  }, [listarPenalizaciones, listarUsuariosAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const kpis = useMemo(() => {
    const usuariosPenalizados = new Set(penalizaciones.map((p) => p.usuarioId)).size;
    const suspensionesVigentes = penalizaciones.filter((p) => p.vigente).length;
    return [
      { l: "Total penalizaciones", v: penalizaciones.length, c: "#0E2A47" },
      { l: "Usuarios sancionados", v: usuariosPenalizados, c: "#B9741A" },
      { l: "Suspensiones vigentes", v: suspensionesVigentes, c: "#BE3A3E" },
    ];
  }, [penalizaciones]);

  const rows = penalizaciones;

  const submit = async () => {
    setFormError(null);
    if (!form.usuarioId) return setFormError("Elegí a qué usuario penalizar.");
    if (!form.motivo.trim()) return setFormError("El motivo es obligatorio.");
    if (!form.economica && !form.suspension) {
      return setFormError("Elegí al menos un tipo de penalización.");
    }
    if (form.economica && (!form.monto || Number(form.monto) <= 0)) {
      return setFormError("Ingresá el monto de la penalización económica.");
    }
    if (form.suspension) {
      if (!form.fechaInicio || !form.fechaFin) {
        return setFormError("Indicá la fecha de inicio y de fin de la suspensión.");
      }
      if (diasEntre(form.fechaInicio, form.fechaFin) < MIN_DIAS_SUSPENSION) {
        return setFormError(`La suspensión no puede durar menos de ${MIN_DIAS_SUSPENSION} días.`);
      }
    }

    setGuardando(true);
    try {
      const tipos: TipoPenalizacion[] = [];
      if (form.economica) tipos.push("Económica");
      if (form.suspension) tipos.push("Suspensión temporal");

      await crearPenalizacion({
        usuarioId: form.usuarioId,
        tipos,
        motivo: form.motivo.trim(),
        monto: form.economica ? Number(form.monto) : undefined,
        fechaInicio: form.suspension ? form.fechaInicio : undefined,
        fechaFin: form.suspension ? form.fechaFin : undefined,
      });
      setShowForm(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo aplicar la penalización. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <DashLayout role="admin" active="penalizaciones">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Penalizaciones</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Sanciones a instructores: económicas o suspensión temporal. Cada instructor acumula su cantidad.
          </p>
        </div>
        <button
          className="ah-btn"
          onClick={() => setShowForm(true)}
          style={s(
            "margin-left:auto;background:#E5484D;color:#fff;border:none;border-radius:12px;padding:12px 20px;font:700 14px Manrope,sans-serif;cursor:pointer;display:flex;align-items:center;gap:8px;",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva penalización
        </button>
      </div>

      <div style={s("padding:26px 32px 50px;")}>
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px;")}>
          {kpis.map((k) => (
            <div key={k.l} style={s("background:#fff;border:1px solid #E7EDF3;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;margin-bottom:8px;")}>{k.l}</div>
              <div style={s(`font:700 26px Space Grotesk,sans-serif;color:${k.c};`)}>{k.v}</div>
            </div>
          ))}
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("overflow-x:auto;")}>
            <div style={s("min-width:820px;")}>
              <div
                style={s(
                  "display:grid;grid-template-columns:1.6fr 1.1fr 2fr 1fr 0.8fr 120px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
                )}
              >
                <span>Usuario</span>
                <span>Tipo</span>
                <span>Motivo</span>
                <span>Fecha</span>
                <span>Acum.</span>
                <span>Estado</span>
              </div>
              {rows.map((p) => {
                const [tipoBg, tipoFg, tipoBd] = TIPO_STYLE[p.tipo];
                return (
                  <div
                    key={p.id}
                    style={s("display:grid;grid-template-columns:1.6fr 1.1fr 2fr 1fr 0.8fr 120px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
                  >
                    <div style={s("display:flex;align-items:center;gap:10px;")}>
                      <span
                        style={s(
                          "width:34px;height:34px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;display:flex;align-items:center;justify-content:center;font:700 13px Space Grotesk,sans-serif;flex:none;",
                        )}
                      >
                        {p.usuarioNombre.charAt(0).toUpperCase()}
                      </span>
                      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{p.usuarioNombre}</span>
                    </div>
                    <span
                      style={s(
                        `font:700 11.5px Manrope,sans-serif;padding:4px 10px;border-radius:99px;background:${tipoBg};color:${tipoFg};border:1px solid ${tipoBd};width:fit-content;`,
                      )}
                    >
                      {p.tipo}
                    </span>
                    <div>
                      <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>{p.motivo}</div>
                      {p.monto != null && (
                        <div style={s("font:700 12.5px Manrope,sans-serif;color:#B9741A;margin-top:2px;")}>
                          Monto: ${p.monto.toLocaleString("es-AR")}
                        </div>
                      )}
                      {p.fechaInicio && p.fechaFin && (
                        <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;margin-top:2px;")}>
                          Vigencia: {formatFecha(p.fechaInicio)} → {formatFecha(p.fechaFin)}{" "}
                          <span style={s("color:#BE3A3E;")}>({diasEntre(p.fechaInicio, p.fechaFin)} días)</span>
                        </div>
                      )}
                      {p.denunciaId && (
                        <div style={s("font-size:12.5px;color:#3A6FF0;font-weight:700;margin-top:2px;")}>
                          Originada en una denuncia
                        </div>
                      )}
                    </div>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(p.createdAt)}</span>
                    <span style={s("font:700 15px Space Grotesk,sans-serif;color:#BE3A3E;")}>
                      {p.cantidadPenalizacionesUsuario}
                    </span>
                    <span
                      style={s(
                        p.vigente
                          ? "font:700 12px Manrope,sans-serif;padding:5px 11px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;width:fit-content;"
                          : "font:700 12px Manrope,sans-serif;padding:5px 11px;border-radius:99px;background:#F2F5F9;color:#65788C;border:1px solid #E2E9F0;width:fit-content;",
                      )}
                    >
                      {p.vigente ? "Vigente" : "Aplicada"}
                    </span>
                  </div>
                );
              })}
              {error && (
                <div style={s("padding:30px 22px;text-align:center;")}>
                  <div style={s("color:#BE3A3E;font:700 13.5px Manrope,sans-serif;margin-bottom:12px;")}>{error}</div>
                  <button
                    className="ah-btn"
                    onClick={cargar}
                    style={s(
                      "background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:9px 16px;font:700 13px Manrope,sans-serif;color:#41566B;cursor:pointer;",
                    )}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!error && rows.length === 0 && (
                <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay penalizaciones aplicadas.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={s("position:fixed;inset:0;z-index:80;background:rgba(8,22,38,.5);display:flex;align-items:center;justify-content:center;")}>
          <div style={s("width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 26px 64px rgba(0,0,0,.3);")}>
            <div style={s("font:700 16px Space Grotesk,sans-serif;color:#0E2A47;margin-bottom:14px;")}>Nueva penalización</div>

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Instructor</label>
            <select
              value={form.usuarioId}
              onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
            >
              <option value="">Elegí un instructor…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} · {u.rol} · {u.email}
                </option>
              ))}
            </select>

            {/* Los dos tipos son combinables: se puede multar y suspender en la misma sanción.
                El backend guarda una Penalización por cada tipo tildado. */}
            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Tipo</label>
            <div style={s("display:flex;flex-direction:column;gap:8px;margin-bottom:14px;")}>
              {[
                { key: "economica" as const, label: "Económica" },
                { key: "suspension" as const, label: "Suspensión temporal" },
              ].map((opt) => (
                <label
                  key={opt.key}
                  style={s("display:flex;align-items:center;gap:9px;font:600 13.5px Manrope,sans-serif;color:#41566B;cursor:pointer;")}
                >
                  <input
                    type="checkbox"
                    checked={form[opt.key]}
                    onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                    style={s("width:16px;height:16px;accent-color:#E5484D;cursor:pointer;")}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Campos condicionales (criterios 4 y 5): monto para Económica, vigencia para Suspensión. */}
            {form.economica && (
              <>
                <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                  Monto ($)
                </label>
                <input
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value.replace(/[^\d]/g, "") })}
                  inputMode="numeric"
                  placeholder="5000"
                  style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
                />
              </>
            )}
            {form.suspension && (
              <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;")}>
                <div>
                  <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;")}
                  />
                </div>
                <div>
                  <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;")}
                  />
                </div>
              </div>
            )}

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Motivo</label>
            <textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              rows={3}
              placeholder="Describí el motivo de la sanción"
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:12px;resize:vertical;")}
            />

            {formError && (
              <div style={s("font:700 12.5px Manrope,sans-serif;color:#BE3A3E;margin-bottom:12px;")}>{formError}</div>
            )}

            <div style={s("display:flex;gap:10px;")}>
              <button
                className="ah-btn"
                onClick={() => setShowForm(false)}
                style={s("flex:1;background:#F4F7FA;color:#41566B;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Cancelar
              </button>
              <button
                className="ah-btn"
                onClick={submit}
                disabled={guardando}
                style={s(
                  `flex:1;background:#E5484D;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:${
                    guardando ? "not-allowed" : "pointer"
                  };opacity:${guardando ? ".6" : "1"};`,
                )}
              >
                {guardando ? "Aplicando…" : "Aplicar penalización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
