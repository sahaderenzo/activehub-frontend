import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoMisResenas from "./MisResenas";
import type { MiInscripcion, MiResenia } from "../../context/DataContext";

/**
 * "Mis reseñas" del alumno. Cambio de regla (V33 del backend): una reseña se publica en el
 * momento en que se envía y después no se edita ni se elimina — sólo el instructor la responde
 * o la denuncia, y el administrador la puede ocultar. La pantalla ofrecía "Editar" y "Eliminar"
 * en cada reseña y le decía al alumno que la suya estaba "En moderación".
 */
const listarMisInscripciones = vi.hoisted(() => vi.fn());
const listarMisResenas = vi.hoisted(() => vi.fn());
const crearResenia = vi.hoisted(() => vi.fn());

vi.mock("../../context/DataContext", () => ({
  useData: () => ({
    listarMisInscripciones,
    listarMisResenas,
    crearResenia,
    actividades: [],
    instructorNombre: {},
  }),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ puede: () => true }),
}));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));

function resenia(over: Partial<MiResenia> = {}): MiResenia {
  return {
    id: "r1",
    claseId: "c1",
    claseFechaHora: "2026-10-10T18:00:00Z",
    actividadId: "a1",
    actividadNombre: "Yoga",
    instructorNombre: "Carla Nuñez",
    puntaje: 4,
    comentario: "Muy buena clase",
    oculta: false,
    respuestaInstructor: null,
    respuestaInstructorAt: null,
    createdAt: "2026-10-10T20:00:00Z",
    ...over,
  };
}

function inscripcionFinalizada(): MiInscripcion {
  return {
    claseId: "c2",
    claseEstado: "Finalizada",
    actividadId: "a2",
    actividadNombre: "Natación",
    claseFechaHora: "2026-10-12T18:00:00Z",
  } as MiInscripcion;
}

function montar() {
  return render(
    <MemoryRouter>
      <AlumnoMisResenas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listarMisInscripciones.mockReset().mockResolvedValue([]);
  listarMisResenas.mockReset().mockResolvedValue([]);
  crearResenia.mockReset().mockResolvedValue(undefined);
});

describe("una reseña publicada no se toca", () => {
  it("no ofrece Editar ni Eliminar, ni dice que está en moderación", async () => {
    listarMisResenas.mockResolvedValue([resenia()]);
    montar();

    expect(await screen.findByText("Muy buena clase")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/moderación/)).not.toBeInTheDocument();
  });

  it("marca la reseña que ocultó un administrador", async () => {
    listarMisResenas.mockResolvedValue([resenia({ oculta: true })]);
    montar();

    expect(await screen.findByText("Oculta por un administrador")).toBeInTheDocument();
  });
});

describe("dejar una reseña", () => {
  it("avisa antes de publicar que después no se puede cambiar, y la publica", async () => {
    listarMisInscripciones.mockResolvedValue([inscripcionFinalizada()]);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole("button", { name: "Dejar reseña" }));

    expect(
      screen.getByText("La reseña se publica en el momento y después no se puede editar ni eliminar."),
    ).toBeInTheDocument();

    await usuario.type(screen.getByPlaceholderText(/Tu comentario/), "  Excelente  ");
    await usuario.click(screen.getByRole("button", { name: "Publicar" }));

    expect(crearResenia).toHaveBeenCalledWith("c2", 5, "Excelente");
  });
});
