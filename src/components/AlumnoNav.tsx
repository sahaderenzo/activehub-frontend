import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import ChatbotWidget from "./ChatbotWidget";
import { areasDisponibles, homeDeArea, puedeVerItem } from "../lib/areas";
import { useAuth } from "../context/AuthContext";

type AlumnoNavKey = "home" | "explorar" | "calendario" | "favoritos" | "misclases";

const ITEMS: { key: AlumnoNavKey; label: string; path: string }[] = [
  { key: "home", label: "Inicio", path: "/alumno" },
  { key: "explorar", label: "Explorar", path: "/alumno/explorar" },
  { key: "calendario", label: "Calendario", path: "/alumno/calendario" },
  { key: "favoritos", label: "Favoritos", path: "/alumno/favoritos" },
  { key: "misclases", label: "Mis clases", path: "/alumno/mis-clases" },
];

export default function AlumnoNav({ active }: { active: AlumnoNavKey }) {
  const navigate = useNavigate();
  const { currentUser, permisos } = useAuth();
  const nombre = currentUser?.nombre ?? "Invitado";
  // RN-19: el menú lo arman los permisos, no el nombre del rol. Un rol al que el admin le
  // sacó `inscripciones.gestionar` no debe ver "Mis clases" ni "Calendario" — el backend
  // se las rechaza igual.
  const items = ITEMS.filter((it) => puedeVerItem(it.key, permisos));
  // Si además tiene permisos de instructor o de administración, el acceso va acá: sin esto
  // quedaba encerrado en el panel de alumno sin ninguna forma de llegar al resto.
  const otrasAreas = areasDisponibles(permisos).filter((a) => a.area !== "alumno");
  const [search, setSearch] = useState("");

  const buscar = () => {
    if (!search.trim()) return;
    navigate("/alumno/explorar", { state: { search } });
  };

  return (
    <>
    <header
      style={s(
        "position:sticky;top:0;z-index:40;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #E7EDF3;font-family:Manrope,system-ui,sans-serif;",
      )}
    >
      <div style={s("max-width:1240px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:26px;")}>
        <Logo size={36} to="/alumno" />
        <nav style={s("display:flex;gap:4px;")}>
          {items.map((it) => {
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
          {otrasAreas.map((a) => (
            <span
              key={a.area}
              onClick={() => navigate(homeDeArea(a.area, permisos))}
              className="ah-btn"
              style={s(
                "cursor:pointer;padding:9px 14px;border-radius:10px;font:700 13.5px Manrope,sans-serif;color:#0E2A47;border:1px solid #E7EDF3;background:#fff;white-space:nowrap;",
              )}
            >
              Ir a {a.label}
            </span>
          ))}
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
            {/* Sin `onUpload` a propósito: la foto se cambia SOLO desde Perfil, y ahí
                dentro del modo edición. Acá el avatar es identidad, no un control. */}
            <Avatar usuarioId={currentUser?.id} nombre={nombre} size={30} fontSize={13} />
            <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>{nombre}</span>
          </div>
        </div>
      </div>
    </header>
    {/* Fuera del <header> a propósito: ese header tiene `backdrop-filter`, que crea un
        containing block para `position:fixed` — adentro, el widget se posicionaría contra
        el header (60px de alto) en vez de contra el viewport y quedaría pegado arriba.
        Se monta acá y no en cada pantalla para que ninguna se olvide el botón flotante
        que pide el criterio 1 de E3A-HU01/02/03/06/08/12. */}
    <ChatbotWidget />
    </>
  );
}
