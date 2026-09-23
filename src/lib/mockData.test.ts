import { describe, expect, it } from "vitest";
import type { Clase } from "./types";
import { diasHastaClase, disponibilidad, formatFecha, formatHora, tipoIngreso } from "./mockData";

/**
 * Los helpers de `mockData.ts` son de **formato y de reglas**, no de datos: los usan todas las
 * pantallas aunque el catálogo ya venga de la API. `tipoIngreso` es, además, la regla de los
 * 4 días del lado del cliente — la que decide si el botón dice "Preinscribirme" o
 * "Inscribirme y pagar".
 */
const DIA_MS = 24 * 60 * 60 * 1000;

function claseEn(dias: number): Clase {
  const fecha = new Date(Date.now() + dias * DIA_MS);
  return {
    id: "c1",
    actividadId: "a1",
    fechaHora: fecha.toISOString(),
    horaFin: new Date(fecha.getTime() + 60 * 60 * 1000).toISOString(),
    estado: "Programada",
    cuposMax: 10,
    cuposOcupados: 0,
    precio: 5000,
  };
}

describe("disponibilidad", () => {
  it("sin lugares libres, 'Sin cupos'", () => {
    expect(disponibilidad({ cuposMax: 10, cuposOcupados: 10 })).toEqual({ label: "Sin cupos", type: "sincupos" });
  });

  it("sobrevendida (no debería pasar, pero no se muestra en negativo)", () => {
    expect(disponibilidad({ cuposMax: 10, cuposOcupados: 12 }).type).toBe("sincupos");
  });

  it("con 3 o menos, avisa que son los últimos", () => {
    expect(disponibilidad({ cuposMax: 10, cuposOcupados: 7 })).toEqual({
      label: "3 cupos · Últimos",
      type: "ultimos",
    });
    expect(disponibilidad({ cuposMax: 10, cuposOcupados: 9 }).label).toBe("1 cupos · Últimos");
  });

  it("con más de 3, 'Disponible'", () => {
    expect(disponibilidad({ cuposMax: 10, cuposOcupados: 6 })).toEqual({ label: "Disponible", type: "disponible" });
  });
});

describe("diasHastaClase y tipoIngreso (la regla de los 4 días)", () => {
  it("a más de 4 días, sólo preinscripción", () => {
    expect(tipoIngreso(claseEn(4.5))).toBe("preinscripcion");
    expect(tipoIngreso(claseEn(30))).toBe("preinscripcion");
  });

  it("a 4 días o menos, inscripción definitiva", () => {
    expect(tipoIngreso(claseEn(3.5))).toBe("inscripcion");
    expect(tipoIngreso(claseEn(0.5))).toBe("inscripcion");
  });

  it("una clase que ya pasó da días negativos y sigue siendo inscripción (la pantalla la filtra por estado)", () => {
    expect(diasHastaClase(claseEn(-2))).toBeLessThan(0);
    expect(tipoIngreso(claseEn(-2))).toBe("inscripcion");
  });

  it("redondea hacia arriba: media jornada cuenta como un día", () => {
    expect(diasHastaClase(claseEn(2.2))).toBe(3);
  });
});

describe("formatFecha y formatHora", () => {
  it("la fecha sale en el formato corto en castellano", () => {
    // Mediodía local para que el día no se corra por la zona horaria.
    expect(formatFecha(new Date(2026, 5, 23, 12, 0).toISOString())).toBe("mar 23 jun");
  });

  it("la hora sale con dos dígitos, en la convención de es-AR", () => {
    // El sufijo "a. m." / "p. m." lo pone `toLocaleTimeString` según la versión de ICU; lo
    // que no puede cambiar es que la hora y los minutos vayan con dos dígitos.
    expect(formatHora(new Date(2026, 5, 23, 9, 5).toISOString())).toMatch(/^09:05/);
    expect(formatHora(new Date(2026, 5, 23, 18, 30).toISOString())).toMatch(/^(18|06):30/);
  });
});
