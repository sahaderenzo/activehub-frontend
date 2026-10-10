import { describe, expect, it } from "vitest";
import {
  claseStatusType,
  denunciaStatusType,
  explicarPagoAlumno,
  explicarPagoInstructor,
  inscripcionStatusType,
  pagoStatusType,
} from "./status";

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

  it("mapea los estados que llegaron con Mercado Pago real", () => {
    // KAN-63: antes caían en el badge por defecto, que dice "Disponible".
    expect(pagoStatusType("Rechazado")).toBe("rechazado");
    expect(pagoStatusType("Reembolsado")).toBe("reembolsado");
    expect(pagoStatusType("EnRevision")).toBe("revision");
  });
});

describe("explicarPagoAlumno", () => {
  const mp = (estado: Parameters<typeof explicarPagoAlumno>[0]["estado"], capturado = false) =>
    explicarPagoAlumno({ estado, metodo: "Mercado Pago", capturado });

  it("distingue un Retenido reservado de uno ya cobrado", () => {
    expect(mp("Retenido").label).toBe("Retenido hasta la clase");
    expect(mp("Retenido").detalle).toBe("Reservado en tu tarjeta: todavía no se te cobró.");
    expect(mp("Retenido", true).label).toBe("Cobrado");
    expect(mp("Liberado", true).label).toBe("Cobrado");
  });

  it("explica la devolución según se haya cobrado o no", () => {
    expect(mp("Cancelado").label).toBe("Retención liberada");
    expect(mp("Cancelado").detalle).toBe("No se te cobró: se liberó la reserva de tu tarjeta.");
    expect(mp("Reembolsado").label).toBe("Reembolsado");
    expect(mp("Rechazado").detalle).toBe("Mercado Pago no aprobó el pago: no se te cobró.");
    expect(mp("EnRevision").label).toBe("En revisión");
  });

  it("un efectivo cancelado lo devuelve el instructor, no la tarjeta", () => {
    const r = explicarPagoAlumno({ estado: "Cancelado", metodo: "Efectivo", capturado: false });
    expect(r.label).toBe("Pago cancelado");
    expect(r.detalle).toBe("Coordiná con el instructor la devolución de lo que pagaste.");
  });
});

describe("explicarPagoInstructor", () => {
  it("le dice al instructor si la plata ya es suya", () => {
    const retenido = explicarPagoInstructor({ estado: "Retenido", metodo: "Mercado Pago", capturado: false });
    expect(retenido.detalle).toBe("Se cobra al dictarse la clase.");
    const cobrado = explicarPagoInstructor({ estado: "Retenido", metodo: "Mercado Pago", capturado: true });
    expect(cobrado.label).toBe("Cobrado");
    expect(cobrado.detalle).toBe("Se libera 24 h después de la clase si no hay denuncias.");
    expect(explicarPagoInstructor({ estado: "Liberado", metodo: "Mercado Pago", capturado: true }).detalle).toBe(
      "Acreditado en tu cuenta.",
    );
    expect(explicarPagoInstructor({ estado: "Reembolsado", metodo: "Mercado Pago", capturado: true }).label).toBe(
      "Reintegrado",
    );
  });
});

describe("denunciaStatusType", () => {
  it("mapea los tres estados de denuncia", () => {
    expect(denunciaStatusType("Pendiente")).toBe("denunciapendiente");
    expect(denunciaStatusType("En Auditoría")).toBe("auditoria");
    expect(denunciaStatusType("Resuelta")).toBe("resuelta");
  });
});
