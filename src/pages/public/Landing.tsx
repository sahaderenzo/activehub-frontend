import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import { normalizar } from "../../lib/texto";
import Logo from "../../components/Logo";
import ActivityCard from "../../components/ActivityCard";
import { CargandoSeccion } from "../../components/Cargando";
import { useData } from "../../context/DataContext";
import type { Actividad } from "../../lib/types";

/**
 * La Landing muestra el catálogo REAL.
 *
 * <p>Reportado: "aparecen actividades que no existen, sin fotos, y cantidades falsas (más de
 * 160 actividades es falso)". Era literal: esta pantalla era la última que seguía leyendo el
 * dataset de demo de `lib/mockData.ts`. De ahí los tres síntomas juntos —
 *
 * <ul>
 *   <li>las tarjetas eran actividades inventadas que no están en la base, así que hacerles
 *       click llevaba a un detalle inexistente;</li>
 *   <li>no tenían foto porque `ActivityPhoto` las pide por id contra la API y esos ids no
 *       existen, así que siempre caía al placeholder "FOTO · nombre";</li>
 *   <li>el contador decía <code>actividades.length * 20</code> — ocho actividades de demo
 *       multiplicadas por veinte, un número puesto para que la maqueta se viera poblada.</li>
 * </ul>
 *
 * <p>Ahora todo sale de `useData()`, el mismo catálogo público que usan Home y Explorar, y
 * **los números son cuentas sobre esos datos**: si no hay actividades publicadas, la Landing
 * lo dice en vez de inventar. Los dos que no se pueden derivar del catálogo (una calificación
 * media sin reseñas, por ejemplo) directamente no se muestran.
 */

/**
 * Ícono por NOMBRE de categoría, no por id: las categorías son un ABM (el admin crea y borra)
 * y sus ids son UUID de la base, así que un `Record` por id no podía funcionar contra datos
 * reales. Lo que no está en la lista usa el ícono neutro — misma regla que `lib/nivelStyle.ts`.
 */
const CAT_ICONS: Record<string, { bg: string; stroke: string; path: string }> = {
  bienestar: {
    bg: "#E7F8F5",
    stroke: "#12B5A5",
    path: "M20.8 8.6c0 5.2-8.8 10.6-8.8 10.6S3.2 13.8 3.2 8.6a5 5 0 0 1 9-3 5 5 0 0 1 8.6 3Z",
  },
  aventura: {
    bg: "#FFF3E0",
    stroke: "#F5A623",
    path: "m3 20 6-11 4 7 3-5 5 9Z",
  },
  "formacion tecnica": {
    bg: "#EAF1FE",
    stroke: "#3A6FF0",
    path: "m2 8 10-5 10 5-10 5Zm0 0v6M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5",
  },
  "defensa personal": {
    bg: "#FBEAEB",
    stroke: "#E5484D",
    path: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z",
  },
};

const CAT_ICON_NEUTRO = {
  bg: "#F2F5F9",
  stroke: "#65788C",
  path: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z",
};

function iconoDeCategoria(nombre: string) {
  return CAT_ICONS[normalizar(nombre)] ?? CAT_ICON_NEUTRO;
}

/** Igual que en Home y Explorar: sale de la próxima clase que trae el catálogo. */
function disponibilidadDe(a: Actividad): { label: string; type: "disponible" | "ultimos" | "sincupos" } {
  const p = a.proximaClase;
  if (!p) return { label: "Disponible", type: "disponible" };
  const libres = p.cuposMax - p.cuposOcupados;
  if (libres <= 0) return { label: "Sin cupos", type: "sincupos" };
  if (libres <= 3) return { label: `${libres} cupos · Últimos`, type: "ultimos" };
  return { label: "Disponible", type: "disponible" };
}

