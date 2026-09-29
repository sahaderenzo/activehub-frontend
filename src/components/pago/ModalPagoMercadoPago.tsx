import { useEffect, useRef, useState } from "react";
import { getMercadoPago } from "../../lib/mercadopago";
import { ApiError } from "../../lib/api";
import type { CardBrickAdditionalData, CardBrickFormData, DatosPagoMercadoPago } from "../../lib/types";
import { s } from "../../lib/style";

export interface ModalPagoMercadoPagoProps {
  /** Determina si el modal está abierto */
  isOpen: boolean;
  /** Función invocada para cerrar el modal */
  onClose: () => void;
  /** Monto total a abonar */
  amount: number;
  /** Public key de Mercado Pago del INSTRUCTOR: en marketplace se tokeniza con la del vendedor. */
  publicKey: string;
  /** Email del alumno o pagador */
  payerEmail?: string;
  /** Título del modal */
  title?: string;
  /** Callback para procesar el pago e inscripción de manera unificada */
  onSubmitPago: (datosPago: DatosPagoMercadoPago) => Promise<void>;
  /** Callback opcional ante errores */
  onError?: (errorMessage: string) => void;
}

/**
 * Modal interactivo con Card Payment Brick de Mercado Pago integrado.
 * Ejecuta la tokenización y delega el procesamiento unificado al caller.
 */
