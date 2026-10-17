import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminAuditoria from "./Auditoria";
import type { DenunciaAdmin } from "../../context/DataContext";

/**
 * "Gestión de denuncias" (ex "Auditoría"). Reportado: sobre una reseña denunciada la pantalla
 * ofrecía igual Reintegrar, Suspender y Penalizar, que el backend rechaza. Y la suspensión no
 * tenía tope: se podía suspender cien años.
 */
const listarDenunciasAdmin = vi.hoisted(() => vi.fn());
const resolverDenuncia = vi.hoisted(() => vi.fn());
const tomarDenuncia = vi.hoisted(() => vi.fn());

vi.mock("../../context/DataContext", () => ({
  useData: () => ({ listarDenunciasAdmin, resolverDenuncia, tomarDenuncia }),
}));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const persona = (nombre: string) => ({ id: nombre, nombre, apellido: "Test" }) as DenunciaAdmin["instructor"];

function denuncia(id: string, tipo: DenunciaAdmin["tipo"], motivo: string): DenunciaAdmin {
  return {
    id,
    tipo,
    claseId: "c1",
    claseFechaHora: "2026-10-10T18:00:00Z",
    actividadId: "a1",
    actividadNombre: "Yoga",
    alumno: tipo === "CLASE" ? persona("Ana") : null,
    instructor: persona("Iván"),
    denunciante: tipo === "CLASE" ? persona("Ana") : persona("Iván"),
    resenia: tipo === "RESENIA" ? { id: "r1", puntaje: 1, comentario: "Malísimo", autor: persona("Bruno"), oculta: false } : null,
    motivo,
    estado: "En Auditoría",
    resolucion: null,
    detalle: null,
    pago: null,
    createdAt: "2026-10-10T20:00:00Z",
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <AdminAuditoria />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listarDenunciasAdmin.mockReset();
  resolverDenuncia.mockReset();
  tomarDenuncia.mockReset();
});

describe("acciones según lo denunciado", () => {
  it("sobre una reseña sólo ofrece ocultarla o desestimar", async () => {
    listarDenunciasAdmin.mockResolvedValue([denuncia("d1", "RESENIA", "Insulta al instructor")]);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("Insulta al instructor"));

    expect(screen.getByRole("button", { name: /Ocultar la reseña/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Desestimar/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reintegrar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Suspender/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /penalización/ })).not.toBeInTheDocument();
  });

  it("sobre una clase ofrece las cuatro resoluciones y no la de reseñas", async () => {
    listarDenunciasAdmin.mockResolvedValue([denuncia("d2", "CLASE", "El profe no vino")]);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("El profe no vino"));

    expect(screen.getByRole("button", { name: /Reintegrar el pago/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Suspender al instructor/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aplicar penalización económica/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ocultar la reseña/ })).not.toBeInTheDocument();
  });
});

describe("tope de la suspensión", () => {
  it("no manda una suspensión de más de 365 días", async () => {
    listarDenunciasAdmin.mockResolvedValue([denuncia("d3", "CLASE", "Faltó sin avisar")]);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByText("Faltó sin avisar"));
    await usuario.click(screen.getByRole("button", { name: /Suspender al instructor/ }));
    const dias = screen.getByRole("spinbutton", { name: /Días de suspensión/ });
    await usuario.clear(dias);
    await usuario.type(dias, "36500");
    await usuario.click(screen.getByRole("button", { name: "Suspender" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("más de 365 días");
    expect(resolverDenuncia).not.toHaveBeenCalled();
  });
});

describe("paginación", () => {
  it("muestra 10 denuncias por página", async () => {
    listarDenunciasAdmin.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => denuncia(`d${i}`, "CLASE", `Motivo ${i + 1}`)),
    );
    montar();
    const usuario = userEvent.setup();

    expect(await screen.findByText("Motivo 1")).toBeInTheDocument();
    expect(screen.queryByText("Motivo 11")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByText("Motivo 11")).toBeInTheDocument());
    expect(screen.queryByText("Motivo 1")).not.toBeInTheDocument();
  });
});