const BENEFITS = [
  {
    title: "Inscribite en segundos",
    text: "Elegí horario y cupo disponible, confirmá y listo. Sin llamados ni formularios eternos.",
    path: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  },
  {
    title: "Cupos en tiempo real",
    text: "Vas a ver siempre la disponibilidad actualizada, sin sorpresas al llegar a la clase.",
    path: "M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  },
  {
    title: "Pagos seguros",
    text: "Pagá con Mercado Pago o en efectivo directo con tu instructor, como te quede mejor.",
    path: "M2 8h20M2 8v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8l2-4h16l2 4",
  },
  {
    title: "Calificaciones reales",
    text: "Reseñas de alumnos que ya tomaron la clase, para que elijas con más info.",
    path: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { actividades, categorias, getTipoActividad, instructorNombre, cargandoCatalogo } = useData();
  const goExplorar = () => navigate("/alumno/explorar");
  const scrollToCategorias = () => document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth" });
  const scrollToComoFunciona = () => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });

  const countActividades = (categoriaId: string): number =>
    actividades.filter((a) => getTipoActividad(a.tipoActividadId)?.categoriaId === categoriaId).length;

  /**
   * Los tres números del hero, calculados sobre el catálogo real:
   *
   * - **Actividades**: las publicadas. Sin multiplicador y sin "+".
   * - **Instructores**: cuántos tienen al menos una actividad publicada, no un 48 fijo.
   * - **Calificación media**: el promedio de las actividades **ya calificadas**. Si ninguna
   *   tiene reseñas todavía no hay promedio que mostrar, así que la tarjeta no aparece —
   *   antes decía "4.8★" en una plataforma sin una sola reseña.
   */
  const metricas = useMemo(() => {
    const calificadas = actividades.filter((a) => a.rating > 0);
    return {
      actividades: actividades.length,
      instructores: new Set(actividades.map((a) => a.instructorId)).size,
      rating: calificadas.length
        ? calificadas.reduce((sum, a) => sum + a.rating, 0) / calificadas.length
        : null,
    };
  }, [actividades]);

  // Las mejor calificadas primero, y entre las que no tienen reseñas las más baratas: es una
  // vidriera, no el catálogo entero (para eso está "Explorar todas").
  const featured = useMemo(
    () =>
      [...actividades]
        .sort((a, b) => b.rating - a.rating || a.precio - b.precio)
        .slice(0, 6)
        .map((a) => {
          const disp = disponibilidadDe(a);
          const cupColor = disp.type === "sincupos" ? "#BE3A3E" : disp.type === "ultimos" ? "#B9741A" : "#0C8576";
          return { actividad: a, disp, cupColor, instructorNombre: instructorNombre[a.instructorId] ?? "" };
        }),
    [actividades, instructorNombre],
  );

  return (
    <div className="ah-screen">
      <header
        style={s(
          "position:sticky;top:0;z-index:40;background:rgba(255,255,255,.86);backdrop-filter:blur(10px);border-bottom:1px solid #E7EDF3;",
        )}
      >
        <div style={s("max-width:1200px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;gap:30px;")}>
          <Logo />
          <nav style={s("display:flex;gap:26px;margin-left:8px;font-weight:600;font-size:15px;color:#41566B;")}>
            <span className="ah-link" style={s("cursor:pointer;")} onClick={goExplorar}>
              Explorar
            </span>
            <span className="ah-link" style={s("cursor:pointer;")} onClick={scrollToCategorias}>
              Categorías
            </span>
            {/* Tenía cursor de mano y no hacía nada. "Cómo funciona" es la franja de
                beneficios de más abajo, así que baja hasta ahí. */}
            <span className="ah-link" style={s("cursor:pointer;")} onClick={scrollToComoFunciona}>
              Cómo funciona
            </span>
            <span className="ah-link" style={s("cursor:pointer;")} onClick={() => navigate("/ayuda")}>
              Ayuda
            </span>
          </nav>
          <div style={s("margin-left:auto;display:flex;align-items:center;gap:12px;")}>
            <button
              className="ah-btn"
              onClick={() => navigate("/login")}
              style={s(
                "background:#fff;color:#0E2A47;border:1px solid #D6DEE7;border-radius:11px;padding:11px 18px;font:700 14.5px Manrope,sans-serif;cursor:pointer;",
              )}
            >
              Iniciar sesión
            </button>
            <button
              className="ah-btn"
              onClick={() => navigate("/registro")}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px 20px;font:700 14.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.28);",
              )}
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="ah-grid-side"
        style={s("max-width:1200px;margin:0 auto;padding:56px 28px 20px;display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;")}
      >
        <div>
          <div
            style={s(
              "display:inline-flex;align-items:center;gap:8px;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:7px 14px;border-radius:999px;font:700 13px Manrope,sans-serif;margin-bottom:22px;",
            )}
          >
            <span style={s("width:7px;height:7px;border-radius:99px;background:#12B5A5;animation:ahPulse 1.8s infinite;")} />
            {/* El número es el conteo real. Mientras el catálogo viaja, la chapa dice sólo la
                promesa que no depende de datos, en vez de un "0 actividades" transitorio. */}
            Cupos en tiempo real
            {!cargandoCatalogo && metricas.actividades > 0 && (
              <> · {metricas.actividades} {metricas.actividades === 1 ? "actividad" : "actividades"} en Mendoza</>
            )}
          </div>
          <h1 className="ah-hero-title" style={s("font:700 56px/1.05 Space Grotesk,sans-serif;letter-spacing:-1.5px;margin:0 0 18px;")}>
            Encontrá e inscribite
            <br />
            en actividades <span style={s("color:#FF6A2B;")}>cerca tuyo</span>
          </h1>
          <p style={s("font-size:18px;line-height:1.6;color:#54697E;max-width:480px;margin:0 0 30px;")}>
            Buscá clases deportivas y recreativas, mirá horarios y cupos disponibles, e inscribite en pocos pasos.
            Todo en un solo lugar.
          </p>

          <div
            style={s(
              "background:#fff;border:1px solid #E7EDF3;border-radius:18px;box-shadow:0 18px 44px rgba(14,42,71,.10);padding:10px;display:flex;align-items:center;gap:6px;",
            )}
          >
            <div style={s("flex:1.3;display:flex;align-items:center;gap:10px;padding:10px 14px;")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <div style={s("flex:1;")}>
                <div style={s("font:700 11px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>Actividad</div>
                <div style={s("font-size:14.5px;font-weight:600;color:#0E2A47;")}>Meditación, running…</div>
              </div>
            </div>
            <div style={s("width:1px;height:34px;background:#E7EDF3;")} />
            <div style={s("flex:1;display:flex;align-items:center;gap:10px;padding:10px 14px;")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6A2B" strokeWidth={2}>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div style={s("flex:1;")}>
                <div style={s("font:700 11px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>Ubicación</div>
                <div style={s("font-size:14.5px;font-weight:600;color:#0E2A47;")}>Mendoza</div>
              </div>
            </div>
            <div style={s("width:1px;height:34px;background:#E7EDF3;")} />
            <div style={s("flex:.9;display:flex;align-items:center;gap:10px;padding:10px 14px;")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#41566B" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <div style={s("flex:1;")}>
                <div style={s("font:700 11px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;")}>Fecha</div>
                <div style={s("font-size:14.5px;font-weight:600;color:#0E2A47;")}>Esta semana</div>
              </div>
            </div>
            <button
              className="ah-btn"
              onClick={goExplorar}
              style={s(
                "background:#FF6A2B;color:#fff;border:none;border-radius:13px;padding:15px 26px;font:700 15px Manrope,sans-serif;cursor:pointer;box-shadow:0 8px 18px rgba(255,106,43,.3);",
              )}
            >
              Buscar
            </button>
          </div>
          {/*
            Tres cuentas sobre el catálogo real. Antes eran `actividades.length * 20`, un 48
            escrito a mano y un "4.8★" fijo: los tres números que el usuario reportó como
            falsos. La calificación media sólo aparece si hay alguna actividad calificada.
          */}
          {!cargandoCatalogo && metricas.actividades > 0 && (
            <div style={s("display:flex;gap:26px;margin-top:26px;")}>
              <div>
                <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{metricas.actividades}</div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  {metricas.actividades === 1 ? "Actividad" : "Actividades"}
                </div>
              </div>
              <div>
                <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{metricas.instructores}</div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  {metricas.instructores === 1 ? "Instructor" : "Instructores"}
                </div>
              </div>
              {metricas.rating !== null && (
                <div>
                  <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{metricas.rating.toFixed(1)}★</div>
                  <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>Calificación media</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={s("position:relative;")}>
          {/*
            La foto del hero vive en `public/`, no en `src/assets`: es un archivo fijo del sitio,
            no un módulo que necesite pasar por el bundler, y así se referencia con una ruta
            absoluta estable. El rayado diagonal queda de fondo por si la imagen tarda o falla.

            El gradiente teal/naranja sigue encima de la foto a propósito: unifica el hero con el
            resto de la marca y, sobre todo, mantiene el contraste para las tarjetas flotantes
            blancas que van apoyadas sobre esta caja.
          */}
          <div
            style={s(
              "position:relative;height:460px;border-radius:24px;overflow:hidden;background:repeating-linear-gradient(135deg,#1B3A5C 0 22px,#173250 22px 44px);box-shadow:0 30px 60px rgba(14,42,71,.22);",
            )}
          >
            <img
              src="/hero-entrenando.jpg"
              alt="Persona entrenando con banda elástica en un gimnasio"
              loading="eager"
              style={s("position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;")}
            />
            <div
              style={s(
                "position:absolute;inset:0;background:linear-gradient(160deg,rgba(18,181,165,.30),rgba(255,106,43,.16));",
              )}
            />
          </div>
          <div
            style={s(
              "position:absolute;top:24px;left:-22px;background:#fff;border:1px solid #E7EDF3;border-radius:15px;padding:13px 16px;box-shadow:0 14px 30px rgba(14,42,71,.16);display:flex;align-items:center;gap:11px;animation:ahPop .5s .2s both;",
            )}
          >
            <div
              style={s(
                "width:38px;height:38px;border-radius:10px;background:#E7F8F5;display:flex;align-items:center;justify-content:center;",
              )}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12B5A5" strokeWidth={2.4}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div style={s("font:700 14px Manrope;color:#0E2A47;")}>PreInscripción confirmada</div>
              <div style={s("font-size:12px;color:#7A8C9E;font-weight:600;")}>Senderismo · Mañana 8:30</div>
            </div>
          </div>
          <div
            style={s(
              "position:absolute;bottom:30px;right:-20px;background:#fff;border:1px solid #E7EDF3;border-radius:15px;padding:13px 16px;box-shadow:0 14px 30px rgba(14,42,71,.16);animation:ahPop .5s .35s both;",
            )}
          >
            <div style={s("font:700 12px Manrope;color:#90A1B2;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;")}>
              Running en Grupo
            </div>
            <div style={s("display:flex;align-items:center;gap:8px;")}>
              <div style={s("font:700 18px Space Grotesk;color:#0E2A47;")}>2 cupos</div>
              <span
                style={s(
                  "background:#FFF3E0;color:#B9741A;border:1px solid #F6E2C0;padding:3px 9px;border-radius:99px;font:700 11px Manrope;",
                )}
              >
                Últimos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section id="categorias" style={s("max-width:1200px;margin:0 auto;padding:48px 28px 10px;")}>
        <div style={s("display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;")}>
          <h2 style={s("font:700 30px Space Grotesk;letter-spacing:-.6px;margin:0;")}>Categorías destacadas</h2>
          <span className="ah-link" onClick={goExplorar} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:15px;")}>
            Ver todas →
          </span>
        </div>
        {cargandoCatalogo && <CargandoSeccion seccion="categorías" />}
        {!cargandoCatalogo && categorias.length === 0 && (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            Todavía no hay categorías cargadas.
          </div>
        )}
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;")}>
          {(cargandoCatalogo ? [] : categorias).map((c) => {
            const icon = iconoDeCategoria(c.nombre);
            return (
              <div
                key={c.id}
                className="ah-hov"
                onClick={goExplorar}
                style={s(
                  "cursor:pointer;background:#fff;border:1px solid #E7EDF3;border-radius:18px;padding:22px 20px;box-shadow:0 1px 2px rgba(14,42,71,.04);",
                )}
              >
                <div
                  style={s(
                    `width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;background:${icon.bg};`,
                  )}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={icon.stroke} strokeWidth={2}>
                    <path d={icon.path} />
                  </svg>
                </div>
                <div style={s("font:700 16px Manrope;color:#0E2A47;margin-bottom:4px;")}>{c.nombre}</div>
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  {countActividades(c.id)} {countActividades(c.id) === 1 ? "actividad" : "actividades"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BENEFICIOS — el destino de "Cómo funciona" del menú. */}
      <section id="como-funciona" style={s("max-width:1200px;margin:0 auto;padding:46px 28px;")}>
        <div
          className="ah-grid-4"
          style={s(
            "background:#0E2A47;border-radius:26px;padding:42px 44px;display:grid;grid-template-columns:repeat(4,1fr);gap:30px;position:relative;overflow:hidden;",
          )}
        >
          <div
            style={s(
              "position:absolute;top:-60px;right:-40px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(18,181,165,.32),transparent 70%);",
            )}
          />
          {BENEFITS.map((b) => (
            <div key={b.title} style={s("position:relative;")}>
              <div
                style={s(
                  "width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;margin-bottom:15px;",
                )}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22D3C0" strokeWidth={2}>
                  <path d={b.path} />
                </svg>
              </div>
              <div style={s("font:700 17px Manrope;color:#fff;margin-bottom:7px;")}>{b.title}</div>
              <div style={s("font-size:14px;line-height:1.55;color:#9DB3C9;")}>{b.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DESTACADAS */}
      <section style={s("max-width:1200px;margin:0 auto;padding:10px 28px 60px;")}>
        <div style={s("display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;")}>
          <h2 style={s("font:700 30px Space Grotesk;letter-spacing:-.6px;margin:0;")}>Actividades destacadas</h2>
          <span className="ah-link" onClick={goExplorar} style={s("font-weight:700;color:#FF6A2B;cursor:pointer;font-size:15px;")}>
            Explorar todas →
          </span>
        </div>
        {cargandoCatalogo ? (
          <CargandoSeccion seccion="actividades" />
        ) : featured.length === 0 ? (
          <div style={s("background:#fff;border:1px dashed #D6DEE7;border-radius:18px;padding:40px 20px;text-align:center;color:#7A8C9E;font-weight:600;")}>
            Todavía no hay actividades publicadas.
          </div>
        ) : (
          <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:22px;")}>
            {featured.map(({ actividad, disp, cupColor, instructorNombre: instructor }) => (
              <ActivityCard
                key={actividad.id}
                id={actividad.id}
                name={actividad.nombre}
                catName={getTipoActividad(actividad.tipoActividadId)?.nombre ?? ""}
                nivel={actividad.nivelIntensidad}
                photoTint={actividad.photoTint}
                statusType={disp.type}
                rating={actividad.rating}
                location={actividad.ubicacion}
                instructor={instructor}
                price={actividad.precio}
                cupText={disp.label}
                cupColor={cupColor}
              />
            ))}
          </div>
        )}
      </section>

      <footer style={s("background:#0A1F36;color:#9DB3C9;")}>
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
            {/*
              Los tres eran texto con cursor de mano y sin `onClick`, como antes lo eran los de
              "Soporte". "Instructores" además no tenía a dónde ir: no existe un directorio
              público de instructores, así que en su lugar va el alta, que sí existe.
            */}
            <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
              <span className="ah-link" onClick={goExplorar} style={s("cursor:pointer;")}>
                Explorar
              </span>
              <span className="ah-link" onClick={scrollToCategorias} style={s("cursor:pointer;")}>
                Categorías
              </span>
              <span className="ah-link" onClick={() => navigate("/registro")} style={s("cursor:pointer;")}>
                Ser instructor
              </span>
            </div>
          </div>
          <div>
            <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Soporte</div>
            <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
              {/* Los tres van a `/ayuda`, que es donde vive cada cosa: las FAQ y el bloque de
                  contacto son secciones de esa misma pantalla. El `state` le dice a cuál
                  scrollear. Antes sólo "Ayuda" tenía `onClick`: los otros dos eran texto con
                  cursor de mano que no hacía nada. */}
              <span className="ah-link" onClick={() => navigate("/ayuda")} style={s("cursor:pointer;")}>
                Ayuda
              </span>
              <span
                className="ah-link"
                onClick={() => navigate("/ayuda", { state: { seccion: "faqs" } })}
                style={s("cursor:pointer;")}
              >
                Preguntas frecuentes
              </span>
              <span
                className="ah-link"
                onClick={() => navigate("/ayuda", { state: { seccion: "contacto" } })}
                style={s("cursor:pointer;")}
              >
                Contacto
              </span>
            </div>
          </div>
          <div>
            <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Cuenta</div>
            <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
              <span className="ah-link" onClick={() => navigate("/login")} style={s("cursor:pointer;")}>
                Iniciar sesión
              </span>
              <span className="ah-link" onClick={() => navigate("/registro")} style={s("cursor:pointer;")}>
                Registrarse
              </span>
            </div>
          </div>
        </div>
        <div style={s("border-top:1px solid rgba(255,255,255,.08);")}>
          <div style={s("max-width:1200px;margin:0 auto;padding:18px 28px;font-size:13px;display:flex;justify-content:space-between;")}>
            © 2026 ActiveHub · Proyecto Final · Ingeniería en Sistemas<span>Hecho en Mendoza, Argentina</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
