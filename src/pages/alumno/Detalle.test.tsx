import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AlumnoDetalle from "./Detalle";
import type { Actividad } from "../../lib/types";
import type { ReseniaActividad } from "../../context/DataContext";

/** Detalle de una actividad (alumno). */

const ACTIVIDAD: Actividad = {
  id: "a1",
  nombre: "Trekking al Aconcagua",
  descripcion: "Caminata de montaña.",
  tipoActividadId: "t1",
  nivelIntensidadId: "n1",
  nivelIntensidad: "Física alta",
  instructorId: "inst-1",
  precio: 5000,
  ubicacion: "Mendoza",
  photoTint: "#eee",
  rating: 0,
  duracionMin: 120,
};

/** 7 opiniones: más de las 5 que se mostraban antes. Puntajes 5,4,3,2,1,5,1; días 1 a 7. */
const OPINIONES: ReseniaActividad[] = [5, 4, 3, 2, 1, 5, 1].map((puntaje, i) => ({
  id: `r${i + 1}`,
  claseId: "c1",
  alumno: { id: `al${i + 1}`, nombre: `Alumno${i + 1}`, apellido: "Test" },
  puntaje,
  comentario: `Comentario ${i + 1}`,
  createdAt: `2026-10-0${i + 1}T12:00:00Z`,
  respuestaInstructor: null,
  respuestaInstructorAt: null,
}));

// Valores estables entre renders, como los del DataContext real.
const DATA = vi.hoisted(() => ({
  actividades: [] as unknown[],
  clases: [],
  listarMisFavoritos: () => Promise.resolve([]),
  agregarFavorito: () => Promise.resolve(),
  quitarFavorito: () => Promise.resolve(),
  getTipoActividad: () => ({ id: "t1", nombre: "Trekking", categoriaId: "c1" }),
  getCategoria: () => ({ id: "c1", nombre: "Aventura" }),
  instructorNombre: { "inst-1": "Sofía Ruiz" } as Record<string, string>,
  cargarDetalleActividad: () => Promise.resolve(),
  listarMisInscripciones: () => Promise.resolve([]),
  listarResenasActividad: () => Promise.resolve([] as unknown[]),
  cargandoCatalogo: false,
  registrarInteraccion: () => Promise.resolve(),
  generarInformeActividad: () => Promise.reject(new Error("sin IA")),
}));
DATA.actividades = [ACTIVIDAD];
DATA.listarResenasActividad = () => Promise.resolve(OPINIONES);

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ currentUser: { id: "al-1", nombre: "Ana", perfilAlumno: { intereses: [] } }, puede: () => true }),
}));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/LeafletMap", () => ({ default: () => null }));
vi.mock("../../components/Avatar", () => ({ default: () => null }));

async function montar() {
  render(
    <MemoryRouter initialEntries={["/alumno/actividad/a1"]}>
      <Routes>
        <Route path="/alumno/actividad/:id" element={<AlumnoDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Trekking al Aconcagua" });
}

describe("detalle de la actividad", () => {
  it("'Ver perfil' lleva al perfil público del instructor", async () => {
    await montar();
    expect(screen.getByRole("link", { name: "Ver perfil" })).toHaveAttribute("href", "/alumno/instructor/inst-1");
  });

  /**
   * Retirada el 2026-10-24: eran tres preguntas fijas, iguales para toda actividad, con
   * respuestas que contradecían al sistema (p. ej. "¿Necesito experiencia previa? No" en una
   * actividad de exigencia alta, como la de esta prueba).
   */
  it("no muestra la sección fija de preguntas frecuentes", async () => {
    await montar();
    expect(screen.queryByText("Preguntas frecuentes")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Necesito experiencia previa?")).not.toBeInTheDocument();
  });
});

describe("opiniones de alumnos", () => {
  const comentarios = () =>
    within(screen.getByTestId("lista-opiniones"))
      .queryAllByText(/^Comentario \d$/)
      .map((n) => n.textContent);

  it("muestra todas en una lista con scroll propio, la más reciente primero", async () => {
    await montar();
    await screen.findByText("Comentario 7");

    expect(comentarios()).toEqual([7, 6, 5, 4, 3, 2, 1].map((n) => `Comentario ${n}`));
    const lista = screen.getByTestId("lista-opiniones");
    expect(lista.style.overflowY).toBe("auto");
    expect(lista.style.maxHeight).toBe("620px");
  });

  it("filtra por estrellas e informa cuántas se muestran", async () => {
    await montar();
    const usuario = userEvent.setup();
    await screen.findByText("Comentario 7");

    await usuario.click(screen.getByRole("button", { name: "1 estrella (2)" }));

    expect(comentarios()).toEqual(["Comentario 7", "Comentario 5"]);
    expect(screen.getByText("Mostrando 2 de 7 opiniones")).toBeInTheDocument();

    await usuario.click(screen.getByText("Todas"));
    expect(comentarios()).toHaveLength(7);
  });

  it("ordena por las más antiguas y por calificación", async () => {
    await montar();
    const usuario = userEvent.setup();
    await screen.findByText("Comentario 7");
    const orden = screen.getByRole("combobox");

    await usuario.selectOptions(orden, "Más antiguas");
    expect(comentarios()[0]).toBe("Comentario 1");

    await usuario.selectOptions(orden, "Peor calificación");
    expect(comentarios().slice(0, 2)).toEqual(["Comentario 7", "Comentario 5"]);
  });
});
