import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { MAX_CARACTERES_CONSULTA, esIaNoDisponible, esSinCuota, preguntarAlAsistente } from "./ia";

/**
 * Los dos clasificadores de error del asistente. **La distinción importa**: "no disponible"
 * cae al comportamiento sin IA sin decir nada, y "sin cuota" muestra el mensaje del backend,
 * que dice cuánto hay que esperar. Confundirlos deja a la persona con una FAQ que no
 * contesta lo que preguntó y sin enterarse de que puede volver en un rato.
 */
describe("esIaNoDisponible", () => {
  it("es true con el 503 del backend", () => {
    expect(esIaNoDisponible(new ApiError("IA_NO_DISPONIBLE", "sin modelo", 503))).toBe(true);
  });

  it("es true con el backend caído: para la persona el resultado es el mismo", () => {
    expect(esIaNoDisponible(new ApiError("ERROR_RED", "sin conexión", 0))).toBe(true);
  });

  it("es false con un error de cuota, que se trata distinto", () => {
    expect(esIaNoDisponible(new ApiError("IA_SIN_CUOTA", "volvé en 3 minutos", 429))).toBe(false);
  });

  it("es false con cualquier cosa que no sea un ApiError", () => {
    expect(esIaNoDisponible(new Error("boom"))).toBe(false);
    expect(esIaNoDisponible(null)).toBe(false);
  });
});

describe("esSinCuota", () => {
  it("reconoce el 429 propio del asistente", () => {
    expect(esSinCuota(new ApiError("IA_SIN_CUOTA", "volvé en 3 minutos", 429))).toBe(true);
  });

  it("reconoce el 429 genérico del backend, que es la red de seguridad", () => {
    expect(esSinCuota(new ApiError("DEMASIADOS_INTENTOS", "esperá un rato", 429))).toBe(true);
  });

  it("es false con el 503 y con un error cualquiera", () => {
    expect(esSinCuota(new ApiError("IA_NO_DISPONIBLE", "sin modelo", 503))).toBe(false);
    expect(esSinCuota("429")).toBe(false);
  });
});

describe("preguntarAlAsistente", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ respuesta: "ok", secciones: [], sinInformacion: false }),
      } as unknown as Response),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("manda sólo los últimos 6 turnos: el chat no tiene estado en el servidor y son tokens de una cuota gratuita", async () => {
    const historial = Array.from({ length: 10 }, (_, i) => ({ deElAsistente: i % 2 === 1, texto: `turno ${i}` }));

    await preguntarAlAsistente("¿Cómo me inscribo?", historial);

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.pregunta).toBe("¿Cómo me inscribo?");
    expect(body.historial).toHaveLength(6);
    expect(body.historial[0].texto).toBe("turno 4");
  });

  it("sin historial manda una lista vacía, no undefined", async () => {
    await preguntarAlAsistente("hola");
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.historial).toEqual([]);
  });
});

describe("MAX_CARACTERES_CONSULTA", () => {
  it("replica el tope del backend (@Size(max = 400))", () => {
    expect(MAX_CARACTERES_CONSULTA).toBe(400);
  });
});
