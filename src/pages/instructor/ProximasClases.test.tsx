import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InstructorProximasClases from "./ProximasClases";
import type { MiClaseInstructor } from "../../context/DataContext";
import { formatFecha } from "../../lib/mockData";

/** Próximas clases del instructor: paginación de 10 y scroll propio (2026-10-25). */

/** A las `hora` de dentro de 10 días (LOCAL): todas el mismo día, para probar el encabezado. */
function enDiezDias(hora: number) {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

function clase(id: string, hora: number): MiClaseInstructor {
  return {
    claseId: id,
    actividadId: "a-yoga",
    actividadNombre: `Yoga ${String(hora).padStart(2, "0")} hs`,
    actividadUbicacion: "Mendoza",
    fechaHora: enDiezDias(hora),
    estado: "Habilitada",
    cuposMax: 10,
    cuposOcupados: 2,
    precio: 1000,
  };
}

// 12 clases del mismo día, de 8 a 19 hs: 10 en la primera página y 2 en la segunda.
const CLASES = Array.from({ length: 12 }, (_, i) => clase(`c${i}`, 8 + i));

const DATA = vi.hoisted(() => ({ listarMisClases: () => Promise.resolve([] as unknown[]) }));
DATA.listarMisClases = () => Promise.resolve(CLASES);
const AUTH = vi.hoisted(() => ({ currentUser: { id: "inst-1", perfilInstructor: { estadoVerificacion: "APROBADO" } } }));

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const nombres = () => within(screen.getByTestId("lista-proximas")).queryAllByText(/^Yoga \d\d hs$/).map((n) => n.textContent);

describe("próximas clases del instructor", () => {
  it("10 por página en orden cronológico, con scroll propio", async () => {
    render(
      <MemoryRouter>
        <InstructorProximasClases />
      </MemoryRouter>,
    );
    const usuario = userEvent.setup();
    await screen.findByTestId("lista-proximas");
    expect(nombres()).toHaveLength(10);
    expect(nombres()[0]).toBe("Yoga 08 hs");
    expect(screen.getByTestId("lista-proximas")).toHaveClass("ah-scroll");

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(nombres()).toEqual(["Yoga 18 hs", "Yoga 19 hs"]);
    // El día sigue en la página 2: su encabezado se repite arriba de las clases que quedan.
    expect(screen.getByText(formatFecha(CLASES[0].fechaHora))).toBeInTheDocument();
  });
});
