import { useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";
import { s } from "../lib/style";
import type { FotoGaleria } from "../lib/galeria";

interface GaleriaActividadProps {
  /** Las fotos en orden, ya sin repetidas (`fotosDeActividad`). */
  fotos: FotoGaleria[];
  nombre: string;
  /** Color de fondo mientras no hay foto (el `photoTint` de la actividad). */
  tinte: string;
  /** Lo que va encima de la foto, arriba a la izquierda (el estado de la clase). */
  encima?: ReactNode;
}

/** Desplazamiento horizontal mínimo, en px, para que un deslizamiento cuente como cambio de foto. */
const UMBRAL_DESLIZAR = 40;

const flecha = (lado: "izq" | "der") =>
  s(
    `position:absolute;top:50%;${lado === "izq" ? "left" : "right"}:12px;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.9);color:#0E2A47;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(14,42,71,.25);`,
  );

/**
 * Carrusel de fotos del detalle de una actividad: la foto grande con flechas (circulares),
 * contador "N / M", miniaturas, teclado (← →) y deslizamiento con el dedo.
 *
 * Una foto que no carga (archivo borrado, portada inexistente) se saca de la lista en vez de
 * dejar el ícono de imagen rota; sin ninguna, queda el fondo con "FOTO · nombre".
 * Lo usa `alumno/Detalle.tsx`; montarlo con `key` = id de la actividad para que la foto
 * elegida no pase de una actividad a otra.
 */
export default function GaleriaActividad({ fotos, nombre, tinte, encima }: GaleriaActividadProps) {
  const [rotas, setRotas] = useState<Set<string>>(new Set());
  const [elegida, setElegida] = useState<string | null>(null);
  const inicioToque = useRef<number | null>(null);

  const visibles = fotos.filter((f) => !rotas.has(f.clave));
  const total = visibles.length;
  // Se guarda la CLAVE elegida y el índice se deriva: si una foto se cae de la lista, la elegida
  // sigue siendo la misma (o la primera, si la que se cayó era ésa).
  const indice = Math.max(0, visibles.findIndex((f) => f.clave === elegida));
  const actual = visibles[indice];

  const ir = (n: number) => {
    if (total === 0) return;
    setElegida(visibles[(n + total) % total].clave);
  };
  const marcarRota = (clave: string) => setRotas((prev) => new Set(prev).add(clave));

  const alTeclear = (e: KeyboardEvent) => {
    if (total < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      ir(indice - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      ir(indice + 1);
    }
  };
  const alTocar = (e: TouchEvent) => {
    inicioToque.current = e.touches[0]?.clientX ?? null;
  };
  const alSoltar = (e: TouchEvent) => {
    const inicio = inicioToque.current;
    inicioToque.current = null;
    const fin = e.changedTouches[0]?.clientX;
    if (inicio === null || fin === undefined || total < 2) return;
    if (fin - inicio > UMBRAL_DESLIZAR) ir(indice - 1);
    else if (inicio - fin > UMBRAL_DESLIZAR) ir(indice + 1);
  };

  return (
    <>
      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label={`Fotos de ${nombre}`}
        tabIndex={total > 1 ? 0 : undefined}
        onKeyDown={alTeclear}
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        style={s(`position:relative;height:360px;background:${tinte};outline-offset:-3px;`)}
      >
        <div
          style={s(
            "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.82);font:600 13px ui-monospace,Menlo,monospace;letter-spacing:.5px;",
          )}
        >
          FOTO · {nombre}
        </div>
        {actual && (
          <img
            key={actual.clave}
            src={actual.src}
            alt={total > 1 ? `${nombre}, foto ${indice + 1} de ${total}` : nombre}
            onError={() => marcarRota(actual.clave)}
            style={s("position:absolute;inset:0;width:100%;height:100%;object-fit:cover;")}
          />
        )}
        {encima && <div style={s("position:absolute;top:16px;left:16px;")}>{encima}</div>}
        {total > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" className="ah-btn" onClick={() => ir(indice - 1)} style={flecha("izq")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button type="button" aria-label="Foto siguiente" className="ah-btn" onClick={() => ir(indice + 1)} style={flecha("der")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <span
              aria-live="polite"
              style={s(
                "position:absolute;bottom:14px;right:14px;background:rgba(14,42,71,.72);color:#fff;font:700 12px Manrope,sans-serif;padding:4px 10px;border-radius:99px;",
              )}
            >
              {indice + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div style={s("display:flex;gap:8px;padding:10px;background:#fff;overflow-x:auto;")}>
          {visibles.map((f, i) => (
            <button
              key={f.clave}
              type="button"
              className="ah-btn"
              aria-label={`Ver foto ${i + 1} de ${total}`}
              aria-current={i === indice ? "true" : undefined}
              onClick={() => setElegida(f.clave)}
              style={s(
                `flex:none;width:78px;height:58px;border-radius:9px;overflow:hidden;padding:0;cursor:pointer;background:none;border:2px solid ${
                  i === indice ? "#12B5A5" : "transparent"
                };opacity:${i === indice ? 1 : 0.75};`,
              )}
            >
              <img
                src={f.src}
                alt=""
                onError={() => marcarRota(f.clave)}
                style={s("width:100%;height:100%;object-fit:cover;display:block;")}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
