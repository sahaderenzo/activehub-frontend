import { useNavigate } from "react-router-dom";
import { s } from "../../lib/style";
import Logo from "../../components/Logo";
import ActivityCard from "../../components/ActivityCard";
import {
  actividades,
  categorias,
  clases,
  disponibilidad,
  getClasesDeActividad,
  getTipoActividad,
  getUsuario,
} from "../../lib/mockData";

const CAT_ICONS: Record<string, { bg: string; stroke: string; path: string }> = {
  "cat-bienestar": {
    bg: "#E7F8F5",
    stroke: "#12B5A5",
    path: "M20.8 8.6c0 5.2-8.8 10.6-8.8 10.6S3.2 13.8 3.2 8.6a5 5 0 0 1 9-3 5 5 0 0 1 8.6 3Z",
  },
  "cat-aventura": {
    bg: "#FFF3E0",
    stroke: "#F5A623",
    path: "m3 20 6-11 4 7 3-5 5 9Z",
  },
  "cat-formacion": {
    bg: "#EAF1FE",
    stroke: "#3A6FF0",
    path: "m2 8 10-5 10 5-10 5Zm0 0v6M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5",
  },
  "cat-defensa": {
    bg: "#FBEAEB",
    stroke: "#E5484D",
    path: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z",
  },
};

const BENEFITS = [
  {
    title: "Reservá en segundos",
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

function countActividades(categoriaId: string): number {
  return actividades.filter((a) => getTipoActividad(a.tipoActividadId)?.categoriaId === categoriaId).length;
}

export default function Landing() {
  const navigate = useNavigate();
  const goExplorar = () => navigate("/alumno/explorar");
  const scrollToCategorias = () => document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth" });

  const featured = actividades.slice(0, 6).map((a) => {
    const propias = clases.filter((c) => c.actividadId === a.id);
    const proxima = propias.sort((x, y) => x.fechaHora.localeCompare(y.fechaHora))[0] ?? getClasesDeActividad(a.id)[0];
    const disp = proxima ? disponibilidad(proxima) : { label: "Disponible", type: "disponible" as const };
    const cupColor = disp.type === "sincupos" ? "#BE3A3E" : disp.type === "ultimos" ? "#B9741A" : "#0C8576";
    const instructor = getUsuario(a.instructorId);
    return { actividad: a, disp, cupColor, instructorNombre: instructor ? `${instructor.nombre} ${instructor.apellido}` : "" };
  });

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
            <span className="ah-link" style={s("cursor:pointer;")}>
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
            Cupos en tiempo real · +{actividades.length * 20} actividades en Mendoza
          </div>
          <h1 className="ah-hero-title" style={s("font:700 56px/1.05 Space Grotesk,sans-serif;letter-spacing:-1.5px;margin:0 0 18px;")}>
            Encontrá y reservá
            <br />
            actividades <span style={s("color:#FF6A2B;")}>cerca tuyo</span>
          </h1>
          <p style={s("font-size:18px;line-height:1.6;color:#54697E;max-width:480px;margin:0 0 30px;")}>
            Buscá clases deportivas y recreativas, mirá horarios y cupos disponibles, y reservá tu lugar en pocos pasos.
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
          <div style={s("display:flex;gap:26px;margin-top:26px;")}>
            <div>
              <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>+{actividades.length * 20}</div>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>Actividades</div>
            </div>
            <div>
              <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>48</div>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>Instructores</div>
            </div>
            <div>
              <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>4.8★</div>
              <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>Calificación media</div>
            </div>
          </div>
        </div>

        <div style={s("position:relative;")}>
          <div
            style={s(
              "position:relative;height:460px;border-radius:24px;overflow:hidden;background:repeating-linear-gradient(135deg,#1B3A5C 0 22px,#173250 22px 44px);box-shadow:0 30px 60px rgba(14,42,71,.22);",
            )}
          >
            <div
              style={s(
                "position:absolute;inset:0;background:linear-gradient(160deg,rgba(18,181,165,.30),rgba(255,106,43,.16));",
              )}
            />
            <div
              style={s(
                "position:absolute;left:0;right:0;bottom:0;top:0;display:flex;align-items:center;justify-content:center;color:#BFD3E6;font:600 13px ui-monospace,Menlo,monospace;letter-spacing:.5px;",
              )}
            >
              FOTO · personas entrenando
            </div>
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
        <div className="ah-grid-4" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;")}>
          {categorias.map((c) => {
            const icon = CAT_ICONS[c.id];
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
                <div style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>{countActividades(c.id)} actividades</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BENEFICIOS */}
      <section style={s("max-width:1200px;margin:0 auto;padding:46px 28px;")}>
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
        <div className="ah-grid-3" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:22px;")}>
          {featured.map(({ actividad, disp, cupColor, instructorNombre }) => (
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
              instructor={instructorNombre}
              price={actividad.precio}
              cupText={disp.label}
              cupColor={cupColor}
            />
          ))}
        </div>
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
              La plataforma para encontrar, reservar e inscribirte a actividades físicas y recreativas cerca tuyo.
            </p>
          </div>
          <div>
            <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Plataforma</div>
            <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
              <span className="ah-link" style={s("cursor:pointer;")}>
                Explorar
              </span>
              <span className="ah-link" style={s("cursor:pointer;")}>
                Categorías
              </span>
              <span className="ah-link" style={s("cursor:pointer;")}>
                Instructores
              </span>
            </div>
          </div>
          <div>
            <div style={s("color:#fff;font-weight:700;margin-bottom:12px;font-size:14px;")}>Soporte</div>
            <div style={s("display:flex;flex-direction:column;gap:9px;font-size:14px;")}>
              <span className="ah-link" onClick={() => navigate("/ayuda")} style={s("cursor:pointer;")}>
                Ayuda
              </span>
              <span className="ah-link" style={s("cursor:pointer;")}>
                Preguntas frecuentes
              </span>
              <span className="ah-link" style={s("cursor:pointer;")}>
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
