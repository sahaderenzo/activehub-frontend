import { useLocation, useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import { useAuth } from "../context/AuthContext";
import { puedeEntrarA } from "../lib/areas";

/**
 * El pie de página de ActiveHub, en **todas** las pantallas.
 *
 * <p>Vivía escrito dentro de `pages/public/Landing.tsx` y sólo se veía ahí: el resto de la
 * aplicación —incluida la pantalla pública de Ayuda, el login y el registro— terminaba en el aire,
 * sin los accesos a Ayuda, a las preguntas frecuentes ni al contacto, que es justo lo que alguien
 * busca al final de una pantalla en la que se quedó trabado.
 *
 * <h2>Se monta UNA vez, en `App.tsx`</h2>
 *
 * Igual que `ChatbotWidget`: si cada pantalla tuviera que acordarse de ponerlo, la próxima que se
 * agregue se lo va a olvidar. Va **después** de `<Routes>`, así que aparece debajo del contenido de
 * cualquier ruta sin que ninguna pantalla lo sepa.
 *
 * <h2>Dos variantes, y la elige la ruta</h2>
 *
 * En el área pública y en la del alumno va el pie completo (las cuatro columnas de la landing). En
 * los paneles de **instructor y administrador** va la versión compacta: son herramientas de
 * trabajo, y un pie con "Ser instructor" y "Registrarse" abajo del panel de administración no le
 * sirve a nadie — pero el acceso a Ayuda y la línea de copyright sí. La decisión se toma acá, por el
 * `pathname`, para no tener que tocar `App.tsx` ni los dos layouts cada vez que cambie.
 *
 * <h2>Los enlaces navegan, no decoran</h2>
 *
 * Es la regla que ya venía de la landing: nada de texto con cursor de mano que no hace nada. Ver
 * también la sección de Soporte del CLAUDE.md, donde se documentan los siete controles muertos que
 * había en este mismo pie y en `/ayuda`.
 *
 * <p>"Categorías" es el único que depende de dónde estás: la sección vive en la landing, así que
 * desde otra pantalla primero navega y la landing se encarga de scrollear (lee `state.seccion`,
 * mismo mecanismo que usa Ayuda).
 */
export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, permisos } = useAuth();

  // Los paneles de instructor y admin: pie compacto.
  const compacto = location.pathname.startsWith("/instructor") || location.pathname.startsWith("/admin");

  /** El perfil de quien está mirando, elegido por permisos y no por rol (ver `lib/areas.ts`). */
  const rutaDeMiPerfil = puedeEntrarA("alumno", permisos)
    ? "/alumno/perfil"
    : puedeEntrarA("instructor", permisos)
      ? "/instructor/perfil"
      : "/admin/perfil";

  const irACategorias = () => {
    if (location.pathname === "/") {
      document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/", { state: { seccion: "categorias" } });
  };

  const enlace = (texto: string, alHacerClick: () => void) => (
    <span key={texto} className="ah-link" onClick={alHacerClick} style={s("cursor:pointer;")}>
      {texto}
    </span>
  );

  /**
   * La línea de abajo. Reserva lugar a la derecha para la burbuja "¿Dudas?", que es `position:fixed`
   * en esa esquina y, sin el espacio, le queda encima al "Hecho en Mendoza".
   */
  const barraInferior = (
    <div style={s("border-top:1px solid rgba(255,255,255,.08);")}>
      <div
        style={s(
          "max-width:1200px;margin:0 auto;padding:18px 150px 18px 28px;font-size:13px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;",
        )}
      >
        <span>© 2026 ActiveHub · Proyecto Final · Ingeniería en Sistemas</span>
        <span>Hecho en Mendoza, Argentina</span>
      </div>
    </div>
  );

  if (compacto) {
    return (
      <footer style={s("background:#0A1F36;color:#9DB3C9;font-family:Manrope,system-ui,sans-serif;")}>
        <div
          style={s(
            "max-width:1200px;margin:0 auto;padding:22px 28px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;",
          )}
        >
          <div style={s("display:flex;align-items:center;gap:10px;")}>
            <div
              style={s(
                "width:28px;height:28px;border-radius:9px;background:linear-gradient(140deg,#12B5A5,#FF6A2B);display:flex;align-items:center;justify-content:center;font:700 15px Space Grotesk;color:#fff;",
              )}
            >
              A
            </div>
            <span style={s("font:700 16px Space Grotesk;color:#fff;")}>ActiveHub</span>
          </div>
          <div style={s("display:flex;gap:18px;font-size:14px;margin-left:auto;flex-wrap:wrap;")}>
            {enlace("Ayuda", () => navigate("/ayuda"))}
            {enlace("Preguntas frecuentes", () => navigate("/ayuda", { state: { seccion: "faqs" } }))}
            {enlace("Contacto", () => navigate("/ayuda", { state: { seccion: "contacto" } }))}
          </div>
        </div>
        {barraInferior}
      </footer>
    );
  }

  return (
    <footer style={s("background:#0A1F36;color:#9DB3C9;font-family:Manrope,system-ui,sans-serif;")}>
      <div
        className="ah-grid-4"
        style={s("max-width:1200px;margin:0 auto;padding:46px 28px 30px;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:30px;")}
      >
        <div>
          <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:14px;")}>
            <div
              style={s(
                "width:34px;height:34px;border-radius:10px;background:linear-gradient(140deg,#12B5A5,#FF6A2B);display:flex;align-items:center;justify-content:center;font:700 18px Space Grotesk;color:#fff;",
              )}
            >
              A
            </div>
            <span style={s("font:700 19px Space Grotesk;color:#fff;")}>ActiveHub</span>
          </div>
          <p style={s("font-size:14px;line-height:1.6;max-width:280px;margin:0;")}>
            La plataforma para encontrar actividades físicas y recreativas cerca tuyo e inscribirte a sus clases.
          </p>
        </div>
        <div>
          <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Plataforma</div>
          <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
            {enlace("Explorar", () => navigate("/alumno/explorar"))}
            {enlace("Categorías", irACategorias)}
            {/* No hay directorio público de instructores, así que el enlace es el alta, que sí
                existe. Con sesión abierta no tiene sentido ofrecer "Ser instructor": el registro
                pide crear otra cuenta. */}
            {!currentUser && enlace("Ser instructor", () => navigate("/registro"))}
          </div>
        </div>
        <div>
          <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Soporte</div>
          <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
            {/* Los tres van a `/ayuda`, que es donde vive cada cosa: las FAQ y el bloque de contacto
                son secciones de esa misma pantalla, y el `state` dice a cuál scrollear. */}
            {enlace("Ayuda", () => navigate("/ayuda"))}
            {enlace("Preguntas frecuentes", () => navigate("/ayuda", { state: { seccion: "faqs" } }))}
            {enlace("Contacto", () => navigate("/ayuda", { state: { seccion: "contacto" } }))}
          </div>
        </div>
        <div>
          <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Cuenta</div>
          <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
            {/* Con sesión abierta, "Iniciar sesión" y "Registrarse" son dos enlaces que no llevan a
                nada útil, así que en su lugar va el perfil. **Cuál perfil lo deciden los permisos**,
                no el rol ni la ruta (RN-19): un instructor mirando /ayuda tiene que ir al suyo, y
                mandarlo a /alumno/perfil lo rebotaría en `RequireArea`. */}
            {currentUser
              ? enlace("Mi perfil", () => navigate(rutaDeMiPerfil))
              : [
                  enlace("Iniciar sesión", () => navigate("/login")),
                  enlace("Registrarse", () => navigate("/registro")),
                ]}
          </div>
        </div>
      </div>
      {barraInferior}
    </footer>
  );
}
