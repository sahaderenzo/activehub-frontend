import { useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import StatusBadge from "../../components/StatusBadge";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { denunciaStatusType } from "../../lib/status";

interface ResolAction {
  key: string;
  label: string;
  icon: string;
  tint: string;
  color: string;
  run: () => void;
}

const ICON_REINTEGRO = '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>';
const ICON_SUSPENDER = '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>';
const ICON_PENALIZAR = '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>';
const ICON_DESESTIMAR = '<path d="M18 6 6 18M6 6l12 12"/>';

function ActionIcon({ d, color }: { d: string; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <g dangerouslySetInnerHTML={{ __html: d }} />
    </svg>
  );
}

export default function AdminAuditoria() {
  const { users, updateUsuario } = useAuth();
  const { denuncias, inscripciones, actualizarEstadoDenuncia, aplicarPenalizacion, cancelarInscripcion } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () => denuncias.map((d) => ({ d, user: users.find((u) => u.id === d.alumnoId) })),
    [denuncias, users],
  );

  const selected = denuncias.find((d) => d.id === selectedId) ?? null;
  const selectedUser = selected ? users.find((u) => u.id === selected.alumnoId) : undefined;

  const actions: ResolAction[] = selected
    ? [
        {
          key: "reintegro",
          label: "Reintegrar pago",
          icon: ICON_REINTEGRO,
          tint: "#E7F8F5",
          color: "#0C8576",
          run: () => {
            const insc = inscripciones.find((i) => i.alumnoId === selected.alumnoId && i.claseId === selected.claseId);
            if (insc) cancelarInscripcion(insc.id);
            actualizarEstadoDenuncia(selected.id, "Resuelta");
            setSelectedId(null);
          },
        },
        {
          key: "suspender",
          label: "Suspender usuario denunciado",
          icon: ICON_SUSPENDER,
          tint: "#FBEAEB",
          color: "#BE3A3E",
          run: () => {
            updateUsuario(selected.alumnoId, { estado: "SUSPENDIDO" });
            actualizarEstadoDenuncia(selected.id, "Resuelta");
            setSelectedId(null);
          },
        },
        {
          key: "penalizar",
          label: "Aplicar penalización",
          icon: ICON_PENALIZAR,
          tint: "#FFF3E0",
          color: "#B9741A",
          run: () => {
            aplicarPenalizacion({ usuarioId: selected.alumnoId, tipo: "Económica", motivo: `Denuncia ${selected.id}: ${selected.motivo}` });
            actualizarEstadoDenuncia(selected.id, "Resuelta");
            setSelectedId(null);
          },
        },
        {
          key: "desestimar",
          label: "Desestimar denuncia",
          icon: ICON_DESESTIMAR,
          tint: "#F4F7FA",
          color: "#65788C",
          run: () => {
            actualizarEstadoDenuncia(selected.id, "Resuelta");
            setSelectedId(null);
          },
        },
      ]
    : [];

  return (
    <DashLayout role="admin" active="auditoria">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Auditoría de denuncias</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Revisá las denuncias y resolvé: reintegro, sanción, penalización o desestimar.
        </p>
      </div>

      <div
        className="ah-grid-auto"
        style={s("padding:26px 32px 50px;display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:24px;align-items:start;")}
      >
        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:auto;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("min-width:560px;")}>
            <div
              style={s(
                "display:grid;grid-template-columns:0.9fr 1.3fr 1.6fr 1.2fr 130px;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
              )}
            >
              <span>ID</span>
              <span>Denunciante</span>
              <span>Motivo</span>
              <span>Sobre</span>
              <span>Estado</span>
            </div>
            {rows.map(({ d, user }) => (
              <div
                key={d.id}
                className="ah-row"
                onClick={() => setSelectedId(d.id)}
                style={s(
                  `display:grid;grid-template-columns:0.9fr 1.3fr 1.6fr 1.2fr 130px;padding:14px 22px;border-bottom:1px solid #F1F4F8;align-items:center;cursor:pointer;transition:background .14s;${selectedId === d.id ? "background:#F7FAFC;" : ""}`,
                )}
              >
                <span style={s("font:700 12px ui-monospace,Menlo,monospace;color:#0E2A47;")}>{d.id}</span>
                <span style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{user ? `${user.nombre} ${user.apellido}` : "—"}</span>
                <span style={s("font-size:13px;color:#65788C;font-weight:600;")}>{d.motivo}</span>
                <span style={s("font-size:12.5px;color:#65788C;font-weight:600;")}>Clase {d.claseId}</span>
                <StatusBadge type={denunciaStatusType(d.estado)} />
              </div>
            ))}
            {rows.length === 0 && (
              <div style={s("padding:40px 22px;text-align:center;color:#90A1B2;font:600 13.5px Manrope,sans-serif;")}>No hay denuncias registradas.</div>
            )}
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("font:700 15px Space Grotesk,sans-serif;margin-bottom:4px;")}>Resolver denuncia</div>
          <p style={s("font-size:12.5px;color:#8194A8;margin:0 0 16px;")}>
            {selected ? (
              <>
                Caso {selected.id} · {selectedUser ? `${selectedUser.nombre} ${selectedUser.apellido}` : "usuario"} · {denunciaStatusType(selected.estado)}
              </>
            ) : (
              "Seleccioná una denuncia de la lista para ver las acciones disponibles."
            )}
          </p>
          <div style={s("display:flex;flex-direction:column;gap:10px;")}>
            {selected ? (
              actions.map((a) => (
                <button
                  key={a.key}
                  className="ah-btn"
                  onClick={a.run}
                  disabled={selected.estado === "Resuelta"}
                  style={s(
                    `display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #E7EDF3;border-radius:12px;padding:12px 14px;font:700 13.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;text-align:left;${selected.estado === "Resuelta" ? "opacity:.5;cursor:not-allowed;" : ""}`,
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
    </DashLayout>
  );
}
