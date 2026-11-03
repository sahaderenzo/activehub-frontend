import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminPenalizaciones from "./Penalizaciones";
import type { PenalizacionAdmin } from "../../context/DataContext";

/** V36: el administrador revisa el comprobante de la multa y desbloquea o lo invalida; también levanta suspensiones. */

const DATA = vi.hoisted(() => ({
  listarPenalizaciones: vi.fn(),
  crearPenalizacion: vi.fn(),
  listarUsuariosAdmin: vi.fn(),
  verComprobantePenalizacion: vi.fn(),
  desbloquearInstructorPenalizacion: vi.fn(),
  invalidarComprobantePenalizacion: vi.fn(),
  levantarSuspension: vi.fn(),
}));
const AUTH = vi.hoisted(() => ({ puede: () => false }));
vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const base = (extra: Partial<PenalizacionAdmin>): PenalizacionAdmin => ({
  id: "pen-1",
  usuarioId: "inst-1",
  usuarioNombre: "Sofía Ruiz",
  usuarioEmail: "sofia@activehub.test",
  tipo: "Económica",
  motivo: "Faltó a la clase",
  monto: 5000,
  fechaInicio: null,
  fechaFin: null,
  vigente: false,
  denunciaId: null,
  cantidadPenalizacionesUsuario: 1,
  createdAt: "2026-11-01T15:00:00Z",
  estadoPago: "PENDIENTE_PAGO",
  pagoAprobadoAt: null,
  levantadaAt: null,
  motivoLevantamiento: null,
  comprobantes: [],
  ...extra,
});

const enRevision = base({
  estadoPago: "EN_REVISION",
  comprobantes: [{ id: "comp-1", nombreArchivo: "transferencia.pdf", estado: "EN_REVISION", motivoInvalidez: null, createdAt: "2026-11-02T10:00:00Z", revisadoAt: null }],
});

const suspension = base({
  id: "pen-2",
  tipo: "Suspensión temporal",
  monto: null,
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-30",
  vigente: true,
  estadoPago: null,
});

function montar() {
  render(
    <MemoryRouter>
      <AdminPenalizaciones />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(DATA).forEach((f) => f.mockReset());
  DATA.listarUsuariosAdmin.mockResolvedValue([]);
  DATA.verComprobantePenalizacion.mockResolvedValue(undefined);
});

