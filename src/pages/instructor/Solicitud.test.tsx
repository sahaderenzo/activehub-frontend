import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InstructorSolicitud from "./Solicitud";
import type { DocumentoInstructor } from "../../context/DataContext";

/**
 * "Mis datos" con la solicitud rechazada (2026-10-26). Antes "Volver a postularme" reenviaba la
 * misma documentación que el administrador había rechazado: ahora pide al menos un documento nuevo.
 */

const AUTH = vi.hoisted(() => ({
  currentUser: {
    id: "inst-1",
    nombre: "Sofía",
    apellido: "Ruiz",
    email: "sofia@test.com",
    perfilInstructor: { estadoVerificacion: "RECHAZADO", motivoRechazo: "Falta el certificado de primeros auxilios.", especialidad: "Yoga" },
  },
  actualizarMiPerfil: vi.fn(),
  reabrirSolicitud: vi.fn(),
}));
const DATA = vi.hoisted(() => ({
  docs: [] as unknown[],
  listarMisDocumentos: vi.fn(),
  subirDocumento: vi.fn(),
  verMiDocumento: vi.fn(),
  retirarMiDocumento: vi.fn(),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function doc(id: string, nuevo: boolean): DocumentoInstructor {
  return { id, nombreArchivo: `${id}.pdf`, tipoDocumento: "application/pdf", tamanioBytes: 100, createdAt: "2026-10-20T12:00:00Z", nuevo };
}

beforeEach(() => {
  DATA.listarMisDocumentos.mockReset().mockImplementation(() => Promise.resolve(DATA.docs));
});

function montar() {
  return render(
    <MemoryRouter>
      <InstructorSolicitud />
    </MemoryRouter>,
  );
}

describe("Mis datos con la solicitud rechazada", () => {
  it("muestra el motivo del administrador", async () => {
    DATA.docs = [doc("viejo", false)];
    montar();
    expect(await screen.findByText(/Falta el certificado de primeros auxilios\./)).toBeInTheDocument();
  });

  it("sin documentación nueva no deja volver a postularse y dice por qué", async () => {
    DATA.docs = [doc("viejo", false)];
    montar();
    await screen.findByText("viejo.pdf");

    expect(screen.getByRole("button", { name: "Volver a postularme" })).toBeDisabled();
    expect(screen.getByText('Subí al menos un documento nuevo en "Documentación" para volver a postularte.')).toBeInTheDocument();
  });

  it("con un documento nuevo habilita volver a postularse", async () => {
    DATA.docs = [doc("nuevo", true), doc("viejo", false)];
    montar();
    await screen.findByText("nuevo.pdf");

    expect(screen.getByRole("button", { name: "Volver a postularme" })).toBeEnabled();
  });
});
