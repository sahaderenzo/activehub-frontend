import { describe, expect, it } from "vitest";
import { opinionesVisibles } from "./opiniones";
import type { ReseniaActividad } from "../context/DataContext";

function op(id: string, puntaje: number, createdAt: string): ReseniaActividad {
  return {
    id,
    claseId: "c1",
    alumno: { id: `al-${id}`, nombre: "Ana", apellido: "López" },
    puntaje,
    comentario: null,
    createdAt,
    respuestaInstructor: null,
    respuestaInstructorAt: null,
  };
}

const OPINIONES = [
  op("vieja-5", 5, "2026-01-10T10:00:00Z"),
  op("nueva-2", 2, "2026-10-01T10:00:00Z"),
  op("media-5", 5, "2026-05-10T10:00:00Z"),
  op("media-1", 1, "2026-06-10T10:00:00Z"),
];
const ids = (l: ReseniaActividad[]) => l.map((r) => r.id);

describe("opiniones del detalle", () => {
  it("por defecto, las más recientes primero", () => {
    expect(ids(opinionesVisibles(OPINIONES, null, "Más recientes"))).toEqual(["nueva-2", "media-1", "media-5", "vieja-5"]);
  });

  it("ordena por las más antiguas", () => {
    expect(ids(opinionesVisibles(OPINIONES, null, "Más antiguas"))).toEqual(["vieja-5", "media-5", "media-1", "nueva-2"]);
  });

  it("por calificación, y a igual puntaje la más reciente primero", () => {
    expect(ids(opinionesVisibles(OPINIONES, null, "Mejor calificación"))).toEqual(["media-5", "vieja-5", "nueva-2", "media-1"]);
    expect(ids(opinionesVisibles(OPINIONES, null, "Peor calificación"))).toEqual(["media-1", "nueva-2", "media-5", "vieja-5"]);
  });

  it("filtra por cantidad de estrellas", () => {
    expect(ids(opinionesVisibles(OPINIONES, 5, "Más recientes"))).toEqual(["media-5", "vieja-5"]);
    expect(opinionesVisibles(OPINIONES, 3, "Más recientes")).toEqual([]);
  });

  it("no modifica la lista que recibe", () => {
    const copia = [...OPINIONES];
    opinionesVisibles(OPINIONES, null, "Más antiguas");
    expect(OPINIONES).toEqual(copia);
  });
});
