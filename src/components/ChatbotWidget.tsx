import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { s } from "../lib/style";
import { FAQS, buscarFaq } from "../lib/faqs";

/**
 * Botón flotante de ayuda en la esquina inferior derecha de las pantallas del alumno
 * (criterio 1 de E3A-HU01/02/03/06/08/12). Instructor y admin no lo ven: el chat de soporte
 * es para quien usa la plataforma como cliente, no para quien la opera.
 *
 * <p>Se monta una sola vez desde `AlumnoNav` en vez de pantalla por pantalla, así ninguna
 * se lo olvida al agregarse.
 *
 * <h2>Va en un portal a `document.body`, y no es opcional</h2>
 *
 * El widget quedaba clavado al **final de la página** en vez de seguir al viewport: había que
 * scrollear hasta el fondo de todo para encontrarlo. Es exactamente la trampa que ya está
 * documentada en `components/Modal.tsx`: `.ah-screen`, el contenedor raíz de cada pantalla,
 * tiene `animation: ahFade` y esa animación anima `transform`. **Un elemento con una animación
 * de `transform` crea un containing block para sus descendientes `position:fixed`**, así que
 * `bottom:24px` dejaba de medirse contra la ventana y pasaba a medirse contra el alto completo
 * del documento. Sacarlo del `<header>` (que tiene `backdrop-filter`, el mismo problema) no
 * alcanzaba: el `.ah-screen` de la pantalla lo seguía capturando un nivel más arriba.
 *
 * <p>Con el portal el widget no tiene ningún ancestro de la pantalla, así que ninguna propiedad
 * futura puede volver a capturarlo — y acompaña el scroll hasta llegar al pie, como cualquier
 * burbuja de soporte.
 *
 * <h2>Arranca colapsado</h2>
 *
 * Es una burbuja chica pegada al borde derecho que dice "¿Dudas?". Desplegado tapa 340px de
 * ancho por casi media pantalla de alto, y sobre la grilla de actividades del alumno eso es
 * justo lo que vino a mirar. El cuadro completo aparece recién al hacer click.
 *
 * <p>Las respuestas salen de `lib/faqs.ts` por coincidencia de palabras, no de un modelo: el
 * chatbot con IA es el ítem 11 del roadmap y depende de credenciales de Groq. El copy no
 * promete IA en ningún lado, y cuando no encuentra respuesta deriva a la pantalla de Ayuda.
 */

const ETIQUETA = "¿Dudas?";

interface Mensaje {
  de: "bot" | "yo";
  texto: string;
}

/**
 * Se puede usar **suelto** (se abre y cierra solo, que es como lo monta `AlumnoNav`) o
 * **controlado** desde afuera pasando `abierto` + `onAbiertoChange`. Lo segundo existe para
 * el botón "Iniciar chat" de la pantalla de Ayuda: el widget ya está montado ahí abajo, y ese
 * botón lo único que necesita es abrirlo.
 */
interface ChatbotWidgetProps {
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
}

