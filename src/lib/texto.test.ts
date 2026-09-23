import { describe, expect, it } from "vitest";
import { incluye, normalizar } from "./texto";

/**
 * `lib/texto.ts` es la razón por la que buscar "natacion" encuentra "Natación" en TODA la
 * aplicación. Lo que estas pruebas fijan es esa promesa: si alguien "simplifica" la función
 * a un `toLowerCase()`, acá se cae.
 */
describe("normalizar", () => {
  it("baja a minúsculas", () => {
    expect(normalizar("TREKKING")).toBe("trekking");
  });

  it("saca las tildes", () => {
    expect(normalizar("Natación")).toBe("natacion");
    expect(normalizar("Inscripción")).toBe("inscripcion");
    expect(normalizar("En Auditoría")).toBe("en auditoria");
  });

  it("aplana la ñ, que es lo que la gente espera al tipear", () => {
    expect(normalizar("niño")).toBe("nino");
    expect(normalizar("reseña")).toBe("resena");
  });

  it("no toca los números ni la puntuación", () => {
    expect(normalizar("Clase 4 días · $1.500")).toBe("clase 4 dias · $1.500");
  });
});

describe("incluye", () => {
  it("encuentra sin tildes lo que está escrito con tildes, y al revés", () => {
    expect(incluye("Natación para adultos", "natacion")).toBe(true);
    expect(incluye("Natacion para adultos", "natación")).toBe(true);
  });

  it("ignora mayúsculas y espacios de más en el término", () => {
    expect(incluye("Yoga al aire libre", "  YOGA ")).toBe(true);
  });

  it("un término vacío matchea todo: es el caso 'sin búsqueda'", () => {
    expect(incluye("cualquier cosa", "")).toBe(true);
    expect(incluye("cualquier cosa", "   ")).toBe(true);
  });

  it("tolera null y undefined en el texto", () => {
    expect(incluye(null, "algo")).toBe(false);
    expect(incluye(undefined, "algo")).toBe(false);
    // Sin término, ni siquiera mira el texto.
    expect(incluye(null, "")).toBe(true);
  });

  it("no encuentra lo que no está", () => {
    expect(incluye("Trekking Cordón del Plata", "natacion")).toBe(false);
  });
});
