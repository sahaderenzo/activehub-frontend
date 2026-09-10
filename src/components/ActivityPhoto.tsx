import { useState } from "react";
import { s } from "../lib/style";
import { fotoActividadUrl } from "../lib/photos";

interface ActivityPhotoProps {
  actividadId: string;
  version?: number;
}

/**
 * Overlay absoluto que cubre el gradiente `photoTint` decorativo con la foto real,
 * si existe. Se cae solo (onError) dejando ver el fallback ya presente debajo.
 */
export default function ActivityPhoto({ actividadId, version }: ActivityPhotoProps) {
  const [error, setError] = useState(false);
  // Cambió la foto: se reintenta. Ajustar el estado durante el render (y no en un efecto)
  // es el patrón de React para esto y evita pintar un frame con el error de la anterior.
  const fotoActual = `${actividadId}:${version}`;
  const [fotoPrevia, setFotoPrevia] = useState(fotoActual);
  if (fotoPrevia !== fotoActual) {
    setFotoPrevia(fotoActual);
    setError(false);
  }

  if (error) return null;

  return (
    <img
      src={fotoActividadUrl(actividadId, version)}
      onError={() => setError(true)}
      alt=""
      style={s("position:absolute;inset:0;width:100%;height:100%;object-fit:cover;")}
    />
  );
}
