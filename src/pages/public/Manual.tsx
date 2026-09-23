import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { incluye } from "../../lib/texto";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { MANUAL, textoDeBloque } from "../../lib/manual";
import type { BloqueManual } from "../../lib/manual";

/**
 * Pantalla pública del **Manual de usuario** (`/manual`).
 *
 * <p>El manual existía únicamente como el Anexo 8 del informe: un archivo de texto que la
 * persona que usa el sistema no tiene ni va a buscar. La pantalla de Ayuda respondía dudas
 * sueltas (FAQ, guías rápidas, chat), pero nadie podía leer el recorrido completo de su rol
 * desde adentro de la aplicación. Esta pantalla es ese documento, con la misma identidad
 * visual que `/ayuda` y con lo que un texto plano no puede dar: índice navegable, buscador
 * que ignora tildes y una versión imprimible.
 *
 * <p>El contenido vive en `lib/manual.ts` y **no se escribe acá**: esta pantalla solo sabe
 * cómo se ve cada tipo de bloque. Ver el comentario de ese archivo.
 *
 * <p>Es pública a propósito, igual que `/ayuda`: buena parte del manual —crear la cuenta,
 * verificar el correo, iniciar sesión— hace falta justamente cuando todavía no se pudo entrar.
 */

/** El único marcado del texto: `**término**` se muestra en negrita. Nada de HTML. */
function conNegritas(texto: string) {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
    // Los índices impares son lo que estaba entre `**`: el separador capturado por el split.
    i % 2 === 1 ? (
      <strong key={i} style={s("color:#0E2A47;font-weight:800;")}>
        {parte}
      </strong>
    ) : (
      parte
    ),
  );
}

const ESTILO_P = "font-size:14.5px;line-height:1.7;color:#41566B;margin:0 0 12px;";
const ESTILO_ITEM = "font-size:14.5px;line-height:1.7;color:#41566B;margin:0 0 8px;";

