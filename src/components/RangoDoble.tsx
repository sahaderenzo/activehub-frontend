import { s } from "../lib/style";

interface Props {
  min: number;
  max: number;
  step?: number;
  desde: number;
  hasta: number;
  onChange: (desde: number, hasta: number) => void;
  /** Cómo se escribe un valor en la leyenda "De … hasta …". */
  formato: (n: number) => string;
  /** Nombre accesible de cada manija, p. ej. "Distancia mínima". */
  etiquetaDesde: string;
  etiquetaHasta: string;
}

/** Ancho de la manija: la barra se dibuja descontando media manija de cada lado. */
const MANIJA = 30;

/**
 * Barra con dos manijas para elegir un rango: leyenda "De X hasta Y" arriba, la pista gris y el
 * tramo elegido en naranja. Son dos `<input type="range">` superpuestos, así que se manejan
 * también con el teclado y los lectores de pantalla; los estilos de las manijas están en
 * `index.css` (`.ah-rango`), porque los pseudo-elementos no se pueden escribir en línea.
 */
export default function RangoDoble({ min, max, step = 1, desde, hasta, onChange, formato, etiquetaDesde, etiquetaHasta }: Props) {
  const pct = (v: number) => (max === min ? 0 : (v - min) / (max - min));
  const pos = (v: number) => `calc(${MANIJA / 2}px + (100% - ${MANIJA}px) * ${pct(v)})`;
  // Con las dos manijas juntas en el tope, la de "desde" tiene que quedar arriba: si no, la de
  // "hasta" la tapa y ya no se puede arrastrar hacia la izquierda.
  const desdeArriba = desde >= max - step;

  return (
    <div>
      <div style={s("font:700 14px Manrope,sans-serif;color:#2B95D6;margin-bottom:10px;")}>
        De {formato(desde)} hasta {formato(hasta)}
      </div>
      <div className="ah-rango" style={s(`position:relative;height:${MANIJA + 4}px;`)}>
        <div
          style={s(
            `position:absolute;left:${MANIJA / 2}px;right:${MANIJA / 2}px;top:50%;height:8px;margin-top:-4px;border-radius:99px;background:#EEF1F4;border:1px solid #E2E9F0;`,
          )}
        />
        <div
          style={{
            ...s("position:absolute;top:50%;height:8px;margin-top:-4px;background:linear-gradient(90deg,#FF6A2B,#FF3D57);"),
            left: pos(desde),
            width: `calc((100% - ${MANIJA}px) * ${pct(hasta) - pct(desde)})`,
          }}
        />
        <input
          type="range"
          aria-label={etiquetaDesde}
          min={min}
          max={max}
          step={step}
          value={desde}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hasta), hasta)}
          style={s(`z-index:${desdeArriba ? 4 : 3};`)}
        />
        <input
          type="range"
          aria-label={etiquetaHasta}
          min={min}
          max={max}
          step={step}
          value={hasta}
          onChange={(e) => onChange(desde, Math.max(Number(e.target.value), desde))}
          style={s(`z-index:${desdeArriba ? 3 : 4};`)}
        />
      </div>
    </div>
  );
}
