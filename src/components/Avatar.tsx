import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { s } from "../lib/style";
import { fotoPerfilUrl } from "../lib/photos";

interface AvatarProps {
  usuarioId?: string;
  nombre: string;
  size: number;
  gradient?: string;
  textColor?: string;
  fontSize?: number;
  version?: number;
  className?: string;
  /** Si se pasa, el avatar se vuelve clickeable: hover muestra una cámara, sube la foto y avisa si falla. */
  onUpload?: (archivo: File) => Promise<void>;
  /** Si se pasa (y no hay onUpload), el avatar es clickeable: hover muestra una lupa, para ver la foto más grande sin poder cambiarla. */
  onClick?: () => void;
}

export default function Avatar({
  usuarioId,
  nombre,
  size,
  gradient = "linear-gradient(140deg,#12B5A5,#0E2A47)",
  textColor = "#fff",
  fontSize,
  version,
  className,
  onUpload,
  onClick,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ajuste durante el render (patrón de React para "resetear estado cuando cambia una prop").
  const [fotoPrevia, setFotoPrevia] = useState(`${usuarioId}:${version}`);
  const fotoActual = `${usuarioId}:${version}`;
  if (fotoPrevia !== fotoActual) {
    setFotoPrevia(fotoActual);
    setError(false);
  }

  const inicial = nombre.charAt(0).toUpperCase() || "?";
  const fs = fontSize ?? Math.round(size * 0.4);

  const foto =
    usuarioId && !error ? (
      <img
        src={fotoPerfilUrl(usuarioId, version)}
        onError={() => setError(true)}
        alt={nombre}
        style={s(`width:${size}px;height:${size}px;border-radius:99px;object-fit:cover;display:block;`)}
      />
    ) : (
      <span
        style={s(
          `width:${size}px;height:${size}px;border-radius:99px;background:${gradient};display:flex;align-items:center;justify-content:center;color:${textColor};font:700 ${fs}px Space Grotesk,sans-serif;`,
        )}
      >
        {inicial}
      </span>
    );

  if (!onUpload && !onClick) {
    return (
      <span className={className} style={s("display:inline-flex;flex:none;")}>
        {foto}
      </span>
    );
  }

  if (!onUpload) {
    const iconSize = Math.max(12, Math.round(size * 0.36));
    return (
      <span
        className={`ah-avatar-edit ${className ?? ""}`}
        onClick={onClick}
        title="Ver foto más grande"
        tabIndex={0}
        style={s(
          `position:relative;display:inline-flex;flex:none;width:${size}px;height:${size}px;border-radius:99px;cursor:pointer;`,
        )}
      >
        {foto}
        <span
          className="ah-avatar-overlay"
          style={s(
            "position:absolute;inset:0;border-radius:99px;background:rgba(14,42,71,.6);display:flex;align-items:center;justify-content:center;pointer-events:none;",
          )}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
            <path d="M11 8v6M8 11h6" />
          </svg>
        </span>
      </span>
    );
  }

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setUploading(true);
    setFailed(false);
    try {
      await onUpload(archivo);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 3500);
    } finally {
      setUploading(false);
    }
  };

  const iconSize = Math.max(12, Math.round(size * 0.36));

  return (
    <span
      className={`ah-avatar-edit ${className ?? ""}`}
      onClick={() => !uploading && fileInputRef.current?.click()}
      title={failed ? "No pudimos subir la foto. Probá de nuevo." : "Cambiar foto"}
      tabIndex={0}
      style={s(
        `position:relative;display:inline-flex;flex:none;width:${size}px;height:${size}px;border-radius:99px;cursor:${uploading ? "default" : "pointer"};`,
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        style={s("display:none;")}
      />
      {foto}
      {!uploading && (
        <span
          className="ah-avatar-overlay"
          style={s(
            "position:absolute;inset:0;border-radius:99px;background:rgba(14,42,71,.6);display:flex;align-items:center;justify-content:center;pointer-events:none;",
          )}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      )}
      {uploading && (
        <span
          style={s(
            "position:absolute;inset:0;border-radius:99px;background:rgba(14,42,71,.6);display:flex;align-items:center;justify-content:center;",
          )}
        >
          <span
            style={s(
              `display:block;width:${iconSize}px;height:${iconSize}px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:99px;animation:ahspin .7s linear infinite;`,
            )}
          />
        </span>
      )}
      {failed && (
        <span
          style={s(
            "position:absolute;bottom:-1px;right:-1px;width:14px;height:14px;border-radius:99px;background:#E5484D;border:2px solid #fff;",
          )}
        />
      )}
    </span>
  );
}
