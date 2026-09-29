/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface CardPaymentBrickController {
  unmount: () => void | Promise<void>;
}

declare class MercadoPago {
  constructor(publicKey: string, options?: Record<string, unknown>);
  checkout(options: Record<string, unknown>): { open: () => void; render: (options: Record<string, unknown>) => void };
  bricks(): {
    create: (brickName: string, containerId: string, settings?: Record<string, unknown>) => Promise<CardPaymentBrickController>;
  };
}

interface Window {
  MercadoPago?: typeof MercadoPago;
  cardPaymentBrickController?: CardPaymentBrickController;
}