export default function ModalPagoMercadoPago({
  isOpen,
  onClose,
  amount,
  publicKey,
  payerEmail,
  title = "Pago seguro con tarjeta",
  onSubmitPago,
  onError,
}: ModalPagoMercadoPagoProps) {
  const controllerRef = useRef<CardPaymentBrickController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Escuchar la tecla Escape para cerrar el modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  // Manejo del ciclo de vida e inicialización del Card Payment Brick
  useEffect(() => {
    if (!isOpen) return;

    let isDisposed = false;

    const initBrick = async () => {
      if (controllerRef.current?.unmount) {
        try {
          await controllerRef.current.unmount();
        } catch {
          // Ignorado durante cleanup
        }
        controllerRef.current = null;
      }

      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      const mp = getMercadoPago(publicKey);
      if (!mp) {
        if (!isDisposed) {
          setIsLoading(false);
          setErrorMessage("No se pudo inicializar la pasarela de pagos. Verificá las credenciales de Mercado Pago.");
        }
        return;
      }

      const bricksBuilder = mp.bricks();

      const settings = {
        initialization: {
          amount,
          payer: payerEmail ? { email: payerEmail } : undefined,
        },
        callbacks: {
          onReady: () => {
            if (!isDisposed) {
              setIsLoading(false);
            }
          },
          onSubmit: async (formData: CardBrickFormData, additionalData?: CardBrickAdditionalData) => {
            if (isDisposed) return;
            setIsProcessing(true);
            setErrorMessage(null);

            // Solo lo que sale del Brick: el monto y la referencia los decide el backend,
            // así el cliente no puede pagar otro precio que el de la clase.
            const payload: DatosPagoMercadoPago = {
              token: formData.token,
              paymentMethodId: formData.payment_method_id,
              paymentMethodType: additionalData?.paymentTypeId || "credit_card",
              cuotas: Number(formData.installments) || 1,
            };

            try {
              await onSubmitPago(payload);
            } catch (err) {
              const msg =
                err instanceof ApiError
                  ? err.message
                  : (err as Error)?.message || "Ocurrió un error al procesar el pago. Intentá nuevamente.";
              if (!isDisposed) {
                setErrorMessage(msg);
                onError?.(msg);
                setIsProcessing(false);
              }
              throw err;
            }
          },
          onError: (error: unknown) => {
            console.error("Error reportado por Mercado Pago Brick:", error);
            if (!isDisposed) {
              setErrorMessage("Ocurrió un problema con el formulario de pago. Por favor verificá los datos ingresados.");
            }
          },
        },
      };

      try {
        const controller = await bricksBuilder.create(
          "cardPayment",
          "cardPaymentBrick_modal_container",
          settings,
        );

        if (isDisposed) {
          controller?.unmount?.();
        } else {
          controllerRef.current = controller;
        }
      } catch (err) {
        if (!isDisposed) {
          setIsLoading(false);
          setErrorMessage("Error al cargar el módulo de pago. Reintentá recargando la página.");
          console.error("Error creando CardPayment Brick:", err);
        }
      }
    };

    const timer = setTimeout(() => {
      initBrick();
    }, 50);

    return () => {
      isDisposed = true;
      clearTimeout(timer);
      if (controllerRef.current?.unmount) {
        controllerRef.current.unmount();
        controllerRef.current = null;
      }
    };
  }, [isOpen, amount, publicKey, payerEmail, onSubmitPago, onError]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
      style={s(
        "position:fixed;inset:0;background:rgba(14,42,71,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;overflow-y:auto;",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={s(
          "background:#fff;border:1px solid #E7EDF3;border-radius:20px;width:100%;max-width:560px;padding:28px 24px;box-shadow:0 12px 36px rgba(14,42,71,0.2);position:relative;max-height:90vh;overflow-y:auto;",
        )}
      >
        {/* Encabezado del modal */}
        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;border-bottom:1px solid #F0F4F8;padding-bottom:14px;")}>
          <div>
            <h2 style={s("font:700 20px 'Space Grotesk',sans-serif;color:#0E2A47;margin:0 0 4px;")}>
              {title}
            </h2>
            <div style={s("font-size:13px;color:#65788C;font-weight:600;")}>
              Completá los datos de tu tarjeta para confirmar el pago
            </div>
          </div>
          <div style={s("display:flex;align-items:center;gap:12px;")}>
            <span style={s("font:700 17px 'Space Grotesk',sans-serif;color:#0C8576;background:#E7F8F5;padding:6px 12px;border-radius:10px;")}>
              ${amount.toLocaleString("es-AR")}
            </span>
            <button
              type="button"
              className="js-button-close"
              aria-label="Cerrar modal"
              disabled={isProcessing}
              onClick={onClose}
              style={s(
                "background:#F4F7FA;border:none;border-radius:99px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#65788C;cursor:pointer;font-size:16px;font-weight:700;transition:background .2s;",
              )}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mensaje de error */}
        {errorMessage && (
          <div style={s("display:flex;align-items:center;gap:12px;background:#FBEAEB;border:1px solid #F3D2D3;border-radius:12px;padding:14px 16px;margin-bottom:20px;color:#BE3A3E;font-size:13.5px;line-height:1.45;font-weight:600;")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={s("flex-shrink:0;")}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Indicador de carga inicial */}
        {isLoading && (
          <div style={s("padding:40px 0;text-align:center;color:#65788C;font-size:14px;font-weight:600;")}>
            <div style={s("display:inline-block;width:32px;height:32px;border:3px solid #E7EDF3;border-top-color:#0FB8A9;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;")} />
            <div>Cargando pasarela de pago seguro...</div>
          </div>
        )}

        {/* Indicador de procesamiento de pago */}
        {isProcessing && (
          <div style={s("padding:12px 16px;margin-bottom:14px;background:#E7F8F5;border:1px solid #CBEDE7;border-radius:12px;display:flex;align-items:center;gap:10px;color:#0C8576;font:600 13.5px Manrope,sans-serif;")}>
            <div style={s("display:inline-block;width:18px;height:18px;border:2px solid #CBEDE7;border-top-color:#0C8576;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;")} />
            <span>Confirmando inscripción y procesando pago con Mercado Pago...</span>
          </div>
        )}

        {/* Contenedor del Brick */}
        <div id="cardPaymentBrick_modal_container" ref={containerRef} />
      </div>
    </div>
  );
}
