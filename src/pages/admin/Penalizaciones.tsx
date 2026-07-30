import { useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";
import type { TipoPenalizacion } from "../../lib/types";

const TIPO_STYLE: Record<TipoPenalizacion, [string, string, string]> = {
  Económica: ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "Suspensión temporal": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

interface FormState {
  usuarioId: string;
  tipo: TipoPenalizacion;
  motivo: string;
}

export default function AdminPenalizaciones() {
  const { users } = useAuth();
  const { penalizaciones, aplicarPenalizacion } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ usuarioId: users[0]?.id ?? "", tipo: "Económica", motivo: "" });

  const acumPorUsuario = useMemo(() => {
    const map = new Map<string, number>();
    penalizaciones.forEach((p) => map.set(p.usuarioId, (map.get(p.usuarioId) ?? 0) + 1));
    return map;
  }, [penalizaciones]);

  const kpis = useMemo(() => {
    const usuariosPenalizados = new Set(penalizaciones.map((p) => p.usuarioId)).size;
    const suspensiones = penalizaciones.filter((p) => p.tipo === "Suspensión temporal").length;
    return [
      { l: "Total penalizaciones", v: penalizaciones.length, c: "#0E2A47" },
      { l: "Usuarios sancionados", v: usuariosPenalizados, c: "#B9741A" },
      { l: "Suspensiones activas", v: suspensiones, c: "#BE3A3E" },
    ];
  }, [penalizaciones]);

  const rows = useMemo(
    () =>
      [...penalizaciones]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((p) => {
          const user = users.find((u) => u.id === p.usuarioId);
          return { ...p, userNombre: user ? `${user.nombre} ${user.apellido}` : "Usuario eliminado", acum: acumPorUsuario.get(p.usuarioId) ?? 1 };
        }),
    [penalizaciones, users, acumPorUsuario],
  );

  const submit = () => {
    if (!form.usuarioId || !form.motivo.trim()) return;
    aplicarPenalizacion({ usuarioId: form.usuarioId, tipo: form.tipo, motivo: form.motivo.trim() });
    setShowForm(false);
    setForm({ usuarioId: users[0]?.id ?? "", tipo: "Económica", motivo: "" });
  };

  return (
    <DashLayout role="admin" active="penalizaciones">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;display:flex;align-items:center;")}>
        <div>
          <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Penalizaciones</h1>
          <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
            Sanciones a usuarios: económicas o suspensión temporal. Cada usuario acumula su cantidad.
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
                        {p.userNombre.charAt(0).toUpperCase()}
                      </span>
                      <span style={s("font:700 14px Manrope,sans-serif;color:#0E2A47;")}>{p.userNombre}</span>
                    </div>
                    <span
                      style={s(
                        `font:700 11.5px Manrope,sans-serif;padding:4px 10px;border-radius:99px;background:${tipoBg};color:${tipoFg};border:1px solid ${tipoBd};width:fit-content;`,
                      )}
                    >
                      {p.tipo}
                    </span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{p.motivo}</span>
                    <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{formatFecha(p.createdAt)}</span>
                    <span style={s("font:700 15px Space Grotesk,sans-serif;color:#BE3A3E;")}>{p.acum}</span>
                    <span
                      style={s(
                        "font:700 12px Manrope,sans-serif;padding:5px 11px;border-radius:99px;background:#FBEAEB;color:#BE3A3E;border:1px solid #F3D2D3;width:fit-content;",
                      )}
                    >
                      Aplicada
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 && (
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

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Usuario</label>
            <select
              value={form.usuarioId}
              onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} · {u.rol}
                </option>
              ))}
            </select>

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPenalizacion })}
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:14px;")}
            >
              <option value="Económica">Económica</option>
              <option value="Suspensión temporal">Suspensión temporal</option>
            </select>

            <label style={s("display:block;font:700 12px Manrope,sans-serif;color:#41566B;margin-bottom:6px;")}>Motivo</label>
            <textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              rows={3}
              placeholder="Describí el motivo de la sanción"
              style={s("width:100%;border:1px solid #E2E9F0;border-radius:10px;padding:10px 12px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;margin-bottom:20px;resize:vertical;")}
            />

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
                style={s("flex:1;background:#E5484D;color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Manrope,sans-serif;cursor:pointer;")}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
