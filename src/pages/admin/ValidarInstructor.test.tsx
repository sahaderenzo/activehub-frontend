import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminValidarInstructor from "./ValidarInstructor";
import type { DocumentoInstructor, InstructorAdmin } from "../../context/DataContext";

/**
 * Validar instructor (2026-10-26): el motivo del rechazo es obligatorio, la solicitud rechazada se
 * lee "Validación rechazada" (decía "Pago rechazado") y la documentación nueva y la quitada se marcan.
 */

const INSTRUCTOR = vi.hoisted(() => ({ actual: null as unknown }));
const DATA = vi.hoisted(() => ({
  obtenerInstructor: vi.fn(),
  aprobarInstructor: vi.fn(),
  rechazarInstructor: vi.fn(),
  listarClasesInstructor: vi.fn(),
  listarDocumentosInstructor: vi.fn(),
  verDocumentoInstructor: vi.fn(),
}));
vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function instructor(estado: InstructorAdmin["estadoVerificacion"], motivo?: string): InstructorAdmin {
  return {
    id: "inst-1",
    nombre: "Sofía",
    apellido: "Ruiz",
    email: "sofia@test.com",
    createdAt: "2026-10-01T12:00:00Z",
    especialidad: "Yoga",
    estadoVerificacion: estado,
    motivoRechazo: motivo,
  };
}
const DOCS: DocumentoInstructor[] = [
  { id: "d1", nombreArchivo: "nuevo.pdf", tipoDocumento: "application/pdf", tamanioBytes: 100, createdAt: "2026-10-21T12:00:00Z", nuevo: true, retirado: false },
  { id: "d2", nombreArchivo: "viejo.pdf", tipoDocumento: "application/pdf", tamanioBytes: 100, createdAt: "2026-10-01T12:00:00Z", nuevo: false, retirado: true },
];

beforeEach(() => {
  DATA.obtenerInstructor.mockReset().mockImplementation(() => Promise.resolve(INSTRUCTOR.actual));
  DATA.listarClasesInstructor.mockReset().mockResolvedValue([]);
  DATA.listarDocumentosInstructor.mockReset().mockResolvedValue(DOCS);
  DATA.rechazarInstructor.mockReset().mockResolvedValue(undefined);
});

function montar(ruta = "/admin/validar-instructor/inst-1") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/admin/validar-instructor/:id" element={<AdminValidarInstructor />} />
        <Route path="/admin/gestion/instructores" element={<div>Gestión de instructores</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("validar instructor", () => {
  it("una solicitud rechazada se lee 'Validación rechazada', no 'Pago rechazado'", async () => {
    INSTRUCTOR.actual = instructor("RECHAZADO", "Falta el certificado");
    montar();

    expect(await screen.findByText("Validación rechazada")).toBeInTheDocument();
    expect(screen.queryByText("Pago rechazado")).not.toBeInTheDocument();
  });

  it("marca la documentación nueva y la quitada, y muestra el motivo anterior al volver a postularse", async () => {
    INSTRUCTOR.actual = instructor("PENDIENTE", "Falta el certificado");
    montar();

    expect(await screen.findByText("Nuevo desde el rechazo")).toBeInTheDocument();
    expect(screen.getByText("Quitado por el instructor")).toBeInTheDocument();
    expect(screen.getByText("Se volvió a postular. Motivo del rechazo anterior: Falta el certificado")).toBeInTheDocument();
  });

  it("no rechaza sin motivo; con motivo, lo manda", async () => {
    INSTRUCTOR.actual = instructor("PENDIENTE");
    montar("/admin/validar-instructor/inst-1?accion=rechazar");
    const usuario = userEvent.setup();

    // Llega desde Gestión con el formulario ya abierto.
    const campo = await screen.findByLabelText("Motivo del rechazo *");
    await usuario.click(screen.getByRole("button", { name: "Confirmar rechazo" }));
    expect(DATA.rechazarInstructor).not.toHaveBeenCalled();
    expect(screen.getByText("Escribí el motivo del rechazo: es lo que va a leer el instructor para corregir su solicitud.")).toBeInTheDocument();

    await usuario.type(campo, "Falta el certificado");
    await usuario.click(screen.getByRole("button", { name: "Confirmar rechazo" }));
    expect(DATA.rechazarInstructor).toHaveBeenCalledWith("inst-1", "Falta el certificado");
  });

  it("en una solicitud aprobada, 'Rechazar solicitud' abre el formulario (antes no hacía nada)", async () => {
    INSTRUCTOR.actual = instructor("APROBADO");
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole("button", { name: "Rechazar solicitud" }));

    expect(screen.getByLabelText("Motivo del rechazo *")).toBeInTheDocument();
  });
});
