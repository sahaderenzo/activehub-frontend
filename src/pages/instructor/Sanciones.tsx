import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import DashLayout from "../../components/DashLayout";
import { CargandoAccion, CargandoSeccion } from "../../components/Cargando";
import ErrorReintentar from "../../components/ErrorReintentar";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import type { MiSancion, MisSanciones } from "../../context/DataContext";
import { ApiError } from "../../lib/api";
import { s } from "../../lib/style";
import { ETIQUETA_ESTADO_COMPROBANTE, ETIQUETA_ESTADO_PAGO, errorComprobante, fechaCorta, fechaDeInstante } from "../../lib/sanciones";

const pesos = (n: number | null) => `$${(n ?? 0).toLocaleString("es-AR")}`;

/**
 * "Mis sanciones" del instructor (V36). Antes el penalizado no tenía ninguna pantalla donde
 * ver su sanción: el aviso llegaba sin link.
 *
 * Con una multa sin pagar es además donde la paga: ve el monto, a dónde transferir (alias y
 * CBU de la configuración del servidor) y carga el comprobante. Hasta que la administración lo
 * apruebe, ésta y la lista de inscriptos de sus clases son lo único que puede abrir
 * (`RequireSinMultaPendiente`).
 */
export default function InstructorSanciones() {
  const { listarMisSanciones } = useData();
  const { refrescarRestricciones } = useAuth();
  const [datos, setDatos] = useState<MisSanciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback(() => {
    listarMisSanciones()
      .then((r) => {
        setDatos(r);
        setErrorCarga(false);
        // Si la administración aprobó el pago mientras tanto, esto desbloquea el menú.
        refrescarRestricciones().catch(() => {});
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, [listarMisSanciones, refrescarRestricciones]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const multas = (datos?.sanciones ?? []).filter((x) => x.estadoPago === "PENDIENTE_PAGO" || x.estadoPago === "EN_REVISION");

  return (
    <DashLayout role="instructor" active="sanciones">
      <div style={s("background:#fff;border-bottom:1px solid #E7EDF3;padding:18px 32px;")}>
        <h1 style={s("font:700 22px Space Grotesk;margin:0;")}>Mis sanciones</h1>
        <p style={s("font-size:13.5px;color:#7A8C9E;margin:3px 0 0;")}>
          Las penalizaciones que te aplicó la administración y, si tenés una multa, cómo pagarla.
        </p>
      </div>

      <div style={s("max-width:900px;padding:26px 32px 50px;display:flex;flex-direction:column;gap:18px;")}>
        {errorCarga ? (
          <ErrorReintentar
            mensaje="No pudimos cargar tus sanciones."
            onReintentar={() => {
              setCargando(true);
              cargar();
            }}
          />
        ) : cargando || !datos ? (
          <CargandoSeccion seccion="tus sanciones" />
        ) : (
          <>
            {datos.multaPendiente && (
              <div role="alert" style={s("background:#FFF4E5;border:1px solid #F5D9A8;color:#8A5A00;border-radius:14px;padding:13px 16px;font:600 13.5px Manrope;line-height:1.5;")}>
                Tenés una multa pendiente de pago. Hasta que la administración apruebe tu comprobante, sólo podés ver esta
                pantalla y la lista de inscriptos de tus clases, para confirmar cobros en efectivo.
              </div>
            )}
            {datos.suspendidoHasta && (
              <div role="status" style={s("background:#FBEAEB;border:1px solid #F3D2D3;color:#BE3A3E;border-radius:14px;padding:13px 16px;font:600 13.5px Manrope;")}>
                Estás suspendido hasta el {fechaCorta(datos.suspendidoHasta)}: no podés crear ni editar actividades ni clases.
              </div>
            )}

            {multas.map((multa) => (
              <PagoPenalizacion key={multa.id} multa={multa} transferencia={datos.transferencia} onEnviado={cargar} />
            ))}

            <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:20px;overflow:hidden;")}>
              <div style={s("padding:16px 22px;border-bottom:1px solid #EEF2F6;font:700 16px Space Grotesk;color:#0E2A47;")}>
                Historial de sanciones
              </div>
              {datos.sanciones.length === 0 ? (
                <div style={s("padding:18px 22px;font-size:13.5px;color:#90A1B2;font-weight:600;")}>No tenés sanciones.</div>
              ) : (
                datos.sanciones.map((sancion) => <FilaSancion key={sancion.id} sancion={sancion} />)
              )}
            </div>
          </>
        )}
      </div>
    </DashLayout>
  );
}

function PagoPenalizacion({
  multa,
  transferencia,
  onEnviado,
}: {
  multa: MiSancion;
  transferencia: MisSanciones["transferencia"];
  onEnviado: () => void;
}) {
  const { enviarComprobantePenalizacion } = useData();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enRevision = multa.estadoPago === "EN_REVISION";
  const ultimo = multa.comprobantes[0];
  const sinDatos = !transferencia.alias && !transferencia.cbu && !transferencia.titular;

  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError(elegido ? errorComprobante(elegido) : null);
    setArchivo(elegido && !errorComprobante(elegido) ? elegido : null);
  };

  const enviar = async () => {
    if (!archivo) return;
    setError(null);
    setEnviando(true);
    try {
      await enviarComprobantePenalizacion(multa.id, archivo);
      setArchivo(null);
      onEnviado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos enviar el comprobante. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={s("background:#fff;border:1px solid #E7EDF3;border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgba(14,42,71,.04);")}>
      <CargandoAccion activo={enviando} mensaje="Enviando tu comprobante" />
      <div style={s("padding:18px 22px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;")}>
        <div>
          <div style={s("font:700 16px Space Grotesk;color:#0E2A47;")}>Pago de penalización</div>
          <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;")}>Aplicada el {fechaDeInstante(multa.createdAt)}</div>
        </div>
        <span style={s("font:700 12px Manrope;background:#FFF4E5;color:#8A5A00;border:1px solid #F5D9A8;padding:4px 10px;border-radius:99px;")}>
          {ETIQUETA_ESTADO_PAGO[multa.estadoPago ?? "PENDIENTE_PAGO"]}
        </span>
      </div>

      <div style={s("padding:18px 22px;display:flex;flex-direction:column;gap:14px;")}>
        <div style={s("display:flex;gap:28px;flex-wrap:wrap;")}>
          <div>
            <div style={s("font:700 11.5px Manrope;color:#7A8C9E;text-transform:uppercase;letter-spacing:.4px;")}>Monto a pagar</div>
            <div style={s("font:700 24px Space Grotesk;color:#0E2A47;")}>{pesos(multa.monto)}</div>
          </div>
          <div style={s("flex:1;min-width:220px;")}>
            <div style={s("font:700 11.5px Manrope;color:#7A8C9E;text-transform:uppercase;letter-spacing:.4px;")}>Motivo</div>
            <div style={s("font-size:13.5px;color:#41566B;font-weight:600;")}>{multa.motivo}</div>
          </div>
        </div>

        <div style={s("background:#F6F9FC;border:1px solid #E7EDF3;border-radius:12px;padding:13px 15px;font-size:13.5px;color:#41566B;font-weight:600;line-height:1.7;")}>
          {sinDatos ? (
            "Consultá los datos para transferir con la administración."
          ) : (
            <>
              <div style={s("font-weight:700;color:#0E2A47;")}>Transferí el monto a:</div>
              {transferencia.alias && <div>Alias: {transferencia.alias}</div>}
              {transferencia.cbu && <div>CBU: {transferencia.cbu}</div>}
              {transferencia.titular && <div>Titular: {transferencia.titular}</div>}
            </>
          )}
        </div>

        {enRevision ? (
          <div role="status" style={s("background:#EEF4FB;border:1px solid #D3E1F5;color:#2D5BC8;border-radius:12px;padding:12px 14px;font:600 13.5px Manrope;")}>
            Recibimos tu comprobante{ultimo ? ` (${ultimo.nombreArchivo})` : ""}. La administración lo está revisando: te
            avisamos cuando lo apruebe.
          </div>
        ) : (
          <>
            {ultimo?.estado === "INVALIDO" && (
              <div role="alert" style={s("background:#FBEAEB;border:1px solid #F3C6C7;color:#BE3A3E;border-radius:12px;padding:12px 14px;font:600 13.5px Manrope;")}>
                Tu comprobante anterior no es válido: {ultimo.motivoInvalidez}. Cargá uno nuevo.
              </div>
            )}
            <div>
              <div style={s("font:700 13px Manrope;color:#0E2A47;margin-bottom:6px;")}>Comprobante de pago *</div>
              <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap;")}>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={elegir}
                  style={{ display: "none" }}
                  aria-label="Comprobante de pago"
                />
                <button
                  className="ah-btn"
                  onClick={() => inputRef.current?.click()}
                  style={s("background:#fff;border:1px solid #D6DEE7;border-radius:10px;padding:9px 14px;font:700 13px Manrope;color:#2D5BC8;cursor:pointer;")}
                >
                  Elegir archivo
                </button>
                <span style={s("font-size:13px;color:#7A8C9E;font-weight:600;")}>
                  {archivo ? archivo.name : "PDF, JPG o PNG, hasta 5 MB."}
                </span>
              </div>
            </div>
            {error && (
              <div role="alert" style={s("color:#BE3A3E;font:600 13px Manrope;")}>
                {error}
              </div>
            )}
            <div>
              <button
                className="ah-btn"
                onClick={enviar}
                disabled={!archivo || enviando}
                style={s(
                  `background:#FF6A2B;color:#fff;border:none;border-radius:11px;padding:11px 22px;font:700 14px Manrope;cursor:${archivo ? "pointer" : "not-allowed"};opacity:${archivo ? "1" : ".55"};`,
                )}
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilaSancion({ sancion }: { sancion: MiSancion }) {
  const esMulta = sancion.tipo === "Económica";
  const estado = esMulta
    ? sancion.estadoPago
      ? ETIQUETA_ESTADO_PAGO[sancion.estadoPago]
      : "Aplicada"
    : sancion.levantadaAt
      ? `Levantada el ${fechaDeInstante(sancion.levantadaAt)}`
      : sancion.vigente
        ? "Vigente"
        : "Terminada";

  return (
    <div style={s("padding:14px 22px;border-top:1px solid #EEF2F6;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;")}>
      <div style={s("flex:1;min-width:220px;")}>
        <div style={s("font:700 14px Manrope;color:#0E2A47;")}>
          {sancion.tipo}
          {esMulta ? ` · ${pesos(sancion.monto)}` : ` · del ${fechaCorta(sancion.fechaInicio)} al ${fechaCorta(sancion.fechaFin)}`}
        </div>
        <div style={s("font-size:13px;color:#41566B;font-weight:600;")}>{sancion.motivo}</div>
        {sancion.motivoLevantamiento && (
          <div style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;")}>Motivo del levantamiento: {sancion.motivoLevantamiento}</div>
        )}
        {sancion.comprobantes.map((c) => (
          <div key={c.id} style={s("font-size:12.5px;color:#7A8C9E;font-weight:600;")}>
            Comprobante {c.nombreArchivo} · {ETIQUETA_ESTADO_COMPROBANTE[c.estado]}
            {c.motivoInvalidez ? ` (${c.motivoInvalidez})` : ""}
          </div>
        ))}
      </div>
      <span style={s("font:700 12px Manrope;background:#F1F4F8;color:#41566B;border:1px solid #E1E7EE;padding:4px 10px;border-radius:99px;")}>
        {estado}
      </span>
    </div>
  );
}
