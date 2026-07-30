import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";

const HOME_BY_ROL: Record<string, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

export default function Errores() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const home = currentUser ? HOME_BY_ROL[currentUser.rol] : "/";

  return (
    <div
      className="ah-screen"
      style={s("min-height:100vh;background:#F4F7FA;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;")}
    >
      <div style={s("margin-bottom:28px;")}>
        <Logo />
      </div>
      <div
        style={s(
          "width:64px;height:64px;border-radius:99px;background:#FBEAEB;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;",
        )}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#BE3A3E" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h1 style={s("font:700 28px Space Grotesk,sans-serif;color:#0E2A47;letter-spacing:-.6px;margin:0 0 8px;")}>Página no encontrada</h1>
      <p style={s("color:#65788C;font-size:15px;max-width:380px;margin:0 0 26px;")}>
        La página que buscás no existe o cambió de lugar. Volvé al inicio para seguir navegando.
      </p>
      <button
        className="ah-btn"
        onClick={() => navigate(home)}
        style={s(
          "background:#FF6A2B;color:#fff;border:none;border-radius:12px;padding:13px 26px;font:700 14.5px Manrope;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.3);",
        )}
      >
        Volver al inicio
      </button>
    </div>
  );
}
