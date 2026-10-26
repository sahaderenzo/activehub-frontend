import { describe, expect, it } from "vitest";
import { fotosDeActividad } from "./galeria";

/** Orden y deduplicación de las fotos del detalle de una actividad (2026-10-25). */

const claves = (a: Parameters<typeof fotosDeActividad>[0]) => fotosDeActividad(a).map((f) => f.clave);

describe("fotosDeActividad", () => {
  it("sin el detalle cargado sólo ofrece la portada", () => {
    expect(claves({ id: "a1" })).toEqual(["portada"]);
  });

  it("la portada que es una imagen de la galería no se repite y va primero", () => {
    // Regresión: la primera imagen subida queda como portada y se veía dos veces.
    expect(claves({ id: "a1", imagenes: ["i1", "i2", "i3"], tienePortada: true, portadaImagenId: "i2" })).toEqual([
      "i2",
      "i1",
      "i3",
    ]);
  });

  it("una portada subida aparte va primero y después toda la galería", () => {
    expect(claves({ id: "a1", imagenes: ["i1", "i2"], tienePortada: true, portadaImagenId: null })).toEqual([
      "portada",
      "i1",
      "i2",
    ]);
  });

  it("sin portada muestra sólo la galería, y sin nada no ofrece ninguna foto", () => {
    expect(claves({ id: "a1", imagenes: ["i1"], tienePortada: false, portadaImagenId: null })).toEqual(["i1"]);
    expect(claves({ id: "a1", imagenes: [], tienePortada: false, portadaImagenId: null })).toEqual([]);
  });

  it("arma las URL públicas de la portada y de cada imagen", () => {
    const [portada, imagen] = fotosDeActividad({ id: "a1", imagenes: ["i1"], tienePortada: true, portadaImagenId: null });
    expect(portada.src).toMatch(/\/api\/fotos\/actividad\/a1$/);
    expect(imagen.src).toMatch(/\/api\/fotos\/actividad\/imagen\/i1$/);
  });
});
