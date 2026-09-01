import { useEffect, useState } from "react";
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
  useEffect(() => setError(false), [actividadId, version]);

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
