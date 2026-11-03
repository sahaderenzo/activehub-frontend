import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InstructorSanciones from "./Sanciones";
import type { MiSancion, MisSanciones } from "../../context/DataContext";

/** "Mis sanciones" (V36): donde el instructor ve la multa, a dónde transferir y carga el comprobante. */

const DATA = vi.hoisted(() => ({
  listarMisSanciones: vi.fn(),
  enviarComprobantePenalizacion: vi.fn(),
}));
const AUTH = vi.hoisted(() => ({ refrescarRestricciones: vi.fn() }));
vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const multa = (extra: Partial<MiSancion> = {}): MiSancion => ({
  id: "pen-1",
  tipo: "Económica",
  motivo: "Faltó a la clase del sábado",
  monto: 5000,
  fechaInicio: null,
  fechaFin: null,
  createdAt: "2026-11-01T15:00:00Z",
  estadoPago: "PENDIENTE_PAGO",
  vigente: false,
  levantadaAt: null,
  motivoLevantamiento: null,
  comprobantes: [],
  ...extra,
});

const respuesta = (sanciones: MiSancion[], extra: Partial<MisSanciones> = {}): MisSanciones => ({
  multaPendiente: true,
  suspendidoHasta: null,
  transferencia: { alias: "activehub.multas", cbu: "0000003100000000000001", titular: "ActiveHub" },
  sanciones,
  ...extra,
});

function montar() {
  render(
    <MemoryRouter>
      <InstructorSanciones />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  DATA.listarMisSanciones.mockReset();
  DATA.enviarComprobantePenalizacion.mockReset();
  AUTH.refrescarRestricciones.mockReset().mockResolvedValue(undefined);
});

describe("Mis sanciones", () => {
  it("muestra el monto y los datos para transferir", async () => {
    DATA.listarMisSanciones.mockResolvedValue(respuesta([multa()]));
    montar();

    expect(await screen.findByText("Pago de penalización")).toBeInTheDocument();
    expect(screen.getByText("Transferí el monto a:")).toBeInTheDocument();
    expect(screen.getByText("Alias: activehub.multas")).toBeInTheDocument();
    expect(screen.getByText("Titular: ActiveHub")).toBeInTheDocument();
    expect(AUTH.refrescarRestricciones).toHaveBeenCalled();
  });

  it("sin datos de transferencia en el servidor manda a consultar a la administración", async () => {
    DATA.listarMisSanciones.mockResolvedValue(respuesta([multa()], { transferencia: { alias: null, cbu: null, titular: null } }));
    montar();
    expect(await screen.findByText("Consultá los datos para transferir con la administración.")).toBeInTheDocument();
  });

  it("envía el comprobante elegido", async () => {
    DATA.listarMisSanciones.mockResolvedValue(respuesta([multa()]));
    DATA.enviarComprobantePenalizacion.mockResolvedValue(undefined);
    montar();
    const usuario = userEvent.setup();

    await screen.findByText("Pago de penalización");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    const archivo = new File(["%PDF"], "transferencia.pdf", { type: "application/pdf" });
    await usuario.upload(screen.getByLabelText("Comprobante de pago"), archivo);
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(DATA.enviarComprobantePenalizacion).toHaveBeenCalledWith("pen-1", archivo);
    expect(DATA.listarMisSanciones).toHaveBeenCalledTimes(2);
  });

  it("con el comprobante en revisión no deja mandar otro", async () => {
    DATA.listarMisSanciones.mockResolvedValue(
      respuesta([
        multa({
          estadoPago: "EN_REVISION",
          comprobantes: [{ id: "c-1", nombreArchivo: "transferencia.pdf", estado: "EN_REVISION", motivoInvalidez: null, createdAt: "2026-11-02T10:00:00Z" }],
        }),
      ]),
    );
    montar();

    expect(await screen.findByText(/La administración lo está revisando/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
  });

  it("si el anterior fue inválido dice por qué y pide otro", async () => {
    DATA.listarMisSanciones.mockResolvedValue(
      respuesta([
        multa({
          comprobantes: [{ id: "c-1", nombreArchivo: "captura.png", estado: "INVALIDO", motivoInvalidez: "el monto no coincide", createdAt: "2026-11-02T10:00:00Z" }],
        }),
      ]),
    );
    montar();

    expect(await screen.findByText("Tu comprobante anterior no es válido: el monto no coincide. Cargá uno nuevo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("una multa ya pagada queda sólo en el historial", async () => {
    DATA.listarMisSanciones.mockResolvedValue(respuesta([multa({ estadoPago: "PAGADA" })], { multaPendiente: false }));
    montar();

    expect(await screen.findByText("Historial de sanciones")).toBeInTheDocument();
    expect(screen.queryByText("Pago de penalización")).not.toBeInTheDocument();
    expect(screen.getByText("Pagada")).toBeInTheDocument();
  });
});
