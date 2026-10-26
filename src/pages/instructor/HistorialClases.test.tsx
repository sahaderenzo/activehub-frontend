import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InstructorHistorialClases from "./HistorialClases";
import type { MiClaseInstructor } from "../../context/DataContext";

/** Historial del instructor: paginación de 10, scroll propio y lupa por actividad o fecha (2026-10-25). */

function clase(id: string, nombre: string, dia: number, estado: "Finalizada" | "Cancelada" = "Finalizada"): MiClaseInstructor {
  return {
    claseId: id,
    actividadId: nombre === "Yoga" ? "a-yoga" : "a-nat",
    actividadNombre: nombre,
    actividadUbicacion: "Mendoza",
    // Septiembre de 2026, a las 10 de la mañana LOCAL: "dia" es el día del mes.
    fechaHora: new Date(2026, 8, dia, 10).toISOString(),
    estado,
    cuposMax: 10,
    cuposOcupados: 4,
    precio: 1000,
  };
}

// 11 de Yoga (días 1 a 11) y una de Natación cancelada (día 20): 12, más de una página de 10.
const CLASES = [...Array.from({ length: 11 }, (_, i) => clase(`y${i + 1}`, "Yoga", i + 1)), clase("n1", "Natación", 20, "Cancelada")];

// Valores estables entre renders, como los de los contextos reales.
const DATA = vi.hoisted(() => ({ listarMisClases: () => Promise.resolve([] as unknown[]) }));
DATA.listarMisClases = () => Promise.resolve(CLASES);
const AUTH = vi.hoisted(() => ({ currentUser: { id: "inst-1", perfilInstructor: { estadoVerificacion: "APROBADO" } } }));

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function montar() {
  return render(
    <MemoryRouter>
      <InstructorHistorialClases />
    </MemoryRouter>,
  );
}

const filas = () => screen.queryAllByTitle("Ver el detalle de la clase");
// Consultas por texto y por etiqueta, no `getByRole`: en jsdom recorre el árbol de accesibilidad
// entero en cada llamada y esta prueba rozaba el límite de 5 s.
const buscar = () => screen.getByLabelText("Buscar clases");

describe("historial del instructor", () => {
  it("muestra 10 por página, dentro de una lista con scroll propio", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Todas (12)");
    expect(filas()).toHaveLength(10);
    expect(screen.getByTestId("lista-historial")).toHaveClass("ah-scroll");

    await usuario.click(screen.getByText("Siguiente"));

    expect(filas()).toHaveLength(2);
  });

  it("la lupa busca por nombre de la actividad y los contadores la siguen", async () => {
    montar();
    await screen.findByText("Todas (12)");

    fireEvent.change(buscar(), { target: { value: "natacion" } });

    expect(filas()).toHaveLength(1);
    expect(screen.getByText("Todas (1)")).toBeInTheDocument();
    expect(screen.getByText("Canceladas (1)")).toBeInTheDocument();
  });

  it("la lupa busca por fecha", async () => {
    montar();
    await screen.findByText("Todas (12)");

    fireEvent.change(buscar(), { target: { value: "3/9/2026" } });

    expect(filas()).toHaveLength(1);
    expect(screen.getByText("Finalizadas (1)")).toBeInTheDocument();
  });

  it("buscar desde la página 2 vuelve a la 1, y la cruz limpia la búsqueda", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Todas (12)");
    await usuario.click(screen.getByText("Siguiente"));

    fireEvent.change(buscar(), { target: { value: "yoga" } });
    expect(filas()).toHaveLength(10);

    await usuario.click(screen.getByLabelText("Limpiar búsqueda"));
    expect(buscar()).toHaveValue("");
    expect(screen.getByText("Todas (12)")).toBeInTheDocument();
  });

  it("sin coincidencias lo dice", async () => {
    montar();
    await screen.findByText("Todas (12)");

    fireEvent.change(buscar(), { target: { value: "pilates" } });

    expect(screen.getByText("No hay clases con esos filtros.")).toBeInTheDocument();
  });
});
