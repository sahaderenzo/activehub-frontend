import { s } from "../lib/style";

/**
 * El gráfico de barras de toda la aplicación.
 *
 * <p>Existe porque el mismo gráfico estaba escrito cuatro veces —Dashboard y Reportes del
 * admin, Panel y Métricas del instructor— y las cuatro copias tenían el mismo defecto: barras
 * sin eje Y y sin valores. Una barra más alta que otra no dice *cuánto* más alta es, así que
 * el gráfico no se podía leer; y en Reportes las etiquetas eran `S1`…`S8`, ocho semanas fijas
 * hacia atrás sin relación con el calendario ni con el período elegido.
 *
 * <p>Lo que trae este componente, y que hay que conservar en cualquier gráfico nuevo:
 * <ul>
 *   <li><b>Eje Y con marcas enteras.</b> El tope se redondea hacia arriba a un múltiplo de 4
 *       para que las cuatro marcas caigan en enteros y no en 3,75.</li>
 *   <li><b>El valor debajo de cada barra</b>, además de la etiqueta.</li>
 *   <li><b>Etiquetas con significado propio</b> (una fecha, un mes, un día), nunca un índice.
 *       `detalle` es lo que se ve en el tooltip y puede ser más largo ("8 sep al 15 sep").</li>
 *   <li><b>Una barra en cero se ve</b>: queda un hilo de 2 % en vez de desaparecer, que es
 *       distinto de "no hay dato".</li>
 * </ul>
 */
export interface BarraGrafico {
  /** Etiqueta corta bajo la barra: "sep", "lun", "8 sep". */
  label: string;
  valor: number;
  /** Texto del tooltip; si no viene, se usa `label`. */
  detalle?: string;
}

interface GraficoBarrasProps {
  barras: BarraGrafico[];
  /** Color de las barras. Dos gradientes en uso: verde (por defecto) y naranja en Reportes. */
  color?: "verde" | "naranja";
  /** Alto del área de dibujo, sin contar las etiquetas. */
  alto?: number;
  /** Se muestra junto a los valores del eje: "inscripciones", "$". */
  unidad?: string;
  /** Formato del número del eje y del valor. Por defecto, el entero tal cual. */
  formato?: (n: number) => string;
}

const GRADIENTES = {
  verde: "linear-gradient(180deg,#12B5A5,#0FB8A9)",
  naranja: "linear-gradient(180deg,#FF8A5C,#FF6A2B)",
};

export default function GraficoBarras({
  barras,
  color = "verde",
  alto = 180,
  unidad,
  formato = (n) => String(n),
}: GraficoBarrasProps) {
  // Tope redondeado a un múltiplo de 4: así las cuatro marcas del eje son enteras.
  const pico = Math.max(1, ...barras.map((b) => b.valor));
  const paso = Math.max(1, Math.ceil(pico / 4));
  const max = paso * 4;
  const marcas = [4, 3, 2, 1, 0].map((n) => n * paso);

  return (
    <div style={s("display:flex;gap:10px;")}>
      <div style={s(`width:40px;flex:none;height:${alto}px;position:relative;`)}>
        {marcas.map((v, i) => (
          <span
            key={v}
            style={s(
              `position:absolute;right:0;top:${(i / (marcas.length - 1)) * 100}%;transform:translateY(-50%);font:700 10px Manrope,sans-serif;color:#A3B1C0;white-space:nowrap;`,
            )}
          >
            {formato(v)}
          </span>
        ))}
      </div>
      <div style={s("flex:1;min-width:0;")}>
        <div style={s(`position:relative;height:${alto}px;`)}>
          {marcas.map((v, i) => (
            <div
              key={v}
              style={s(
                `position:absolute;left:0;right:0;top:${(i / (marcas.length - 1)) * 100}%;border-top:1px ${
                  i === marcas.length - 1 ? "solid #D9E2EB" : "dashed #EEF2F6"
                };`,
              )}
            />
          ))}
          <div style={s("position:absolute;inset:0;display:flex;align-items:flex-end;gap:9px;")}>
            {barras.map((b, i) => (
              <div
                key={`${b.label}-${i}`}
                title={`${b.detalle ?? b.label}: ${formato(b.valor)}${unidad ? " " + unidad : ""}`}
                style={s(
                  `flex:1;border-radius:6px 6px 0 0;background:${GRADIENTES[color]};height:${
                    b.valor === 0 ? 2 : Math.max(5, Math.round((b.valor / max) * 100))
                  }%;`,
                )}
              />
            ))}
          </div>
        </div>
        <div style={s("display:flex;gap:9px;margin-top:8px;")}>
          {barras.map((b, i) => (
            <span
              key={`${b.label}-${i}`}
              title={b.detalle ?? b.label}
              style={s(
                "flex:1;min-width:0;text-align:center;font:700 10px Manrope,sans-serif;color:#90A1B2;line-height:1.5;",
              )}
            >
              {b.label}
              <br />
              <span style={s("color:#0E2A47;font-size:11.5px;")}>{formato(b.valor)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
