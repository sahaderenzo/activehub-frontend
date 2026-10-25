import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoPerfil from "./Perfil";

/**
 * Perfil del alumno (2026-10-24): se retiró el "Historial de actividades", que repetía "Mis
 * clases", y se agregó "Información de salud" para ver y editar lo que se informó en el alta en
 * "¿Padecés alguna enfermedad o lesión?", que antes no se podía cambiar nunca más.
 */

const AUTH = vi.hoisted(() => ({
  currentUser: {
    id: "al-1",
    nombre: "Ana",
    apellido: "López",
    email: "ana@test.com",
    telefono: "2615555555",
    rol: "ALUMNO",
    perfilAlumno: { usuarioId: "al-1", intereses: [] as unknown[], condicionSalud: "Asma" as string | undefined },
  },
  logout: () => {},
  actualizarMiPerfil: () => Promise.resolve(),
  actualizarMisIntereses: () => Promise.resolve(),
  actualizarMiCondicionSalud: vi.fn<(texto: string) => Promise<void>>(() => Promise.resolve()),
  cambiarMiContrasenia: () => Promise.resolve(),
  darDeBajaMiCuenta: () => Promise.resolve(),
  puede: () => true,
}));

// Valores estables entre renders, como los del DataContext real.
const DATA = vi.hoisted(() => ({
  tiposActividad: [],
  getCategoria: () => undefined,
  subirFotoPerfil: () => Promise.resolve(),
  listarMisResenas: () => Promise.resolve([]),
  listarMisInscripciones: () =>
    Promise.resolve([
      {
        id: "i1",
        claseId: "c1",
        claseFechaHora: "2026-10-01T12:00:00Z",
        claseEstado: "Finalizada",
        actividadId: "a1",
        actividadNombre: "Yoga al amanecer",
        alumnoId: "al-1",
        estado: "Inscripto",
        createdAt: "2026-09-25T12:00:00Z",
      },
    ]),
  listarMisDenuncias: () => Promise.resolve([]),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => AUTH,
  passwordStrength: () => ({ ok: true, label: "Fuerte", color: "#0C8576" }),
}));
vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/Avatar", () => ({ default: () => null }));
vi.mock("../../components/CambiarEmailCard", () => ({ default: () => null }));

function montar() {
  return render(
    <MemoryRouter>
      <AlumnoPerfil />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  AUTH.actualizarMiCondicionSalud.mockClear();
});

describe("perfil del alumno", () => {
  it("ya no muestra el historial de actividades", async () => {
    montar();
    expect(await screen.findByText("Información de salud")).toBeInTheDocument();
    expect(screen.queryByText("Historial de actividades")).not.toBeInTheDocument();
    expect(screen.queryByText("Yoga al amanecer")).not.toBeInTheDocument();
  });
});

describe("información de salud", () => {
  it("muestra lo informado y aclara quién la usa", () => {
    montar();
    expect(screen.getByText("Asma")).toBeInTheDocument();
    expect(screen.getByText(/No la ven los instructores ni otros alumnos/)).toBeInTheDocument();
  });

  it("se edita y se guarda", async () => {
    montar();
    const usuario = userEvent.setup();
    const tarjeta = screen.getByText("Información de salud").parentElement!.parentElement!;

    await usuario.click(within(tarjeta).getByRole("button", { name: "Editar" }));
    const campo = screen.getByLabelText("¿Padecés alguna enfermedad o lesión?");
    await usuario.clear(campo);
    await usuario.type(campo, "  Lesión de rodilla  ");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(AUTH.actualizarMiCondicionSalud).toHaveBeenCalledWith("Lesión de rodilla");
    expect(await screen.findByText("Información de salud actualizada.")).toBeInTheDocument();
  });
});
