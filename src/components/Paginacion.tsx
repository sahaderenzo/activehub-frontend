import { useState } from "react";
import { s } from "../lib/style";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  irAPagina: (n: number) => void;
}

/**
 * Los controles de página, los mismos que tenía sólo Auditoría (ex Trazabilidad): primera,
 * anterior, número editable (click, escribir, Enter; Escape cancela), siguiente y última. Con
 * una sola página no se muestra nada.
 */
export default function Paginacion({ paginaActual, totalPaginas, irAPagina }: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");

  if (totalPaginas <= 1) return null;

  const confirmar = () => {
    const n = parseInt(texto, 10);
    if (!Number.isNaN(n)) irAPagina(n);
    setEditando(false);
  };

  const navBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      type="button"
      className="ah-btn"
      onClick={onClick}
      disabled={disabled}
      style={s(
        `background:#fff;border:1px solid #E2E9F0;border-radius:10px;padding:8px 13px;font:700 12.5px Manrope,sans-serif;color:${disabled ? "#C2CCD6" : "#41566B"};cursor:${disabled ? "default" : "pointer"};`,
      )}
    >
      {label}
    </button>
  );

  return (
    <div style={s("padding:14px 22px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;")}>
      {navBtn("« Primera", () => irAPagina(1), paginaActual === 1)}
      {navBtn("Anterior", () => irAPagina(paginaActual - 1), paginaActual === 1)}
      <span style={s("display:flex;align-items:center;gap:6px;font:700 12.5px Manrope,sans-serif;color:#65788C;")}>
        Página
        {editando ? (
          <input
            autoFocus
            type="number"
            min={1}
            max={totalPaginas}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") setEditando(false);
            }}
            style={s(
              "width:64px;text-align:center;border:1.5px solid #2D5BC8;border-radius:8px;padding:6px 4px;font:700 12.5px Manrope,sans-serif;color:#0E2A47;outline:none;",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTexto(String(paginaActual));
              setEditando(true);
            }}
            title="Escribir el número de página"
            className="ah-btn"
            style={s(
              "background:#fff;border:1px solid #E2E9F0;border-radius:8px;padding:6px 12px;font:700 12.5px Manrope,sans-serif;color:#0E2A47;cursor:pointer;",
            )}
          >
            {paginaActual}
          </button>
        )}
        de {totalPaginas}
      </span>
      {navBtn("Siguiente", () => irAPagina(paginaActual + 1), paginaActual === totalPaginas)}
      {navBtn("Última »", () => irAPagina(totalPaginas), paginaActual === totalPaginas)}
    </div>
  );
}
