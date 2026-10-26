import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { s } from "../lib/style";
import { ApiError } from "../lib/api";
import { formatFecha } from "../lib/mockData";
import { useData } from "../context/DataContext";
import type { DocumentoInstructor } from "../context/DataContext";

/** Lo mismo que acepta el backend (`subirdocumento` y el alta de instructor). */
const TIPOS = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

function tamanio(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface DocumentacionCardProps {
  /** Texto bajo el título: cambia según el estado de la solicitud. */
  descripcion: string;
  /** Avisa la lista cada vez que cambia (la usa "Mis datos" para habilitar "Volver a postularme"). */
  onCambio?: (documentos: DocumentoInstructor[]) => void;
}

/**
 * La documentación del instructor: verla, subir más y quitar la que ya no sirve (2026-10-26).
 * Antes sólo existía en el alta y únicamente la veía el administrador, así que un rechazo no se
 * podía corregir y un curso nuevo no se podía agregar.
 *
 * La usan "Mis datos" (`instructor/Solicitud.tsx`, mientras la solicitud no está aprobada) y
 * "Mi perfil" (`instructor/Perfil.tsx`, ya aprobado). Quitar no borra: el backend lo marca
 * RETIRADO y el administrador lo sigue viendo como historial. No se puede quitar el último.
 */
export default function DocumentacionCard({ descripcion, onCambio }: DocumentacionCardProps) {
  const { listarMisDocumentos, subirDocumento, verMiDocumento, retirarMiDocumento } = useData();
  const [documentos, setDocumentos] = useState<DocumentoInstructor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // `onCambio` puede ser una función nueva en cada render de la pantalla: se lee por ref para que
  // no reinicie la carga.
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  }, [onCambio]);

  const cargar = useCallback(() => {
    listarMisDocumentos()
      .then((docs) => {
        setDocumentos(docs);
        setErrorCarga(false);
        onCambioRef.current?.(docs);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [listarMisDocumentos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setOk(null);
    if (!TIPOS.includes(archivo.type)) return setError("Formato no permitido. Subí un PDF, JPG o PNG.");
    if (archivo.size > MAX_BYTES) return setError("El archivo supera los 5 MB.");
    setSubiendo(true);
    try {
      await subirDocumento(archivo);
      setOk(`Subiste "${archivo.name}".`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos subir el documento. Intentá de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  const ver = async (doc: DocumentoInstructor) => {
    setError(null);
    setOcupado(doc.id);
    try {
      await verMiDocumento(doc.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos abrir el documento.");
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (doc: DocumentoInstructor) => {
    if (!window.confirm(`¿Quitar "${doc.nombreArchivo}" de tu documentación?`)) return;
    setError(null);
    setOk(null);
    setOcupado(doc.id);
    try {
      await retirarMiDocumento(doc.id);
      setOk(`Quitaste "${doc.nombreArchivo}".`);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos quitar el documento.");
    } finally {
      setOcupado(null);
    }
  };

  const unico = documentos.length <= 1;

  return (
    <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
      <div style={s("padding:20px 24px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;gap:11px;flex-wrap:wrap;")}>
        <span style={s("width:38px;height:38px;border-radius:10px;background:#EEF4FB;display:flex;align-items:center;justify-content:center;flex:none;")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5BC8" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </span>
        <div style={s("flex:1;min-width:200px;")}>
          <div style={s("font:700 16px Space Grotesk;color:#0E2A47;")}>Documentación</div>
          <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>{descripcion}</div>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={subir} style={{ display: "none" }} aria-label="Archivo a subir" />
        <button
          className="ah-btn"
          onClick={() => !subiendo && inputRef.current?.click()}
          disabled={subiendo}
          style={s(
            `background:#0E2A47;color:#fff;border:none;border-radius:11px;padding:10px 16px;font:700 13.5px Manrope;cursor:${subiendo ? "wait" : "pointer"};opacity:${subiendo ? ".7" : "1"};`,
          )}
        >
          {subiendo ? "Subiendo…" : "Subir documento"}
        </button>
      </div>

      <div style={s("padding:16px 24px 20px;display:flex;flex-direction:column;gap:10px;")}>
        {(error || ok) && (
          <div
            role="alert"
            style={s(
              error
                ? "background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:10px;padding:10px 13px;font:600 13px Manrope;"
                : "background:#E7F8F5;border:1px solid #CBEDE7;color:#0C8576;border-radius:10px;padding:10px 13px;font:600 13px Manrope;",
            )}
          >
            {error ?? ok}
          </div>
        )}
        {cargando ? (
          <div style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>Cargando tu documentación…</div>
        ) : errorCarga ? (
          <div style={s("font-size:13px;color:#BE3A3E;font-weight:600;display:flex;gap:10px;align-items:center;")}>
            No pudimos cargar tu documentación.
            <button className="ah-btn" onClick={cargar} style={s("background:#fff;border:1px solid #F3C6C7;border-radius:9px;padding:6px 12px;font:700 12.5px Manrope;color:#BE3A3E;cursor:pointer;")}>
              Reintentar
            </button>
          </div>
        ) : documentos.length === 0 ? (
          <div style={s("font-size:13px;color:#90A1B2;font-weight:600;")}>Todavía no tenés documentación cargada.</div>
        ) : (
          documentos.map((doc) => (
            <div key={doc.id} style={s("display:flex;align-items:center;gap:11px;border:1px solid #E7EDF3;border-radius:11px;padding:11px 13px;flex-wrap:wrap;")}>
              <div style={s("flex:1;min-width:180px;")}>
                <div style={s("font:700 13.5px Manrope;color:#0E2A47;display:flex;align-items:center;gap:8px;flex-wrap:wrap;")}>
                  <span style={s("overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px;")}>{doc.nombreArchivo}</span>
                  {doc.nuevo && (
                    <span style={s("font:700 11px Manrope;background:#E7F8F5;color:#0C8576;border:1px solid #CBEDE7;padding:2px 8px;border-radius:99px;")}>
                      Nuevo
                    </span>
                  )}
                </div>
                <div style={s("font-size:11.5px;color:#90A1B2;font-weight:600;")}>
                  Subido {formatFecha(doc.createdAt)} · {tamanio(doc.tamanioBytes)}
                </div>
              </div>
              <button
                className="ah-btn"
                onClick={() => ver(doc)}
                disabled={ocupado === doc.id}
                style={s("background:#fff;border:1px solid #D6DEE7;border-radius:9px;padding:7px 12px;font:700 12.5px Manrope;color:#2D5BC8;cursor:pointer;")}
              >
                Ver
              </button>
              <button
                className="ah-btn"
                onClick={() => quitar(doc)}
                disabled={unico || ocupado === doc.id}
                title={unico ? "Tenés que tener al menos un documento cargado. Subí el nuevo antes de quitar este." : undefined}
                style={s(
                  `background:#fff;border:1px solid #F3D2D3;border-radius:9px;padding:7px 12px;font:700 12.5px Manrope;color:#BE3A3E;cursor:${unico ? "not-allowed" : "pointer"};opacity:${unico ? ".5" : "1"};`,
                )}
              >
                Quitar
              </button>
            </div>
          ))
        )}
        <div style={s("font-size:12px;color:#90A1B2;font-weight:600;")}>PDF, JPG o PNG, hasta 5 MB por archivo.</div>
      </div>
    </div>
  );
}
