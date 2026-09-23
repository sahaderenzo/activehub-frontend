import { describe, expect, it } from "vitest";
import { FAQS, buscarFaq } from "./faqs";

/**
 * La base de conocimiento que comparten la pantalla de Ayuda y el chatbot. `buscarFaq` es el
 * camino **sin IA**: es lo que responde cuando Groq no está disponible, así que tiene que
 * seguir funcionando aunque el asistente esté caído.
 */
describe("FAQS", () => {
  it("los id son únicos: las guías rápidas de Ayuda abren por id", () => {
    const ids = FAQS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ninguna queda sin pregunta ni respuesta", () => {
    for (const faq of FAQS) {
      expect(faq.q.trim().length, faq.id).toBeGreaterThan(0);
      expect(faq.a.trim().length, faq.id).toBeGreaterThan(0);
    }
  });
});

describe("buscarFaq", () => {
  it("encuentra por una palabra de las claves", () => {
    expect(buscarFaq("efectivo")?.id).toBe("medios-de-pago");
  });

  it("encuentra escribiendo sin tildes", () => {
    expect(buscarFaq("como dejo una resena")?.id).toBe("dejar-resena");
  });

  it("gana la FAQ con más términos coincidentes", () => {
    expect(buscarFaq("diferencia entre preinscripcion e inscripcion")?.id).toBe("preinscripcion-vs-inscripcion");
  });

  it("descarta las palabras cortas: 'que', 'con', 'una' no deciden nada", () => {
    expect(buscarFaq("que con una")).toBeNull();
  });

  it("sin coincidencias devuelve null, y la pantalla ofrece el resto de la ayuda", () => {
    expect(buscarFaq("cotizacion del dolar")).toBeNull();
  });

  it("una consulta vacía no rompe", () => {
    expect(buscarFaq("")).toBeNull();
    expect(buscarFaq("   ")).toBeNull();
  });
});
