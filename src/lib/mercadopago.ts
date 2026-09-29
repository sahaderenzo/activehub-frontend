// Helper centralizado para inicializar y obtener la instancia del SDK de Mercado Pago.

// Una instancia por public key: en el marketplace cada instructor tiene la suya (KAN-57) y la
// tarjeta se tokeniza con la del VENDEDOR. Con una sola instancia cacheada, pagar la clase de
// un segundo instructor tokenizaba con la key del primero.
const instancias = new Map<string, MercadoPago>();

/**
 * Instancia del SDK v2 de Mercado Pago para esa public key (la del instructor dueño de la clase).
 */
export function getMercadoPago(publicKey: string): MercadoPago | null {
  const existente = instancias.get(publicKey);
  if (existente) {
    return existente;
  }

  if (typeof window === "undefined" || !window.MercadoPago) {
    console.warn("MercadoPago SDK no está cargado todavía en window.");
    return null;
  }

  const mp = new window.MercadoPago(publicKey, { locale: "es-AR" });
  instancias.set(publicKey, mp);
  return mp;
}
