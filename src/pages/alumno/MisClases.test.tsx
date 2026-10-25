import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoMisClases from "./MisClases";
import type { MiInscripcion } from "../../context/DataContext";

/** "Mis clases" del alumno: filtros y paginación de 10 en todas las pestañas (2026-10-24). */

/** A las 10 de la mañana, `dias` días desde hoy (negativo = pasado), en hora local. */
function enDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(10, 0, 0, 0);
  return d;
}
const iso = (dias: number) => enDias(dias).toISOString();
const dia = (dias: number) => {
  const d = enDias(dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function fila(id: string, nombre: string, dias: number, over: Partial<MiInscripcion> = {}): MiInscripcion {
  return {
    id,
    claseId: `c-${id}`,
    claseFechaHora: iso(dias),
    claseEstado: dias < 0 ? "Finalizada" : "Habilitada",
    actividadId: `a-${id}`,
    actividadNombre: nombre,
    alumnoId: "al-1",
    estado: "Inscripto",
    createdAt: iso(-30),
    ...over,
  };
}

// 11 clases de Yoga ya finalizadas (Yoga 01 ayer … Yoga 11 hace 11 días) y dos futuras: 13
// en "Todas", más de una página de 10.
const FILAS: MiInscripcion[] = [
  ...Array.from({ length: 11 }, (_, i) => fila(`y${i + 1}`, `Yoga ${String(i + 1).padStart(2, "0")}`, -(i + 1))),
  fila("n1", "Natación", 10, { estado: "PreInscripción" }),
  fila("p1", "Pilates", 2),
];

// Valores estables entre renders, como los de los contextos reales.
const DATA = vi.hoisted(() => ({
  filas: [] as unknown[],
  getActividad: () => undefined,
  getTipoActividad: () => undefined,
  getCategoria: () => undefined,
  instructorNombre: {},
  cancelarInscripcion: () => Promise.resolve(),
  crearDenuncia: () => Promise.resolve(),
  listarMisInscripciones: () => Promise.resolve([] as unknown[]),
  listarMisDenuncias: () => Promise.resolve([]),
}));
DATA.filas = FILAS;
DATA.listarMisInscripciones = () => Promise.resolve(DATA.filas);
const AUTH = vi.hoisted(() => ({ currentUser: { id: "al-1" }, puede: () => true }));

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));

function montar(ruta = "/alumno/misclases") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AlumnoMisClases />
    </MemoryRouter>,
  );
}

const NOMBRE = /^(Yoga \d\d|Natación|Pilates)$/;
const filasVisibles = () => screen.queryAllByText(NOMBRE).map((n) => n.textContent);
const contador = (pestania: string) => screen.getByText(pestania).textContent?.replace(pestania, "");

describe("mis clases", () => {
  it("muestra 10 por página, más recientes primero", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación");
    expect(filasVisibles()).toHaveLength(10);
    expect(filasVisibles()[0]).toBe("Natación");

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(filasVisibles()).toEqual(["Yoga 09", "Yoga 10", "Yoga 11"]);
  });

  it("la búsqueda filtra sin tildes y los contadores de las pestañas la siguen", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación");
    expect(contador("Todas")).toBe("13");

    await usuario.type(screen.getByPlaceholderText("Buscar por actividad…"), "natacion");

    expect(filasVisibles()).toEqual(["Natación"]);
    expect(contador("Todas")).toBe("1");
    expect(contador("Finalizadas")).toBe("0");

    await usuario.click(screen.getByText("Finalizadas"));
    expect(screen.getByText("Ninguna clase de esta categoría coincide con los filtros.")).toBeInTheDocument();

    await usuario.click(screen.getByText("Limpiar filtros"));
    expect(filasVisibles()).toHaveLength(10);
  });

  it("Desde y Hasta filtran por el día de la clase", async () => {
    montar();
    await screen.findByText("Natación");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: dia(-3) } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: dia(-3) } });

    expect(filasVisibles()).toEqual(["Yoga 03"]);
  });

  it("'Próximas primero' pone las futuras de la más cercana a la más lejana y después las pasadas", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación");

    await usuario.selectOptions(screen.getByLabelText("Ordenar por"), "Próximas primero");

    expect(filasVisibles().slice(0, 3)).toEqual(["Pilates", "Natación", "Yoga 01"]);
  });

  it("desde una notificación arranca en la página que tiene la fila", async () => {
    // Yoga 11 es la más vieja: en "Más recientes primero" cae en la página 2.
    montar("/alumno/misclases?inscripcion=y11");

    expect(await screen.findByText("Yoga 11")).toBeInTheDocument();
    expect(filasVisibles()).toEqual(["Yoga 09", "Yoga 10", "Yoga 11"]);
  });
});
