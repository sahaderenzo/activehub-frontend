import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

type AlumnoNavKey = "home" | "explorar" | "calendario" | "favoritos" | "misreservas";

const ITEMS: { key: AlumnoNavKey; label: string; path: string }[] = [
  { key: "home", label: "Inicio", path: "/alumno" },
  { key: "explorar", label: "Explorar", path: "/alumno/explorar" },
  { key: "calendario", label: "Calendario", path: "/alumno/calendario" },
  { key: "favoritos", label: "Favoritos", path: "/alumno/favoritos" },
  { key: "misreservas", label: "Mis clases", path: "/alumno/mis-clases" },
];

export default function AlumnoNav({ active }: { active: AlumnoNavKey }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const data = useData();
  const nombre = currentUser?.nombre ?? "Invitado";
  const [search, setSearch] = useState("");
  const [fotoVersion, setFotoVersion] = useState(0);

  const buscar = () => {
    if (!search.trim()) return;
    navigate("/alumno/explorar", { state: { search } });
  };

  return (
    <header
      style={s(
        "position:sticky;top:0;z-index:40;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #E7EDF3;font-family:Manrope,system-ui,sans-serif;",
      )}
    >
      <div style={s("max-width:1240px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:26px;")}>
        <Logo size={36} to="/alumno" />
        <nav style={s("display:flex;gap:4px;")}>
          {ITEMS.map((it) => {
            const on = active === it.key;
            return (
              <span
                key={it.key}
                onClick={() => navigate(it.path)}
                className="ah-btn"
                style={s(
                  `cursor:pointer;padding:9px 15px;border-radius:10px;font:700 14.5px Manrope,sans-serif;color:${on ? "#0E2A47" : "#65788C"};background:${on ? "#EEF4FB" : "transparent"};`,
                )}
              >
                {it.label}
              </span>
            );
          })}
        </nav>
        <div style={s("margin-left:auto;display:flex;align-items:center;gap:10px;")}>
          <div
            style={s(
              "display:flex;align-items:center;gap:9px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:11px;padding:9px 13px;width:210px;",
            )}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9AAABA" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscar();
              }}
              placeholder="Buscar actividad…"
              style={s("border:none;outline:none;background:transparent;font-size:13.5px;color:#0E2A47;font-weight:600;width:100%;")}
            />
          </div>
          <NotificationBell />
          <div
            onClick={() => navigate("/alumno/perfil")}
            className="ah-btn"
            style={s(
              "cursor:pointer;display:flex;align-items:center;gap:9px;padding:5px 11px 5px 5px;border-radius:99px;border:1px solid #E7EDF3;background:#fff;",
            )}
          >
            <span onClick={(e) => e.stopPropagation()}>
              <Avatar
                usuarioId={currentUser?.id}
                nombre={nombre}
                size={30}
                fontSize={13}
                version={fotoVersion}
                onUpload={async (archivo) => {
                  await data.subirFotoPerfil(archivo);
                  setFotoVersion((v) => v + 1);
                }}
              />
            </span>
            <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>{nombre}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
