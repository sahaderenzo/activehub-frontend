import { describe, expect, it, onTestFinished, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoFavoritos from "./Favoritos";
import type { Actividad } from "../../lib/types";

/** "Mis actividades favoritas": paginación de 12 y filtros (2026-10-24). */

function actividad(id: string, nombre: string, over: Partial<Actividad> = {}): Actividad {
  return {
    id,
    nombre,
    descripcion: "",
    tipoActividadId: "t-yoga",
    nivelIntensidadId: "n1",
    nivelIntensidad: "Física baja",
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
  const data = {
    actividades: [] as Actividad[],
    favoritos: [] as string[],
    listarMisFavoritos: () => Promise.resolve(data.favoritos),
    quitarFavorito: () => Promise.resolve(),
    getTipoActividad: (id: string) => tipos[id],
    getCategoria: (id: string) => categorias[id],
    instructorNombre: { i1: "Sofía Ruiz", i2: "Matías Ferrer" } as Record<string, string>,
    cargandoCatalogo: false,
  };
  return data;
});

// 13 de Bienestar (Sofía) y 1 de Acuáticas (Matías): 14 favoritas, más de una página de 12.
DATA.actividades = [
  ...Array.from({ length: 13 }, (_, i) => actividad(`y${i}`, `Yoga ${String(i + 1).padStart(2, "0")}`)),
  actividad("n1", "Natación para adultos", { tipoActividadId: "t-nat", nivelIntensidad: "Física alta", instructorId: "i2" }),
];
DATA.favoritos = DATA.actividades.map((a) => a.id);

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
// También estable: `cargar` depende de `currentUser`, y un objeto nuevo por render recargaría
// los favoritos en cada render (y un favorito quitado volvería a aparecer).
const AUTH = vi.hoisted(() => ({ currentUser: { id: "al-1" } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/ActivityCard", () => ({
  default: ({ name }: { name: string }) => <div data-testid="tarjeta">{name}</div>,
}));

function montar() {
  return render(
    <MemoryRouter>
      <AlumnoFavoritos />
    </MemoryRouter>,
  );
}

const tarjetas = () => screen.queryAllByTestId("tarjeta").map((t) => t.textContent);

describe("favoritos", () => {
  it("muestra 12 por página, ordenadas por nombre", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación para adultos");
    expect(tarjetas()).toHaveLength(12);
    expect(tarjetas()[0]).toBe("Natación para adultos");

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(tarjetas()).toEqual(["Yoga 12", "Yoga 13"]);
  });

  it("busca por instructor sin tildes e informa cuántas coinciden", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación para adultos");

    await usuario.type(screen.getByPlaceholderText("Buscar por actividad o instructor…"), "matias");

    expect(tarjetas()).toEqual(["Natación para adultos"]);
    expect(screen.getByText("de 14", { exact: false })).toBeInTheDocument();

    await usuario.click(screen.getByText("Limpiar filtros"));
    expect(tarjetas()).toHaveLength(12);
  });

  it("filtra por categoría y por nivel", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación para adultos");

    await usuario.click(screen.getByText("Acuáticas"));
    expect(tarjetas()).toEqual(["Natación para adultos"]);

    await usuario.click(screen.getByText("Todas"));
    await usuario.click(screen.getByText("Física baja"));
    expect(tarjetas()).not.toContain("Natación para adultos");
  });

  it("sin coincidencias lo dice", async () => {
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación para adultos");

    await usuario.type(screen.getByPlaceholderText("Buscar por actividad o instructor…"), "pilates");

    expect(screen.getByText("Ninguna de tus favoritas coincide con la búsqueda.")).toBeInTheDocument();
  });

  it("quitar un favorito no vuelve a la página 1", async () => {
    // 14 + 1: la página 2 queda con 3, y al quitar una siguen quedando 2.
    const original = DATA.favoritos;
    DATA.actividades = [...DATA.actividades, actividad("y99", "Yoga 99")];
    DATA.favoritos = DATA.actividades.map((a) => a.id);
    onTestFinished(() => {
      DATA.actividades = DATA.actividades.filter((a) => a.id !== "y99");
      DATA.favoritos = original;
    });
    montar();
    const usuario = userEvent.setup();
    await screen.findByText("Natación para adultos");
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(tarjetas()).toEqual(["Yoga 12", "Yoga 13", "Yoga 99"]);

    await usuario.click(screen.getAllByRole("button", { name: "Quitar de favoritos" })[0]);

    expect(tarjetas()).toEqual(["Yoga 13", "Yoga 99"]);
  });
});
