import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InstructorResenas from "./Resenas";
import type { ReseniaInstructor } from "../../context/DataContext";

/**
 * "Reseñas" del instructor. Reportado: después de que el administrador ocultó una reseña (al
 * resolver la denuncia), la pantalla seguía mostrando la misma calificación y la misma cantidad
 * de reseñas. Promediaba todas, también las ocultas; el backend y el detalle público de la
 * actividad ya las excluían.
 */
const listarResenasInstructor = vi.hoisted(() => vi.fn());

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    currentUser: { id: "inst-1", perfilInstructor: { estadoVerificacion: "APROBADO" } },
  }),
}));
vi.mock("../../context/DataContext", () => ({
  useData: () => ({
    listarResenasInstructor,
    actividades: [{ id: "a1", nombre: "Yoga", instructorId: "inst-1" }],
    cargandoCatalogo: false,
  }),
}));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function resenia(id: string, puntaje: number, oculta: boolean): ReseniaInstructor {
  return {
    id,
    claseId: "c1",
    claseFechaHora: "2026-10-10T18:00:00Z",
    actividadId: "a1",
    actividadNombre: "Yoga",
    alumno: { id: `al-${id}`, nombre: "Ana", apellido: "López" },
    puntaje,
    comentario: oculta ? "Comentario ofensivo" : "Muy buena clase",
    denunciada: false,
    oculta,
    createdAt: "2026-10-10T20:00:00Z",
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <InstructorResenas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listarResenasInstructor.mockReset();
});

describe("calificación y cantidad", () => {
  it("una reseña oculta no cuenta en el promedio ni en la cantidad, pero se sigue listando", async () => {
    listarResenasInstructor.mockResolvedValue([resenia("r1", 5, false), resenia("r2", 1, true)]);
    montar();

    // Sin la oculta, el promedio es 5.0 y no 3.0; la cantidad es 1 y no 2.
    expect(await screen.findByText("1 oculta, no cuenta en la calificación")).toBeInTheDocument();
    expect(screen.getAllByText("5.0").length).toBeGreaterThan(0);
    expect(screen.queryByText("3.0")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 reseñas").length).toBeGreaterThan(0);
    expect(screen.queryByText("2 reseñas")).not.toBeInTheDocument();
    // La reseña oculta sigue a la vista del instructor, con su etiqueta.
    expect(screen.getByText("Comentario ofensivo")).toBeInTheDocument();
    expect(screen.getByText("Oculta")).toBeInTheDocument();
  });

  it("sin reseñas ocultas no muestra el aviso", async () => {
    listarResenasInstructor.mockResolvedValue([resenia("r1", 4, false), resenia("r2", 2, false)]);
    montar();

    expect((await screen.findAllByText("3.0")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 reseñas").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no cuenta/)).not.toBeInTheDocument();
  });
});

describe("filtros de la lista (2026-10-25)", () => {
  // Una de cada estado, con puntajes y fechas distintos.
  function con(id: string, puntaje: number, dia: number, extra: Partial<ReseniaInstructor>): ReseniaInstructor {
    return { ...resenia(id, puntaje, false), comentario: `Comentario ${id}`, createdAt: `2026-10-${dia}T20:00:00Z`, ...extra };
  }
  const RESENIAS = [
    con("r1", 5, 10, { respuestaInstructor: "¡Gracias!" }),
    con("r2", 3, 12, { denunciada: true }),
    con("r3", 1, 14, {}),
    con("r4", 4, 16, { oculta: true }),
  ];
  const comentarios = () =>
    within(screen.getByTestId("lista-resenas"))
      .queryAllByText(/^Comentario r\d$/)
      .map((n) => n.textContent);

  it("filtra por estado y por calificación, con la cantidad de cada opción", async () => {
    listarResenasInstructor.mockResolvedValue(RESENIAS);
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Mostrando las 4 reseñas");

    // "Sin responder" incluye la denunciada: todavía no tiene respuesta. Las ocultas no.
    await usuario.click(screen.getByText("Sin responder"));
    expect(comentarios()).toEqual(["Comentario r3", "Comentario r2"]);
    expect(screen.getByText("Mostrando 2 de 4 reseñas")).toBeInTheDocument();

    await usuario.click(screen.getByText("Denunciadas"));
    expect(comentarios()).toEqual(["Comentario r2"]);

    await usuario.click(screen.getByText("Limpiar filtros"));
    await usuario.click(screen.getByRole("button", { name: "5 estrellas (1)" }));
    expect(comentarios()).toEqual(["Comentario r1"]);

    await usuario.click(screen.getByRole("button", { name: "2 estrellas (0)" }));
    expect(screen.getByText("Ninguna reseña de esta actividad coincide con los filtros.")).toBeInTheDocument();
  });

  it("ordena por fecha o por calificación", async () => {
    listarResenasInstructor.mockResolvedValue(RESENIAS);
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Mostrando las 4 reseñas");
    expect(comentarios()).toEqual(["Comentario r4", "Comentario r3", "Comentario r2", "Comentario r1"]);

    await usuario.selectOptions(screen.getByRole("combobox"), "Peor calificación");
    expect(comentarios()).toEqual(["Comentario r3", "Comentario r2", "Comentario r4", "Comentario r1"]);

    await usuario.selectOptions(screen.getByRole("combobox"), "Más antiguas");
    expect(comentarios()[0]).toBe("Comentario r1");
  });
});
