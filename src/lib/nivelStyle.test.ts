import { describe, expect, it } from "vitest";
import { nivelStyle } from "./nivelStyle";

/**
 * Desde la V21 los niveles de intensidad son un ABM: el admin puede crear los que quiera, así
 * que un nivel desconocido tiene que salir igual, con el color neutro. Antes era un `Record`
 * de tres claves fijas y el badge de un nivel nuevo quedaba sin estilo.
 */
const NEUTRO = ["#EEF4FB", "#2D5BC8", "#DCE7F5"];

describe("nivelStyle", () => {
  it("los tres niveles originales conservan su color histórico", () => {
    expect(nivelStyle("Física baja")[1]).toBe("#0C8576");
    expect(nivelStyle("Física media")[1]).toBe("#B9741A");
    expect(nivelStyle("Física alta")[1]).toBe("#BE3A3E");
  });

  it("no le importan las mayúsculas ni los espacios de los costados", () => {
    expect(nivelStyle("  FÍSICA ALTA ")).toEqual(nivelStyle("Física alta"));
  });

  it("un nivel creado por el admin cae en el neutro, no en un badge sin estilo", () => {
    expect(nivelStyle("Alto rendimiento")).toEqual(NEUTRO);
  });

  it("sin nivel (undefined o vacío) también da el neutro", () => {
    expect(nivelStyle(undefined)).toEqual(NEUTRO);
    expect(nivelStyle("")).toEqual(NEUTRO);
  });

  it("devuelve siempre los tres colores: fondo, texto y borde", () => {
    expect(nivelStyle("Física baja")).toHaveLength(3);
  });
});
