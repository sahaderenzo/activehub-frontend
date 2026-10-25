import { Children, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { s } from "../lib/style";

interface Props {
  /** Nombre accesible de la fila, p. ej. "Recomendado para vos". */
  etiqueta: string;
  children: ReactNode;
}

const flecha = (lado: "izq" | "der") =>
  s(
    `position:absolute;top:96px;${lado === "izq" ? "left:-18px" : "right:-18px"};z-index:2;width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid #E2E9F0;box-shadow:0 6px 16px rgba(14,42,71,.16);display:flex;align-items:center;justify-content:center;cursor:pointer;`,
  );

/**
 * Fila deslizable de tarjetas (las secciones de actividades del Home). En escritorio se ven 3 y
 * las flechas avanzan de a una "página"; cada flecha aparece sólo si hay algo hacia ese lado.
 * En pantallas angostas no hay flechas: se desliza con el dedo y se asoma la tarjeta siguiente
 * (ver `.ah-carrusel` en index.css). El desplazamiento es nativo (overflow + scroll-snap), así
 * que también funciona con el trackpad y con el teclado.
 */
export default function Carrusel({ etiqueta, children }: Props) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const medir = useCallback(() => {
    const p = pistaRef.current;
    if (!p) return;
    setPuedeIzq(p.scrollLeft > 4);
    setPuedeDer(p.scrollLeft + p.clientWidth < p.scrollWidth - 4);
  }, []);

  // Se mide cuando cambia el tamaño (y al montar, porque el observador avisa la primera vez).
  // Nunca de forma síncrona dentro del efecto: es `react-hooks/set-state-in-effect`.
  useEffect(() => {
    const p = pistaRef.current;
    if (!p) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => medir());
      ro.observe(p);
      return () => ro.disconnect();
    }
    const id = requestAnimationFrame(medir);
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", medir);
    };
  }, [medir, children]);

  const mover = (sentido: 1 | -1) => {
    const p = pistaRef.current;
    if (p) p.scrollBy({ left: sentido * p.clientWidth, behavior: "smooth" });
  };

  return (
    <div style={s("position:relative;")}>
      {puedeIzq && (
        <button type="button" className="ah-btn ah-carrusel-flecha" aria-label={`Ver anteriores de ${etiqueta}`} onClick={() => mover(-1)} style={flecha("izq")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2.4}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
      <div ref={pistaRef} className="ah-carrusel" role="region" aria-label={etiqueta} tabIndex={0} onScroll={medir}>
        {Children.map(children, (hijo) => (
          <div className="ah-carrusel-item">{hijo}</div>
        ))}
      </div>
      {puedeDer && (
        <button type="button" className="ah-btn ah-carrusel-flecha" aria-label={`Ver más de ${etiqueta}`} onClick={() => mover(1)} style={flecha("der")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E2A47" strokeWidth={2.4}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
