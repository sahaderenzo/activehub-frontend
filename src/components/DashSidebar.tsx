import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import { areasDisponibles, PERMISO_POR_ITEM } from "../lib/areas";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";

type Role = "instructor" | "admin";

interface NavDef {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
}

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

const PANEL_ICON =
  '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>';

function instructorItems(color: (on: boolean) => string, activeKey: string): NavDef[] {
  const defs: [string, string, string, string][] = [
    ["instructor", "Panel", "/instructor", PANEL_ICON],
    [
      "misactividades",
      "Mis actividades",
      "/instructor/actividades",
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    ],
    [
      "proximasclases",
      "Próximas clases",
      "/instructor/proximas-clases",
      '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    ],
    [
      "metricas",
      "Métricas",
      "/instructor/metricas",
      '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    ],
    [
      "historial",
      "Historial",
      "/instructor/historial",
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ],
    [
      "resenias",
      "Reseñas",
      "/instructor/resenas",
      '<path d="M11.5 3.5 13.8 8l5 .7-3.6 3.5.9 5L11.5 15l-4.5 2.4.9-5L4.3 8.7l5-.7z"/>',
    ],
  ];
  return defs.map(([key, label, path, icon]) => ({
    key,
    label,
    path,
    icon: <Icon d={icon} color={color(activeKey === key)} />,
  }));
}

function adminItems(color: (on: boolean) => string, activeKey: string): NavDef[] {
  const defs: [string, string, string, string][] = [
    ["admin", "Dashboard", "/admin", PANEL_ICON],
    [
      "gestionadmin",
      "Gestión",
      "/admin/gestion",
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    ],
    [
      "taxonomia",
      "Tipos y niveles",
      "/admin/taxonomia",
      '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
    ],
    [
      "roles",
      "Roles y permisos",
      "/admin/roles",
      '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    ],
    [
      "penalizaciones",
      "Penalizaciones",
      "/admin/penalizaciones",
      '<path d="M4.9 4.9 19 19"/><circle cx="12" cy="12" r="9"/>',
    ],
    [
      "auditoria",
      "Auditoría",
      "/admin/auditoria",
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    ],
    [
      "trazabilidad",
      "Trazabilidad",
      "/admin/trazabilidad",
      '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
    ],
    [
      "reportes",
      "Reportes",
      "/admin/reportes",
      '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    ],
  ];
  return defs.map(([key, label, path, icon]) => ({
    key,
    label,
    path,
    icon: <Icon d={icon} color={color(activeKey === key)} />,
  }));
}

interface DashSidebarProps {
  role: Role;
  active: string;
}

export default function DashSidebar({ role, active }: DashSidebarProps) {
  const navigate = useNavigate();
  const { currentUser, logout, puede, permisos } = useAuth();
  const data = useData();
  const color = (on: boolean) => (on ? "#12B5A5" : "#9DB3C9");
  const todos = role === "admin" ? adminItems(color, active) : instructorItems(color, active);
  // El menú muestra solo lo que el rol puede hacer (RN-19). Vale para los dos paneles: el
  // de instructor también se filtraba antes por nombre de rol, así que un rol nuevo con
  // `clases.gestionar` veía ítems que el backend después le rechazaba con 403 — y al revés,
  // un alumno con permisos de instructor no tenía cómo llegar acá.
  const items = todos.filter((it) => !PERMISO_POR_ITEM[it.key] || puede(PERMISO_POR_ITEM[it.key]));
  // Alguien puede tener permisos de más de un área (un instructor que además se inscribe,
  // o un rol mixto creado en "Roles y permisos"): se le ofrece el cambio en vez de dejarlo
  // encerrado en el panel al que entró.
  const otrasAreas = areasDisponibles(permisos).filter((a) => a.area !== role);

  const avatarBg =
    role === "admin" ? "linear-gradient(140deg,#F5A623,#FF6A2B)" : "linear-gradient(140deg,#12B5A5,#0E2A47)";
  const userName = currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : "Invitado";
  const userRole = role === "admin" ? "Administrador" : "Instructor";
  const [fotoVersion, setFotoVersion] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside
      className="ah-dash-sidebar"
      style={s(
        "width:248px;flex:none;background:#0E2A47;min-height:100vh;display:flex;flex-direction:column;font-family:Manrope,system-ui,sans-serif;position:sticky;top:0;height:100vh;",
      )}
    >
      <div style={s("padding:22px 22px 18px;display:flex;align-items:center;gap:10px;")}>
        <div
          style={s("display:flex;align-items:center;gap:10px;cursor:pointer;")}
          onClick={() => navigate("/")}
        >
          <div
            style={s(
              "width:36px;height:36px;border-radius:10px;background:linear-gradient(140deg,#12B5A5,#FF6A2B);display:flex;align-items:center;justify-content:center;font:700 19px Space Grotesk,sans-serif;color:#fff;",
            )}
          >
            A
          </div>
          <span style={s("font:700 20px Space Grotesk,sans-serif;color:#fff;")}>ActiveHub</span>
        </div>
        <div style={s("margin-left:auto;")}>
          <NotificationBell variant="dark" align="left" />
        </div>
      </div>
      <div
        style={s(
          "padding:6px 14px;margin:0 12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;display:flex;align-items:center;gap:10px;",
        )}
      >
        <Avatar
          usuarioId={currentUser?.id}
          nombre={currentUser?.nombre ?? "?"}
          size={34}
          fontSize={14}
          gradient={avatarBg}
          version={fotoVersion}
          onUpload={async (archivo) => {
            await data.subirFotoPerfil(archivo);
            setFotoVersion((v) => v + 1);
          }}
        />
        <div style={s("min-width:0;")}>
          <div style={s("font:700 13.5px Manrope,sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>
            {userName}
          </div>
          <div style={s("font-size:11.5px;color:#7E96B0;font-weight:600;")}>{userRole}</div>
        </div>
      </div>
      <nav style={s("flex:1;padding:0 12px;display:flex;flex-direction:column;gap:3px;")}>
        {items.map((it) => {
          const on = active === it.key;
          return (
            <div
              key={it.key}
              onClick={() => navigate(it.path)}
              className="ah-btn"
              style={s(
                `display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:11px;cursor:pointer;font:700 14px Manrope,sans-serif;color:${on ? "#fff" : "#9DB3C9"};background:${on ? "rgba(18,181,165,.16)" : "transparent"};`,
              )}
            >
              {it.icon}
              {it.label}
            </div>
          );
        })}
      </nav>
      <div style={s("padding:14px 12px;border-top:1px solid rgba(255,255,255,.08);")}>
        {otrasAreas.map((a) => (
          <div
            key={a.area}
            onClick={() => navigate(a.home)}
            className="ah-btn"
            style={s("display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:11px;cursor:pointer;font:700 14px Manrope,sans-serif;color:#9DB3C9;")}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9DB3C9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Ir a {a.label}
          </div>
        ))}
        <div
          onClick={handleLogout}
          className="ah-btn"
          style={s("display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:11px;cursor:pointer;font:700 14px Manrope,sans-serif;color:#9DB3C9;")}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9DB3C9" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5M21 12H9" />
          </svg>
          Cerrar sesión
        </div>
      </div>
    </aside>
  );
}
