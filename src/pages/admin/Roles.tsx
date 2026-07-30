import { useMemo, useState } from "react";
import DashLayout from "../../components/DashLayout";
import { s } from "../../lib/style";
import { useAuth } from "../../context/AuthContext";
import type { RolNombre } from "../../lib/types";

interface RolDef {
  rol: RolNombre;
  label: string;
  desc: string;
  tint: string;
  color: string;
}

const ROLES: RolDef[] = [
  { rol: "ALUMNO", label: "Alumno", desc: "Explora, se inscribe y participa de actividades.", tint: "#EAF1FE", color: "#2D5BC8" },
  { rol: "INSTRUCTOR", label: "Instructor", desc: "Publica actividades y gestiona sus propias clases.", tint: "#E7F8F5", color: "#0C8576" },
  { rol: "ADMIN", label: "Admin", desc: "Administra usuarios, taxonomía, reportes y auditoría.", tint: "#FFF3E0", color: "#B9741A" },
];

interface PermRow {
  mod: string;
  ALUMNO: boolean;
  INSTRUCTOR: boolean;
  ADMIN: boolean;
}

const DEFAULT_PERMS: PermRow[] = [
  { mod: "Explorar y reservar actividades", ALUMNO: true, INSTRUCTOR: true, ADMIN: true },
  { mod: "Cancelar inscripciones propias", ALUMNO: true, INSTRUCTOR: false, ADMIN: true },
  { mod: "Publicar y editar actividades", ALUMNO: false, INSTRUCTOR: true, ADMIN: true },
  { mod: "Gestionar clases y cupos", ALUMNO: false, INSTRUCTOR: true, ADMIN: true },
  { mod: "Ver métricas propias", ALUMNO: false, INSTRUCTOR: true, ADMIN: true },
  { mod: "Validar instructores", ALUMNO: false, INSTRUCTOR: false, ADMIN: true },
  { mod: "Aplicar penalizaciones y sanciones", ALUMNO: false, INSTRUCTOR: false, ADMIN: true },
  { mod: "Configurar roles y permisos", ALUMNO: false, INSTRUCTOR: false, ADMIN: true },
];

function Chk({ on }: { on: boolean }) {
  return on ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0C8576" strokeWidth={3}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C3CFDA" strokeWidth={3}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function AdminRoles() {
  const { users } = useAuth();
  const [selected, setSelected] = useState<RolNombre>("ADMIN");
  const [perms, setPerms] = useState<PermRow[]>(DEFAULT_PERMS);
  const [saved, setSaved] = useState(false);

  const counts = useMemo(() => {
    const map: Record<RolNombre, number> = { ALUMNO: 0, INSTRUCTOR: 0, ADMIN: 0 };
    users.forEach((u) => (map[u.rol] += 1));
    return map;
  }, [users]);

  const toggle = (mod: string, rol: RolNombre) => {
    setSaved(false);
    setPerms((prev) => prev.map((p) => (p.mod === mod ? { ...p, [rol]: !p[rol] } : p)));
  };

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashLayout role="admin" active="roles">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk,sans-serif;margin:0;")}>Roles y permisos</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>Configurá qué puede hacer cada rol. Los permisos se ajustan sin tocar código.</p>
      </div>

      <div className="ah-grid-side-alt" style={s("padding:26px 32px 50px;display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:start;")}>
        <div style={s("display:flex;flex-direction:column;gap:12px;")}>
          <div style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.5px;padding:0 4px 2px;")}>
            Roles del sistema
          </div>
          {ROLES.map((r) => {
            const on = selected === r.rol;
            return (
              <div
                key={r.rol}
                className="ah-btn"
                onClick={() => setSelected(r.rol)}
                style={s(
                  `cursor:pointer;background:#fff;border:1.5px solid ${on ? "#12B5A5" : "#E7EDF3"};border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(14,42,71,.04);`,
                )}
              >
                <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:8px;")}>
                  <span
                    style={s(
                      `width:36px;height:36px;border-radius:10px;background:${r.tint};color:${r.color};display:flex;align-items:center;justify-content:center;`,
                    )}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </span>
                  <div style={s("font:700 15px Manrope,sans-serif;color:#0E2A47;")}>{r.label}</div>
                </div>
                <div style={s("font-size:12.5px;color:#65788C;font-weight:600;line-height:1.45;margin-bottom:8px;")}>{r.desc}</div>
                <div style={s("font:700 12px Manrope,sans-serif;color:#90A1B2;")}>{counts[r.rol]} usuarios</div>
              </div>
            );
          })}
          <button
            className="ah-btn"
            disabled
            title="Los roles del sistema son fijos en este demo"
            style={s(
              "background:#fff;border:1px dashed #C9D5E1;border-radius:13px;padding:13px;font:700 13.5px Manrope,sans-serif;color:#65788C;cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:7px;opacity:.7;",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#65788C" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo rol
          </button>
        </div>

        <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
          <div style={s("padding:18px 22px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;")}>
            <div>
              <div style={s("font:700 16px Space Grotesk,sans-serif;")}>Permisos por módulo</div>
              <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;margin-top:2px;")}>Marcá lo que cada rol puede hacer</div>
            </div>
            <button
              className="ah-btn"
              onClick={save}
              style={s(`background:${saved ? "#0C8576" : "#0FB8A9"};color:#fff;border:none;border-radius:10px;padding:9px 16px;font:700 13px Manrope,sans-serif;cursor:pointer;`)}
            >
              {saved ? "Cambios guardados ✓" : "Guardar cambios"}
            </button>
          </div>
          <div
            className="ah-grid-4"
            style={s(
              "display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:12px 22px;background:#F7FAFC;border-bottom:1px solid #EEF2F6;font:700 11.5px Manrope,sans-serif;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;",
            )}
          >
            <span>Módulo / acción</span>
            <span style={s("text-align:center;")}>Alumno</span>
            <span style={s("text-align:center;")}>Instructor</span>
            <span style={s("text-align:center;")}>Admin</span>
          </div>
          {perms.map((p) => (
            <div
              key={p.mod}
              className="ah-grid-4"
              style={s("display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:13px 22px;border-bottom:1px solid #F1F4F8;align-items:center;")}
            >
              <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>{p.mod}</span>
              {(["ALUMNO", "INSTRUCTOR", "ADMIN"] as const).map((rol) => (
                <span key={rol} style={s("display:flex;justify-content:center;")}>
                  <span
                    className="ah-btn"
                    onClick={() => toggle(p.mod, rol)}
                    style={s("width:24px;height:24px;border-radius:7px;background:#F4F7FA;display:flex;align-items:center;justify-content:center;cursor:pointer;")}
                  >
                    <Chk on={p[rol]} />
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
