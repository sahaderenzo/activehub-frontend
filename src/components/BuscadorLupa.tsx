import { s } from "../lib/style";

interface BuscadorLupaProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  /** Nombre accesible del campo (no hay etiqueta visible: la lupa la reemplaza). */
  etiqueta: string;
  /** Ancho mínimo; el campo crece hasta ocupar lo que queda de la fila. */
  minAncho?: number;
}

/**
 * Campo de búsqueda con la lupa adentro y la cruz para limpiar. Filtra mientras se tipea, como el
 * resto de los buscadores de la plataforma (por eso no tiene botón "Buscar"). Lo usan las
 * pantallas del instructor (2026-10-25).
 */
export default function BuscadorLupa({ valor, onChange, placeholder, etiqueta, minAncho = 240 }: BuscadorLupaProps) {
  return (
    <div style={s(`position:relative;flex:1;min-width:${minAncho}px;max-width:420px;`)}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#90A1B2"
        strokeWidth={2.2}
        aria-hidden="true"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={s(
          "width:100%;box-sizing:border-box;border:1px solid #D6DEE7;border-radius:12px;padding:10px 36px 10px 36px;font:600 13.5px Manrope,sans-serif;color:#0E2A47;background:#fff;",
        )}
      />
      {valor && (
        <button
          type="button"
          className="ah-btn"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange("")}
          style={s(
            "position:absolute;right:8px;top:50%;transform:translateY(-50%);width:22px;height:22px;border:none;border-radius:50%;background:#EEF2F6;color:#65788C;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;",
          )}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
