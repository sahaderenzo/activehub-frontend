import { useEffect, useRef, useState } from "react";
import { s } from "../lib/style";
import { api } from "../lib/api";

/**
 * "Continuar con Google", con el botón oficial de Google Identity Services.
 *
 * <h2>Por qué el botón lo dibuja Google y no nosotros</h2>
 *
 * Se podría maquetar uno propio y llamar a `google.accounts.id.prompt()`, pero el botón
 * renderizado por GIS es el único que Google garantiza que cumple sus *branding guidelines*
 * — un requisito de sus términos, no una preferencia estética — y el que resuelve solo el
 * popup, el `state` y los bloqueos de terceros. Acá sólo se le reserva el ancho.
 *
 * <h2>Se deshabilita solo si el backend no tiene Google configurado</h2>
 *
 * El client id se pide a `/api/auth/google/config` en vez de leerlo de un `VITE_` propio: así
 * no hay forma de que el frontend ofrezca el botón contra un backend que no puede validar el
 * token. Sin client id, este componente **no renderiza nada** — es mejor no ofrecer el camino
 * que ofrecer uno que falla.
 *
 * <p>El script de GIS se carga una sola vez y se comparte entre las pantallas que lo usan
 * (login y registro), por eso la promesa vive a nivel de módulo.
 */
const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisCargando: Promise<void> | null = null;

function cargarGis(): Promise<void> {
  if (gisCargando) return gisCargando;
  gisCargando = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(script);
  });
  return gisCargando;
}

/** Lo mínimo de la API de GIS que se usa acá; la librería no trae tipos propios. */
interface GoogleGlobal {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

interface BotonGoogleProps {
  /** Se llama con el ID token de Google; quien lo recibe lo manda al backend. */
  onCredencial: (idToken: string) => void;
  /** Texto del botón: "signup_with" en el registro, "signin_with" en el login. */
  texto?: "signin_with" | "signup_with" | "continue_with";
}

export default function BotonGoogle({ onCredencial, texto = "continue_with" }: BotonGoogleProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [falla, setFalla] = useState(false);
  // El callback se guarda en un ref: GIS se inicializa UNA vez y se queda con la función que
  // le pasamos, así que si la pantalla re-renderiza con otra closure, la vieja seguiría viva.
  // La asignación va en un efecto y no en el cuerpo: tocar un ref durante el render rompe la
  // regla `react-hooks/refs` (y con renders concurrentes puede escribirse de más).
  const callbackRef = useRef(onCredencial);
  useEffect(() => {
    callbackRef.current = onCredencial;
  }, [onCredencial]);

  useEffect(() => {
    let cancelado = false;
    api
      .get<{ habilitado: boolean; clientId: string }>("/api/auth/google/config")
      .then((config) => {
        if (!cancelado) setClientId(config.habilitado ? config.clientId : null);
      })
      .catch(() => {
        if (!cancelado) setClientId(null);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId || !contenedor.current) return;
    let cancelado = false;
    cargarGis()
      .then(() => {
        if (cancelado || !contenedor.current) return;
        const google = (window as unknown as { google?: GoogleGlobal }).google;
        if (!google) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (respuesta) => callbackRef.current(respuesta.credential),
        });
        google.accounts.id.renderButton(contenedor.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: texto,
          shape: "rectangular",
          logo_alignment: "center",
          locale: "es-419",
          width: contenedor.current.offsetWidth || 360,
        });
      })
      .catch(() => {
        if (!cancelado) setFalla(true);
      });
    return () => {
      cancelado = true;
    };
  }, [clientId, texto]);

  // Sin Google configurado no se muestra nada: ni el botón ni un cartel de error. Para el
  // visitante no es una falla, simplemente esta instalación no ofrece ese camino.
  if (!clientId) return null;

  if (falla) {
    return (
      <div style={s("font-size:12.5px;color:#90A1B2;font-weight:600;text-align:center;")}>
        No pudimos cargar el ingreso con Google. Entrá con tu correo y contraseña.
      </div>
    );
  }

  return <div ref={contenedor} style={s("display:flex;justify-content:center;min-height:44px;")} />;
}
