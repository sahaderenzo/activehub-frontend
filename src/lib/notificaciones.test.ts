import { describe, expect, it } from "vitest";
import { esAlerta, rutaNotificacion } from "./notificaciones";

describe("esAlerta", () => {
  it("marca como alerta los avisos que piden una acción", () => {
    expect(esAlerta("MERCADOPAGO_TOKEN_VENCIDO")).toBe(true);
    expect(esAlerta("CAPTURA_PAGO_FALLIDA")).toBe(true);
  });

  it("deja el resto como avisos comunes", () => {
    expect(esAlerta("NUEVA_INSCRIPCION")).toBe(false);
    expect(esAlerta("TIPO_QUE_TODAVIA_NO_EXISTE")).toBe(false);
  });
});

describe("rutaNotificacion", () => {
  it("MERCADOPAGO_TOKEN_VENCIDO llega sin destino y no tiene link", () => {
    expect(rutaNotificacion({ destinoTipo: "NINGUNO", destinoId: null }, "instructor", ["mercadopago.vincular"])).toBeNull();
  });
});
