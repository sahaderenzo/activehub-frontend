import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AlumnoPerfilInstructor from "./PerfilInstructor";
import type { Actividad } from "../../lib/types";

/**
 * Perfil público del instructor. "Ver perfil" del detalle de la actividad era un botón sin
 * acción; ahora lleva acá. Se arma sólo con el catálogo público que ya tiene el frontend.
 */

const futura = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString();

function actividad(id: string, nombre: string, over: Partial<Actividad> = {}): Actividad {
  return {
    id,
    nombre,
    descripcion: "",
    tipoActividadId: "t-yoga",
    nivelIntensidadId: "n1",
    nivelIntensidad: "Moderada",
    instructorId: "i1",
    precio: 1000,
    ubicacion: "Mendoza",
    photoTint: "#eee",
    rating: 0,
    duracionMin: 60,
    ...over,
  };
}

// Valores estables entre renders, como los del DataContext real.
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
    instructorNombre: { i1: "Carla Nuñez", i2: "Otro Instructor" } as Record<string, string>,
    getTipoActividad: (id: string) => tipos[id],
    getCategoria: (id: string) => categorias[id],
    cargandoCatalogo: false,
  };
});

// 10 de yoga + 1 de natación de Carla (11, más de una página de 9) y 1 de otro instructor.
DATA.actividades = [
  ...Array.from({ length: 10 }, (_, i) =>
    actividad(`y${i}`, `Yoga ${String(i + 1).padStart(2, "0")}`, {
      rating: i < 2 ? 4 : 0,
      proximaClase: { fechaHora: futura(i + 1), estado: "Habilitada", cuposMax: 10, cuposOcupados: 0 },
    }),
  ),
  actividad("n1", "Natación para adultos", { tipoActividadId: "t-nat", nivelIntensidad: "Alta", rating: 5 }),
  actividad("x1", "Actividad de otro", { instructorId: "i2" }),
];

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/Avatar", () => ({ default: () => null }));
vi.mock("../../components/ActivityCard", () => ({
  default: ({ name }: { name: string }) => <div data-testid="tarjeta">{name}</div>,
}));

function montar(instructorId = "i1") {
  return render(
    <MemoryRouter initialEntries={[`/alumno/instructor/${instructorId}`]}>
      <Routes>
        <Route path="/alumno/instructor/:id" element={<AlumnoPerfilInstructor />} />
      </Routes>
    </MemoryRouter>,
  );
}

const tarjetas = () => screen.queryAllByTestId("tarjeta").map((t) => t.textContent);

describe("datos del instructor", () => {
  it("muestra nombre, verificación, categorías y números calculados de sus actividades", () => {
    montar();

    expect(screen.getByRole("heading", { name: "Carla Nuñez" })).toBeInTheDocument();
    expect(screen.getByText("Instructor verificado")).toBeInTheDocument();
    expect(screen.getByText("Dicta:")).toBeInTheDocument();
    expect(screen.getAllByText("Bienestar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acuáticas").length).toBeGreaterThan(0);
    expect(screen.getByText("11")).toBeInTheDocument();
    // Promedio de las calificadas (4, 4 y 5), sin contar las que no tienen reseñas como 0.
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.queryByText("Actividad de otro")).not.toBeInTheDocument();
  });

  it("un instructor sin actividades publicadas no tiene perfil que mostrar", () => {
    montar("desconocido");
    expect(screen.getByText("Este instructor no tiene actividades publicadas en este momento.")).toBeInTheDocument();
  });
});

describe("sus actividades", () => {
  it("se paginan de a 9", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(tarjetas()).toHaveLength(9);

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(tarjetas()).toHaveLength(2);
  });

  it("el buscador ignora las tildes y 'Limpiar filtros' vuelve a mostrar todas", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.type(screen.getByPlaceholderText("Buscar entre sus actividades…"), "natacion");

    expect(tarjetas()).toEqual(["Natación para adultos"]);
    expect(screen.getByText("de 11", { exact: false })).toBeInTheDocument();

    await usuario.click(screen.getByText("Limpiar filtros"));
    expect(tarjetas()).toHaveLength(9);
  });

  it("filtra por categoría y por nivel", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getAllByText("Acuáticas").at(-1)!);
    expect(tarjetas()).toEqual(["Natación para adultos"]);

    await usuario.click(screen.getByText("Todas"));
    await usuario.click(screen.getByText("Moderada"));
    expect(tarjetas()).toHaveLength(9);
    expect(tarjetas()).not.toContain("Natación para adultos");
  });

  it("por defecto ordena por próxima clase, con las que no tienen clases al final", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(tarjetas()[0]).toBe("Yoga 01");

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(tarjetas()).toEqual(["Yoga 10", "Natación para adultos"]);
  });
});
