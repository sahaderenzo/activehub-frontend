import { useMemo } from "react";
import { s } from "../lib/style";

/** Valor del selector cuando no se filtra. */
export const TODAS_LAS_ACTIVIDADES = "";

interface Props {
  /** Las clases que la pantalla ya tiene cargadas: el selector ofrece sólo actividades que aparecen ahí. */
  clases: { actividadId: string; actividadNombre: string }[];
  valor: string;
  onChange: (actividadId: string) => void;
}

/**
 * Selector "Actividad" de las listas de clases del instructor (Próximas clases e Historial).
 * Con varias actividades en paralelo, una lista cronológica mezcla todo y cuesta encontrar
 * las de una en particular.
 *
 * Las opciones salen de las clases cargadas, no del catálogo: una actividad sin clases en la
 * lista sería una opción que siempre da vacío, y una ya eliminada no está en el catálogo pero
 * sí en el historial.
 */
export default function FiltroActividad({ clases, valor, onChange }: Props) {
  const opciones = useMemo(() => {
    const porId = new Map<string, string>();
    for (const c of clases) porId.set(c.actividadId, c.actividadNombre);
    return [...porId.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
  }, [clases]);

  return (
    <label style={s("display:flex;align-items:center;gap:9px;")}>
      <span style={s("font:700 13px Manrope;color:#41566B;")}>Actividad</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        style={s(
          "border:1px solid #D6DEE7;border-radius:10px;padding:8px 12px;font:600 13px Manrope;color:#0E2A47;background:#fff;min-width:200px;max-width:100%;",
        )}
      >
        <option value={TODAS_LAS_ACTIVIDADES}>Todas las actividades</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
