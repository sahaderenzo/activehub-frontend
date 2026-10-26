import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InstructorMisActividades from "./MisActividades";
import type { Actividad } from "../../lib/types";

/** "Mis actividades" del instructor: 12 por página y búsqueda (2026-10-25). */

function actividad(id: string, nombre: string, over: Partial<Actividad> = {}): Actividad {
  return {
    id,
    nombre,
    descripcion: "",
    tipoActividadId: "t-yoga",
    nivelIntensidadId: "n1",
    nivelIntensidad: "Física baja",
    instructorId: "inst-1",
    precio: 1000,
    ubicacion: "Mendoza",
    photoTint: "#eee",
    rating: 0,
    duracionMin: 60,
    ...over,
  };
}

// 13 de Yoga (Bienestar) y una de Natación (Acuáticas), todas del instructor, más una ajena.
const ACTIVIDADES = [
  ...Array.from({ length: 13 }, (_, i) => actividad(`y${i}`, `Yoga ${String(i + 1).padStart(2, "0")}`)),
  actividad("n1", "Pileta libre", { tipoActividadId: "t-nat", nivelIntensidad: "Física alta" }),
  actividad("otra", "Actividad de otro instructor", { instructorId: "inst-2" }),
];

const DATA = vi.hoisted(() => {
  const tipos: Record<string, { id: string; nombre: string; categoriaId: string }> = {
    "t-yoga": { id: "t-yoga", nombre: "Yoga", categoriaId: "c-bien" },
    "t-nat": { id: "t-nat", nombre: "Natación", categoriaId: "c-agua" },
  };
  const categorias: Record<string, { id: string; nombre: string }> = {
    "c-bien": { id: "c-bien", nombre: "Bienestar" },
    "c-agua": { id: "c-agua", nombre: "Acuáticas" },
  };
  return {
    actividades: [] as unknown[],
    clases: [],
    cargandoCatalogo: false,
    getTipoActividad: (id: string) => tipos[id],
    getCategoria: (id: string) => categorias[id],
    cargarDetalleActividad: () => Promise.resolve(),
    eliminarActividad: () => Promise.resolve(),
  };
});
DATA.actividades = ACTIVIDADES;
const AUTH = vi.hoisted(() => ({ currentUser: { id: "inst-1", perfilInstructor: { estadoVerificacion: "APROBADO" } } }));

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/ActivityPhoto", () => ({ default: () => null }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function montar() {
  return render(
    <MemoryRouter>
      <InstructorMisActividades />
    </MemoryRouter>,
  );
}

const tarjetas = () => screen.queryAllByRole("button", { name: "Ver clases" });
const buscar = () => screen.getByRole("searchbox", { name: "Buscar actividades" });

describe("mis actividades", () => {
  it("muestra 12 por página, sólo las del instructor", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(await screen.findByText("14 actividades")).toBeInTheDocument();
    expect(tarjetas()).toHaveLength(12);

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(tarjetas()).toHaveLength(2);
    expect(screen.queryByText("Actividad de otro instructor")).not.toBeInTheDocument();
  });

  it("busca por nombre, categoría, tipo o nivel, sin tildes", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("14 actividades");

    await usuario.type(buscar(), "acuaticas");
    expect(tarjetas()).toHaveLength(1);
    expect(screen.getByText("Pileta libre")).toBeInTheDocument();
    expect(screen.getByText("1 de 14 actividades")).toBeInTheDocument();

    await usuario.clear(buscar());
    await usuario.type(buscar(), "fisica alta");
    expect(tarjetas()).toHaveLength(1);

    await usuario.clear(buscar());
    await usuario.type(buscar(), "Yoga 13");
    expect(tarjetas()).toHaveLength(1);
  });

  it("sin coincidencias lo dice", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("14 actividades");

    await usuario.type(buscar(), "boxeo");

    expect(screen.getByText("Ninguna de tus actividades coincide con la búsqueda.")).toBeInTheDocument();
  });
});