function Bloque({ bloque }: { bloque: BloqueManual }) {
  if (bloque.tipo === "p") return <p style={s(ESTILO_P)}>{conNegritas(bloque.texto)}</p>;

  if (bloque.tipo === "sub")
    return <div style={s("font:700 15px Space Grotesk;color:#0E2A47;margin:20px 0 10px;")}>{bloque.texto}</div>;

  if (bloque.tipo === "pasos")
    return (
      <ol style={s("margin:0 0 14px;padding-left:22px;")}>
        {bloque.items.map((it, i) => (
          <li key={i} style={s(ESTILO_ITEM)}>
            {conNegritas(it)}
          </li>
        ))}
      </ol>
    );

  if (bloque.tipo === "lista")
    return (
      <ul style={s("margin:0 0 14px;padding-left:20px;")}>
        {bloque.items.map((it, i) => (
          <li key={i} style={s(ESTILO_ITEM)}>
            {conNegritas(it)}
          </li>
        ))}
      </ul>
    );

  // Tabla. El contenedor scrollea en horizontal: en un teléfono, el glosario de estados no
  // entra de ninguna manera y es preferible desplazarlo a romper el ancho de la pantalla.
  return (
    <div style={s("overflow-x:auto;margin:0 0 16px;border:1px solid #E7EDF3;border-radius:12px;")}>
      <table style={s("width:100%;border-collapse:collapse;font-size:13.5px;min-width:520px;")}>
        <thead>
          <tr>
            {bloque.cols.map((c) => (
              <th
                key={c}
                style={s(
                  "text-align:left;padding:11px 14px;background:#F4F7FA;color:#0E2A47;font:700 13px Manrope;border-bottom:1px solid #E7EDF3;white-space:nowrap;",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloque.filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((celda, j) => (
                <td
                  key={j}
                  style={s(
                    `padding:11px 14px;color:${j === 0 ? "#0E2A47" : "#41566B"};font-weight:${j === 0 ? 700 : 600};line-height:1.6;border-bottom:1px solid #EEF2F6;vertical-align:top;`,
                  )}
                >
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COLOR_ROL: Record<string, string> = {
  Todos: "#12B5A5",
  Alumno: "#3A6FF0",
  Instructor: "#FF6A2B",
  Administrador: "#7A5AF8",
  Referencia: "#65788C",
};

export default function Manual() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");
  /** Apartado resaltado en el índice. Arranca en el primero y lo mueve el scroll. */
  const [activo, setActivo] = useState<string>(MANUAL[0].apartados[0].id);

  const contenidoRef = useRef<HTMLDivElement>(null);

  const homeByRol: Record<string, string> = { ALUMNO: "/alumno", INSTRUCTOR: "/instructor", ADMIN: "/admin" };

  // El buscador filtra APARTADOS, no secciones: es la unidad que el índice ofrece y la que
  // tiene sentido leer entera. Una sección sin apartados que coincidan desaparece.
  const secciones = useMemo(() => {
    if (!search.trim()) return MANUAL;
    return MANUAL.map((sec) => ({
      ...sec,
      apartados: sec.apartados.filter(
        (ap) => incluye(ap.titulo, search) || ap.bloques.some((b) => incluye(textoDeBloque(b), search)),
      ),
    })).filter((sec) => sec.apartados.length > 0);
  }, [search]);

  const totalResultados = secciones.reduce((n, sec) => n + sec.apartados.length, 0);

  /**
   * Resalta en el índice el apartado que se está leyendo. Se calcula con el scroll y no con
   * un `IntersectionObserver` porque acá alcanza con "cuál es el último título que pasó por
   * arriba del pliegue", que es exactamente lo que la persona tiene delante.
   */
  useEffect(() => {
    const onScroll = () => {
      const titulos = contenidoRef.current?.querySelectorAll<HTMLElement>("[data-apartado]");
      if (!titulos) return;
      let visible: string | null = null;
      for (const t of titulos) {
        // 120 px: el alto del encabezado pegajoso más un respiro.
        if (t.getBoundingClientRect().top <= 120) visible = t.dataset.apartado ?? null;
      }
      if (visible) setActivo(visible);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const irA = (id: string) => {
    // El scroll nativo del ancla quedaría tapado por el encabezado pegajoso, así que se
    // desplaza a mano con el mismo margen que usa el resaltado del índice.
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActivo(id);
  };

  // Se puede llegar con el apartado pedido (`/manual` con `state.apartado`, que usa el acceso
  // desde Ayuda) o con el ancla en la URL (`/manual#a-2-6`), que es lo que queda al compartir
  // un enlace. Solo scrollea; el resaltado lo pone el propio scroll.
  useEffect(() => {
    const pedido = (location.state as { apartado?: string } | null)?.apartado ?? location.hash.replace("#", "");
    if (!pedido) return;
    const el = document.getElementById(pedido);
    if (!el) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
    });
  }, [location.state, location.hash]);

  return (
    <div className="ah-screen" style={s("min-height:100vh;background:#F4F7FA;")}>
      <header
        className="ah-no-print"
        style={s(
          "position:sticky;top:0;z-index:40;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #E7EDF3;",
        )}
      >
        <div style={s("max-width:1240px;margin:0 auto;padding:12px 28px;display:flex;align-items:center;gap:20px;")}>
          <Logo size={36} to={currentUser ? homeByRol[currentUser.rol] : "/"} />
          <div style={s("margin-left:auto;display:flex;align-items:center;gap:18px;")}>
            <span
              className="ah-link"
              onClick={() => navigate("/ayuda")}
              style={s("cursor:pointer;font:700 14px Manrope;color:#41566B;")}
            >
              Ayuda
            </span>
            <span
              className="ah-link"
              onClick={() => navigate(currentUser ? homeByRol[currentUser.rol] : "/")}
              style={s("cursor:pointer;font:700 14px Manrope;color:#41566B;")}
            >
              {currentUser ? "Volver a mi panel" : "Volver al inicio"}
            </span>
          </div>
        </div>
      </header>

      <div style={s("background:linear-gradient(135deg,#0E2A47,#143A5E);")}>
        <div style={s("max-width:900px;margin:0 auto;padding:44px 28px 40px;text-align:center;")}>
          <div
            style={s(
              "display:inline-block;background:rgba(18,181,165,.18);color:#5FE3D2;border-radius:99px;padding:5px 13px;font:700 12px Manrope;letter-spacing:.3px;margin-bottom:12px;",
            )}
          >
            Manual de usuario
          </div>
          <h1 className="ah-hero-title" style={s("font:700 34px Space Grotesk;color:#fff;letter-spacing:-.8px;margin:0 0 10px;")}>
            Cómo usar ActiveHub
          </h1>
          <p style={s("font-size:15.5px;color:#9DB3C9;margin:0 auto 22px;max-width:640px;line-height:1.6;")}>
            El recorrido completo de la plataforma, organizado por rol: primero lo que es común a los tres y después lo propio del
            Alumno, del Instructor y del Administrador.
          </p>
          <div
            className="ah-no-print"
            style={s("max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:7px;display:flex;align-items:center;gap:8px;box-shadow:0 14px 30px rgba(0,0,0,.18);")}
          >
            <div style={s("flex:1;display:flex;align-items:center;gap:10px;padding:9px 14px;")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en el manual…"
                style={s("border:none;outline:none;font:600 14.5px Manrope;color:#0E2A47;width:100%;")}
              />
            </div>
            {search.trim() && (
              <button
                className="ah-btn"
                onClick={() => setSearch("")}
                style={s("background:#F4F7FA;color:#41566B;border:none;border-radius:11px;padding:12px 16px;font:700 13.5px Manrope;cursor:pointer;")}
              >
                Limpiar
              </button>
            )}
          </div>
          {search.trim() && (
            <div style={s("margin-top:12px;font-size:13.5px;color:#9DB3C9;font-weight:600;")}>
              {totalResultados === 0
                ? "No encontramos apartados que coincidan."
                : `${totalResultados} ${totalResultados === 1 ? "apartado" : "apartados"}`}
            </div>
          )}
        </div>
      </div>

      <div
        className="ah-grid-side"
        style={s("max-width:1160px;margin:0 auto;padding:30px 28px 70px;display:grid;grid-template-columns:270px 1fr;gap:34px;align-items:start;")}
      >
        {/* Índice */}
        <aside
          className="ah-no-print ah-manual-indice"
          style={s("position:sticky;top:88px;max-height:calc(100vh - 120px);overflow:auto;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:18px 16px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}
        >
          <div style={s("font:700 13px Manrope;color:#7A8C9E;letter-spacing:.4px;text-transform:uppercase;margin:0 6px 12px;")}>
            Contenido
          </div>
          {secciones.map((sec) => (
            <div key={sec.id} style={s("margin-bottom:14px;")}>
              <div style={s("display:flex;align-items:center;gap:8px;margin:0 6px 7px;")}>
                <span style={s("font:700 14px Space Grotesk;color:#0E2A47;")}>
                  {sec.num ? `${sec.num}. ` : ""}
                  {sec.titulo}
                </span>
                <span
                  style={s(
                    `margin-left:auto;font:700 10.5px Manrope;color:${COLOR_ROL[sec.rol]};background:${COLOR_ROL[sec.rol]}1A;border-radius:99px;padding:3px 8px;white-space:nowrap;`,
                  )}
                >
                  {sec.rol}
                </span>
              </div>
              {sec.apartados.map((ap) => (
                <div
                  key={ap.id}
                  onClick={() => irA(ap.id)}
                  style={s(
                    `cursor:pointer;border-radius:9px;padding:7px 9px;font:600 13px Manrope;line-height:1.45;color:${activo === ap.id ? "#0C8576" : "#65788C"};background:${activo === ap.id ? "#E7F8F5" : "transparent"};`,
                  )}
                >
                  {ap.num ? `${ap.num} ` : ""}
                  {ap.titulo}
                </div>
              ))}
            </div>
          ))}
          {secciones.length === 0 && (
            <div style={s("padding:10px 6px;font-size:13px;color:#7A8C9E;font-weight:600;")}>Sin resultados.</div>
          )}
        </aside>

        {/* Contenido */}
        <div ref={contenidoRef}>
          {secciones.map((sec) => (
            <section key={sec.id} id={sec.id} style={s("margin-bottom:26px;")}>
              <div style={s("display:flex;align-items:center;gap:10px;margin:0 0 14px;")}>
                <h2 style={s("font:700 22px Space Grotesk;color:#0E2A47;letter-spacing:-.4px;margin:0;")}>
                  {sec.num ? `${sec.num}. ` : ""}
                  {sec.titulo}
                </h2>
                <span
                  style={s(
                    `font:700 11px Manrope;color:${COLOR_ROL[sec.rol]};background:${COLOR_ROL[sec.rol]}1A;border-radius:99px;padding:4px 10px;`,
                  )}
                >
                  {sec.rol}
                </span>
              </div>

              <div style={s("display:flex;flex-direction:column;gap:14px;")}>
                {sec.apartados.map((ap) => (
                  <article
                    key={ap.id}
                    id={ap.id}
                    style={s("background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:24px 26px;box-shadow:0 1px 2px rgba(14,42,71,.04);")}
                  >
                    <h3
                      data-apartado={ap.id}
                      style={s("font:700 17px Space Grotesk;color:#0E2A47;margin:0 0 14px;scroll-margin-top:100px;")}
                    >
                      {ap.num ? (
                        <span style={s("color:#12B5A5;margin-right:8px;")}>{ap.num}</span>
                      ) : null}
                      {ap.titulo}
                    </h3>
                    {ap.bloques.map((b, i) => (
                      <Bloque key={i} bloque={b} />
                    ))}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {secciones.length === 0 && (
            <div style={s("background:#fff;border:1px dashed #D5DEE7;border-radius:18px;padding:40px;text-align:center;color:#7A8C9E;font-weight:600;font-size:14px;")}>
              No encontramos apartados que coincidan con tu búsqueda.
            </div>
          )}

          <div
            className="ah-no-print"
            style={s("display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:22px;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:20px 24px;")}
          >
            <div style={s("font-size:13.5px;color:#65788C;font-weight:600;line-height:1.55;flex:1;min-width:220px;")}>
              ¿Te quedó una duda que el manual no responde? Escribinos desde la pantalla de Ayuda.
            </div>
            <button
              className="ah-btn"
              onClick={() => navigate("/ayuda", { state: { seccion: "contacto" } })}
              style={s("background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope;cursor:pointer;")}
            >
              Contactar con soporte
            </button>
            <button
              className="ah-btn"
              onClick={() => window.print()}
              style={s("background:#F4F7FA;color:#41566B;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope;cursor:pointer;")}
            >
              Imprimir / PDF
            </button>
            <button
              className="ah-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={s("background:#F4F7FA;color:#41566B;border:none;border-radius:11px;padding:11px 18px;font:700 13.5px Manrope;cursor:pointer;")}
            >
              Volver arriba
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
