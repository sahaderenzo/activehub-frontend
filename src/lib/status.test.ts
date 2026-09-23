import { describe, expect, it } from "vitest";
import { claseStatusType, denunciaStatusType, inscripcionStatusType, pagoStatusType } from "./status";

/**
 * La traducción de los estados del dominio al tipo de badge. Los nombres de estado son
 * también texto de interfaz y tienen que coincidir **literalmente** con la especificación
 * (incluidas las tildes de "PreInscripción" y "En Auditoría"), así que estas pruebas son,
 * además, el control de que nadie los reescriba.
 */
describe("inscripcionStatusType", () => {
  it("mapea los cuatro estados de inscripción", () => {
    expect(inscripcionStatusType("PreInscripción")).toBe("preinscripcion");
    expect(inscripcionStatusType("PagoPendiente")).toBe("pagopendiente");
    expect(inscripcionStatusType("Inscripto")).toBe("inscripto");
    expect(inscripcionStatusType("Cancelada")).toBe("cancelada");
  });
});

describe("claseStatusType", () => {
  it("mapea los cuatro estados de clase", () => {
    expect(claseStatusType("Programada")).toBe("programada");
    expect(claseStatusType("Habilitada")).toBe("habilitada");
    expect(claseStatusType("Cancelada")).toBe("cancelada");
    expect(claseStatusType("Finalizada")).toBe("finalizada");
  });
});

describe("pagoStatusType", () => {
  it("mapea los cuatro estados de pago", () => {
    expect(pagoStatusType("Retenido")).toBe("retenido");
    expect(pagoStatusType("Liberado")).toBe("liberado");
    expect(pagoStatusType("Efectivo")).toBe("efectivo");
    // Un pago cancelado (reintegrado) NO comparte badge con una inscripción cancelada.
    expect(pagoStatusType("Cancelado")).toBe("pagocancelado");
  });
});

describe("denunciaStatusType", () => {
  it("mapea los tres estados de denuncia", () => {
    expect(denunciaStatusType("Pendiente")).toBe("denunciapendiente");
    expect(denunciaStatusType("En Auditoría")).toBe("auditoria");
    expect(denunciaStatusType("Resuelta")).toBe("resuelta");
  });
});
