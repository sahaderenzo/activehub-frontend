import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminGestion from "./Gestion";
import type { Actividad } from "../../lib/types";

/**
 * Gestión › Actividades (2026-10-26): sin el botón "Editar" (estaba deshabilitado, "Próximamente",
 * y la actividad es del instructor), con paginación de 10, scroll propio y filtros.
 */

function actividad(id: string, nombre: string, tipo: "t1" | "t2"): Actividad {
  return {
    id,
    nombre,
    descripcion: "",
    tipoActividadId: tipo,
    nivelIntensidadId: "n1",
    nivelIntensidad: tipo === "t1" ? "Física baja" : "Física alta",
    instructorId: "i1",
    precio: id === "n1" ? 9000 : 1000,
    ubicacion: "Mendoza",
    photoTint: "#eee",
    rating: 0,
    duracionMin: 60,
  };
}

// 11 de Yoga (Bienestar) y 1 de Natación (Acuáticas): 12, más de una página de 10.
const DATA = vi.hoisted(() => {
  const tipos: Record<string, { id: string; nombre: string; categoriaId: string }> = {
    t1: { id: "t1", nombre: "Yoga", categoriaId: "c1" },
    t2: { id: "t2", nombre: "Natación", categoriaId: "c2" },
  };
  const categorias: Record<string, { id: string; nombre: string }> = {
    c1: { id: "c1", nombre: "Bienestar" },
    c2: { id: "c2", nombre: "Acuáticas" },
  };
  return {
    actividades: [] as unknown[],
    eliminarActividad: () => Promise.resolve(),
    instructorNombre: { i1: "Sofía Ruiz" },
    getTipoActividad: (id: string) => tipos[id],
    getCategoria: (id: string) => categorias[id],
    cargandoCatalogo: false,
  };
});
DATA.actividades = [
  ...Array.from({ length: 11 }, (_, i) => actividad(`y${i}`, `Yoga ${String(i + 1).padStart(2, "0")}`, "t1")),
  actividad("n1", "Pileta libre", "t2"),
];
const AUTH = vi.hoisted(() => ({ currentUser: { id: "admin-1" }, puede: () => true }));

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("../../components/DashLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={["/admin/gestion/actividades"]}>
      <Routes>
        <Route path="/admin/gestion/:tab" element={<AdminGestion />} />
      </Routes>
    </MemoryRouter>,
  );
}

const filas = () => screen.queryAllByRole("button", { name: "Quitar" });

describe("Gestión › Actividades", () => {
  it("no ofrece 'Editar'", () => {
    montar();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("10 por página, en una lista con scroll propio", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(filas()).toHaveLength(10);
    expect(screen.getByTestId("lista-gestion")).toHaveClass("ah-scroll");

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(filas()).toHaveLength(2);
  });

  it("filtra por categoría y por texto, con el contador y 'Limpiar filtros'", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(screen.getByText("12 en total")).toBeInTheDocument();

    await usuario.selectOptions(screen.getByRole("combobox", { name: "Categoría" }), "c2");
    expect(filas()).toHaveLength(1);
    expect(screen.getByText("Pileta libre")).toBeInTheDocument();
    expect(screen.getByText("1 de 12")).toBeInTheDocument();

    await usuario.click(screen.getByText("Limpiar filtros"));
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar actividades" }), "yoga 1");
    expect(filas()).toHaveLength(2); // Yoga 10 y Yoga 11
  });

  it("ordena por nombre por defecto y por precio, sin que 'Limpiar filtros' cambie el orden", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(screen.getAllByText(/^(Yoga \d\d|Pileta libre)$/)[0]).toHaveTextContent("Pileta libre");

    await usuario.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "precioMenor");
    expect(screen.getAllByText(/^(Yoga \d\d|Pileta libre)$/)[0]).toHaveTextContent("Yoga 01");

    await usuario.selectOptions(screen.getByRole("combobox", { name: "Nivel" }), "Física baja");
    await usuario.click(screen.getByText("Limpiar filtros"));
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("precioMenor");
  });
});
