import { describe, expect, it, onTestFinished, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoHome from "./Home";
import type { Actividad } from "../../lib/types";

/**
 * Home del alumno. Los filtros rápidos eran siete; desde el 2026-10-24 quedan Categoría, Nivel
 * y Precio (decisión del usuario): "Tipo" se superponía con Categoría, "Ubicación" duplicaba
 * "Cerca tuyo · 5 km", y "Fecha" y "Horario" sólo miraban la próxima clase de cada actividad.
 */

function actividad(id: string, precio: number): Actividad {
  return {
    id,
    nombre: `Actividad ${id}`,
    descripcion: "",
    tipoActividadId: "t1",
    nivelIntensidadId: "n1",
    nivelIntensidad: "Física media",
    instructorId: "i1",
    precio,
    ubicacion: "Mendoza",
    photoTint: "#eee",
    rating: 0,
    duracionMin: 60,
  };
}

// Valores estables entre renders, como los del DataContext real.
const DATA = vi.hoisted(() => ({
  actividades: [] as unknown[],
  categorias: [{ id: "c1", nombre: "Bienestar" }],
  getTipoActividad: () => ({ id: "t1", nombre: "Yoga", categoriaId: "c1" }),
  getCategoria: () => ({ id: "c1", nombre: "Bienestar" }),
  instructorNombre: { i1: "Sofía Ruiz" },
  errorCatalogo: false,
  cargandoCatalogo: false,
  refrescarCatalogo: () => {},
  listarRecomendaciones: vi.fn(() => Promise.resolve({ recomendaciones: [], sinSenales: true })),
}));
DATA.actividades = [actividad("a1", 3_800), actividad("a2", 9_000), actividad("a3", 12_000)];

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ currentUser: { id: "al-1", nombre: "Ana" } }),
}));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/ActivityCard", () => ({ default: () => null }));

function montar() {
  return render(
    <MemoryRouter>
      <AlumnoHome />
    </MemoryRouter>,
  );
}

describe("filtros rápidos del Home", () => {
  it("quedan Categoría, Nivel y Precio", () => {
    montar();
    for (const filtro of ["Categoría", "Nivel", "Precio"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${filtro}`) })).toBeInTheDocument();
    }
    for (const retirado of ["Tipo", "Ubicación", "Fecha", "Horario"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${retirado}`) })).not.toBeInTheDocument();
    }
  });

  it("Precio ofrece montos redondos", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("button", { name: /^Precio/ }));

    expect(screen.getByText("Hasta $5.000")).toBeInTheDocument();
    expect(screen.getByText("Hasta $10.000")).toBeInTheDocument();
  });
});

describe("secciones de actividades", () => {
  it("pide hasta 6 recomendaciones (antes 3): se ven 3 y el resto se desliza", () => {
    montar();
    expect(DATA.listarRecomendaciones).toHaveBeenCalledWith(null, 6);
  });

  it("'Próximas clases disponibles' es una fila deslizable con hasta 6 actividades", () => {
    const original = DATA.actividades;
    onTestFinished(() => {
      DATA.actividades = original;
    });
    DATA.actividades = Array.from({ length: 8 }, (_, i) => ({
      ...actividad(`p${i}`, 1_000 * (i + 1)),
      proximaClase: { fechaHora: `2026-11-0${i + 1}T12:00:00Z`, estado: "Habilitada", cuposMax: 10, cuposOcupados: 0 },
    }));
    montar();
    expect(screen.getByRole("region", { name: "Próximas clases disponibles" }).children).toHaveLength(6);
  });
});
