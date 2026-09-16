import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  const { currentUser, permisos, puede, logout } = useAuth();
  const nombre = currentUser?.nombre ?? "Invitado";
  // RN-19: el menú lo arman los permisos, no el nombre del rol. Un rol al que el admin le
  // sacó `inscripciones.gestionar` no debe ver "Mis clases" ni "Calendario" — el backend
  // se las rechaza igual.
  const items = ITEMS.filter((it) => puedeVerItem(it.key, permisos));
  // Si además tiene permisos de instructor o de administración, el acceso va acá: sin esto
  // quedaba encerrado en el panel de alumno sin ninguna forma de llegar al resto.
  const otrasAreas = areasDisponibles(permisos).filter((a) => a.area !== "alumno");
  const [search, setSearch] = useState("");

  /**
   * Menú de la cuenta. "Mi perfil" ya existía (el chip navegaba directo); los otros dos son
   * atajos: cerrar sesión y ver las reseñas propias obligaban a pasar por el Perfil, que es
   * una pantalla entera para dos acciones de un click.
   */
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cierra al hacer click afuera y con Escape: un dropdown que sólo cierra con su propio
  // botón queda abierto tapando la pantalla apenas el usuario sigue navegando.
  useEffect(() => {
    if (!menuAbierto) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuAbierto]);

  const irA = (path: string) => {
    setMenuAbierto(false);
    navigate(path);
  };

  const cerrarSesion = () => {
    setMenuAbierto(false);
    logout();
    navigate("/");
  };

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
        {/* `flex:none`: la navegación NO se encoge. Es un hijo flex como cualquier otro y por
            defecto cede espacio cuando el bloque de la derecha crece — al sumarle la flechita
            al chip de usuario, los ítems se apretaban y "Mis clases" partía en dos líneas, que
            se lee como si faltaran secciones. Lo que cede ahora es el buscador. */}
        <nav style={s("display:flex;gap:4px;flex:none;")}>
          {items.map((it) => {
            const on = active === it.key;
            return (
              <span
                key={it.key}
                onClick={() => navigate(it.path)}
                className="ah-btn"
                style={s(
                  `cursor:pointer;white-space:nowrap;padding:9px 15px;border-radius:10px;font:700 14.5px Manrope,sans-serif;color:${on ? "#0E2A47" : "#65788C"};background:${on ? "#EEF4FB" : "transparent"};`,
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
              // El buscador es lo que cede espacio cuando la ventana se angosta: baja de 210px
              // hasta 110px antes de que se toque ningún ítem del menú.
              "display:flex;align-items:center;gap:9px;background:#F2F5F9;border:1px solid #E7EDF3;border-radius:11px;padding:9px 13px;width:210px;min-width:110px;flex-shrink:1;",
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
          <div ref={menuRef} style={s("position:relative;")}>
            <div
              onClick={() => setMenuAbierto((v) => !v)}
              className="ah-btn"
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
              style={s(
                `cursor:pointer;display:flex;align-items:center;gap:9px;padding:5px 11px 5px 5px;border-radius:99px;border:1px solid ${menuAbierto ? "#C9D6E2" : "#E7EDF3"};background:${menuAbierto ? "#F7FAFC" : "#fff"};`,
              )}
            >
              {/* Sin `onUpload` a propósito: la foto se cambia SOLO desde Perfil, y ahí
                  dentro del modo edición. Acá el avatar es identidad, no un control. */}
              <Avatar usuarioId={currentUser?.id} nombre={nombre} size={30} fontSize={13} />
              <span style={s("font:700 13.5px Manrope,sans-serif;color:#0E2A47;")}>{nombre}</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A8C9E"
                strokeWidth={2.4}
                style={{ transform: menuAbierto ? "rotate(180deg)" : undefined, transition: "transform .15s ease" }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            {menuAbierto && (
              <div
                role="menu"
                style={s(
                  "position:absolute;top:calc(100% + 8px);right:0;min-width:196px;background:#fff;border:1px solid #E7EDF3;border-radius:13px;box-shadow:0 14px 34px rgba(14,42,71,.16);padding:6px;z-index:50;",
                )}
              >
                <MenuItem onClick={() => irA("/alumno/perfil")} label="Mi perfil">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </MenuItem>
                {/* Sólo si el rol puede escribir reseñas: es el permiso que gatea la pantalla
                    en `App.tsx`, y un atajo a un 403 es peor que no tener el atajo. */}
                {puede("resenias.escribir") && (
                  <MenuItem onClick={() => irA("/alumno/mis-resenas")} label="Mis reseñas">
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </MenuItem>
                )}
                <div style={s("height:1px;background:#F1F4F8;margin:5px 8px;")} />
                <MenuItem onClick={cerrarSesion} label="Cerrar sesión" color="#BE3A3E">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </MenuItem>
              </div>
            )}
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

function MenuItem({
  onClick,
  label,
  color = "#0E2A47",
  children,
}: {
  onClick: () => void;
  label: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <button
      role="menuitem"
      className="ah-btn"
      onClick={onClick}
      style={s(
        `width:100%;display:flex;align-items:center;gap:10px;background:transparent;border:none;border-radius:9px;padding:9px 11px;font:700 13.5px Manrope,sans-serif;color:${color};cursor:pointer;text-align:left;`,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      {label}
    </button>
  );
}