describe("Penalizaciones del admin", () => {
  it("muestra el estado del pago de cada multa", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([base({}), enRevision, base({ id: "pen-3", estadoPago: "PAGADA" })]);
    montar();

    const lista = within(await screen.findByTestId("lista-penalizaciones"));
    expect(await lista.findByText("Pendiente de pago")).toBeInTheDocument();
    expect(lista.getByText("En revisión")).toBeInTheDocument();
    expect(lista.getByText("Pagada")).toBeInTheDocument();
  });

  it("multa y suspensión aplicadas juntas van en una sola fila, cada una con su estado", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([base({}), suspension]);
    montar();

    const lista = within(await screen.findByTestId("lista-penalizaciones"));
    expect(await lista.findByText("Pendiente de pago")).toBeInTheDocument();
    expect(screen.getAllByText("Sofía Ruiz")).toHaveLength(1);
    expect(screen.getAllByText("Faltó a la clase")).toHaveLength(1);
    expect(screen.getByText("Multa")).toBeInTheDocument();
    expect(screen.getByText("Suspensión")).toBeInTheDocument();
    expect(lista.getByText("Vigente")).toBeInTheDocument();
    // Cada parte se resuelve por su lado: la suspensión sigue ofreciendo su botón.
    expect(screen.getByText("Desbloquear")).toBeInTheDocument();
  });

  it("la lupa busca por instructor y Limpiar filtros vuelve a mostrar todo", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([
      base({}),
      base({ id: "pen-9", usuarioId: "inst-2", usuarioNombre: "Diego Morales", usuarioEmail: "diego@activehub.test" }),
    ]);
    montar();
    const usuario = userEvent.setup();

    await screen.findByText("Diego Morales");
    expect(screen.getByText("2 en total")).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("Buscar por instructor"), "diego");
    expect(screen.queryByText("Sofía Ruiz")).not.toBeInTheDocument();
    expect(screen.getByText("1 de 2")).toBeInTheDocument();

    await usuario.click(screen.getByText("Limpiar filtros"));
    expect(screen.getByText("Sofía Ruiz")).toBeInTheDocument();
  });

  it("un filtro sin resultados lo dice", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([base({})]);
    montar();
    const usuario = userEvent.setup();

    await screen.findByText("Sofía Ruiz");
    await usuario.selectOptions(screen.getByLabelText("Estado"), "Pagada");
    expect(screen.getByText("No hay penalizaciones con esos filtros.")).toBeInTheDocument();
  });

  it("pagina de a 10 sanciones", async () => {
    DATA.listarPenalizaciones.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) =>
        base({ id: `pen-${i}`, usuarioId: `inst-${i}`, usuarioNombre: `Instructor ${String(i).padStart(2, "0")}` }),
      ),
    );
    montar();

    await screen.findByText("12 en total");
    expect(within(screen.getByTestId("lista-penalizaciones")).getAllByText(/^Instructor \d\d$/)).toHaveLength(10);
  });

  it("con el comprobante en revisión abre el archivo", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([enRevision]);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("Ver comprobante"));
    expect(DATA.verComprobantePenalizacion).toHaveBeenCalledWith("comp-1");
  });

  it("desbloquear avisa que sigue suspendido si tiene una suspensión en curso", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([enRevision, suspension]);
    DATA.desbloquearInstructorPenalizacion.mockResolvedValue({ suspendidoHasta: "2026-11-30" });
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("Desbloquear instructor"));
    expect(screen.getByText(/Sigue suspendido hasta el/)).toBeInTheDocument();
    await usuario.click(screen.getByText("Aprobar y desbloquear"));

    expect(DATA.desbloquearInstructorPenalizacion).toHaveBeenCalledWith("pen-1");
    expect(await screen.findByText("Pago aprobado. Sofía Ruiz sigue suspendido hasta el 30/11/2026.")).toBeInTheDocument();
  });

  it("notificar invalidez exige el motivo", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([enRevision]);
    DATA.invalidarComprobantePenalizacion.mockResolvedValue(undefined);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole("button", { name: "Notificar invalidez" }));
    const botones = screen.getAllByRole("button", { name: "Notificar invalidez" });
    await usuario.click(botones[botones.length - 1]);
    expect(screen.getByText("El motivo es obligatorio.")).toBeInTheDocument();
    expect(DATA.invalidarComprobantePenalizacion).not.toHaveBeenCalled();

    await usuario.type(screen.getByLabelText("Motivo *"), "el monto no coincide");
    await usuario.click(botones[botones.length - 1]);
    expect(DATA.invalidarComprobantePenalizacion).toHaveBeenCalledWith("pen-1", "el monto no coincide");
  });

  it("levanta una suspensión vigente con motivo", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([suspension]);
    DATA.levantarSuspension.mockResolvedValue({ multaPendiente: false });
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("Desbloquear"));
    await usuario.type(screen.getByLabelText("Motivo *"), "error en la denuncia");
    await usuario.click(screen.getByText("Levantar suspensión"));

    expect(DATA.levantarSuspension).toHaveBeenCalledWith("pen-2", "error en la denuncia");
    expect(await screen.findByText("Suspensión levantada. Sofía Ruiz ya puede volver a operar.")).toBeInTheDocument();
  });

  it("una suspensión levantada no ofrece desbloquear y muestra el motivo", async () => {
    DATA.listarPenalizaciones.mockResolvedValue([
      { ...suspension, vigente: false, levantadaAt: "2026-11-05T12:00:00Z", motivoLevantamiento: "error en la denuncia" },
    ]);
    montar();

    const lista = within(await screen.findByTestId("lista-penalizaciones"));
    expect(await lista.findByText("Levantada")).toBeInTheDocument();
    expect(screen.getByText(/error en la denuncia/)).toBeInTheDocument();
    expect(screen.queryByText("Desbloquear")).not.toBeInTheDocument();
  });
});
