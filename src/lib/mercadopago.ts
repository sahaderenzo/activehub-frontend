// Helper centralizado para inicializar y obtener la instancia del SDK de Mercado Pago.

let mpInstance: MercadoPago | null = null;

/**
 * Inicializa y retorna la instancia de MercadoPago SDK v2.
 * Toma la public key de la variable de entorno VITE_MERCADOPAGO_PUBLIC_KEY o un valor alternativo provisto.
 */
export function getMercadoPago(publicKey?: string): MercadoPago | null {
  if (mpInstance) {
    return mpInstance;
  }

  if (typeof window === "undefined" || !window.MercadoPago) {
    console.warn("MercadoPago SDK no está cargado todavía en window.");
    return null;
  }

  const key = publicKey || import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || "YOUR_PUBLIC_KEY";
  mpInstance = new window.MercadoPago(key, {
    locale: "es-AR",
  });
  return mpInstance;
}