export default function ChatbotWidget({ abierto: abiertoProp, onAbiertoChange }: ChatbotWidgetProps = {}) {
  const navigate = useNavigate();
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const controlado = abiertoProp !== undefined;
  const abierto = controlado ? abiertoProp : abiertoInterno;
  const setAbierto = (siguiente: boolean) => {
    if (!controlado) setAbiertoInterno(siguiente);
    onAbiertoChange?.(siguiente);
  };
  const [borrador, setBorrador] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      de: "bot",
      texto:
        "¡Hola! Puedo ayudarte con inscripciones, pagos, reseñas y denuncias. Escribime tu consulta o elegí una de abajo.",
    },
  ]);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  const responder = (consulta: string) => {
    const texto = consulta.trim();
    if (!texto) return;
    const faq = buscarFaq(texto);
    setMensajes((prev) => [
      ...prev,
      { de: "yo", texto },
      {
        de: "bot",
        texto:
          faq?.a ??
          "No encontré una respuesta para eso. Podés ver todas las preguntas frecuentes o escribirle al equipo desde la pantalla de Ayuda.",
      },
    ]);
    setBorrador("");
  };

  return createPortal(
    <>
      {/* Colapsada: burbuja angosta pegada al borde derecho, con el ícono y "¿Dudas?".
          Abierta: sólo la cruz, para no repetir el título que ya trae el encabezado. */}
      <button
        className="ah-btn"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        style={s(
          `position:fixed;right:0;bottom:26px;z-index:70;display:flex;align-items:center;gap:8px;background:#0E2A47;color:#fff;border:none;border-radius:${
            abierto ? "99px" : "99px 0 0 99px"
          };padding:${abierto ? "12px" : "12px 16px 12px 18px"};font:700 13.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 10px 26px rgba(14,42,71,.3);margin-right:${abierto ? "24px" : "0"};`,
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
          {abierto ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          )}
        </svg>
        {!abierto && ETIQUETA}
      </button>

      {abierto && (
        <div
          style={s(
            "position:fixed;right:24px;bottom:84px;z-index:70;width:340px;max-width:calc(100vw - 48px);background:#fff;border:1px solid #E7EDF3;border-radius:18px;box-shadow:0 16px 40px rgba(14,42,71,.2);display:flex;flex-direction:column;overflow:hidden;",
          )}
        >
          <div style={s("background:linear-gradient(135deg,#0FB8A9,#12B5A5);padding:16px 18px;color:#fff;")}>
            <div style={s("font:700 15px Space Grotesk,sans-serif;")}>Asistente de ActiveHub</div>
            <div style={s("font-size:12.5px;color:rgba(255,255,255,.85);font-weight:600;margin-top:2px;")}>
              Respuestas a las consultas más frecuentes
            </div>
          </div>

          <div style={s("flex:1;max-height:300px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;")}>
            {mensajes.map((m, i) => (
              <div
                key={i}
                style={s(
                  m.de === "bot"
                    ? "align-self:flex-start;max-width:88%;background:#F2F5F9;color:#33485E;border-radius:12px 12px 12px 4px;padding:10px 12px;font:600 13px Manrope,sans-serif;line-height:1.5;"
                    : "align-self:flex-end;max-width:88%;background:#0E2A47;color:#fff;border-radius:12px 12px 4px 12px;padding:10px 12px;font:600 13px Manrope,sans-serif;line-height:1.5;",
                )}
              >
                {m.texto}
              </div>
            ))}
            <div ref={finRef} />
          </div>

          {mensajes.length === 1 && (
            <div style={s("padding:0 14px 12px;display:flex;flex-direction:column;gap:6px;")}>
              {FAQS.slice(0, 3).map((f) => (
                <button
                  key={f.q}
                  className="ah-btn"
                  onClick={() => responder(f.q)}
                  style={s(
                    "text-align:left;background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:8px 11px;font:600 12.5px Manrope,sans-serif;color:#41566B;cursor:pointer;line-height:1.4;",
                  )}
                >
                  {f.q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              responder(borrador);
            }}
            style={s("border-top:1px solid #F1F4F8;padding:10px 12px;display:flex;gap:8px;align-items:center;")}
          >
            <input
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              placeholder="Escribí tu consulta…"
              style={s(
                "flex:1;border:1px solid #E2E9F0;border-radius:10px;padding:9px 11px;font:600 13px Manrope,sans-serif;color:#0E2A47;outline:none;",
              )}
            />
            <button
              type="submit"
              className="ah-btn"
              disabled={!borrador.trim()}
              style={s(
                `flex:none;width:36px;height:36px;border-radius:10px;border:none;background:${
                  borrador.trim() ? "#FF6A2B" : "#F1C7B4"
                };cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`,
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          </form>

          <button
            className="ah-btn"
            onClick={() => {
              setAbierto(false);
              navigate("/ayuda");
            }}
            style={s(
              "border:none;border-top:1px solid #F1F4F8;background:#fff;padding:11px;font:700 12.5px Manrope,sans-serif;color:#12B5A5;cursor:pointer;",
            )}
          >
            Ver todas las preguntas frecuentes →
          </button>
        </div>
      )}
    </>,
    document.body,
  );
}
