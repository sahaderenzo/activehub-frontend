import { describe, expect, it, onTestFinished, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlumnoExplorar from "./Explorar";
import type { Actividad } from "../../lib/types";

/**
 * Explorar del alumno. Reportado: elegir una fecha o una franja horaria no cambiaba los
 * resultados hasta tocar otro filtro (faltaban en las dependencias del useMemo de la lista), y
 * "Limpiar" no borraba ni la fecha ni el horario.
 */

/** ISO de una fecha y hora LOCALES: la pantalla compara contra el día y la hora locales. */
const local = (anio: number, mes: number, dia: number, hora: number) => new Date(anio, mes - 1, dia, hora).toISOString();

function actividad(id: string, nombre: string, fechaHora: string): Actividad {
  return {
    id,
    nombre,
    descripcion: "",
    tipoActividadId: "t1",
    nivelIntensidadId: "n1",
    nivelIntensidad: "Moderada",
    instructorId: "i1",
    precio: 1000,
    ubicacion: "Mendoza",
    photoTint: "#eee",
    rating: 0,
    duracionMin: 60,
    proximaClase: { fechaHora, estado: "Habilitada", cuposMax: 10, cuposOcupados: 0 },
  };
}

const ACTIVIDADES = [
  actividad("a1", "Yoga matutino", local(2026, 11, 3, 9)),
  actividad("a2", "Natación nocturna", local(2026, 11, 5, 20)),
];

// Un único objeto, con funciones y colecciones ESTABLES entre renders, como las del DataContext
// real (useCallback / useMemo). Si el mock devolviera funciones nuevas en cada render, las
// dependencias del useMemo cambiarían siempre y esta prueba no detectaría el bug.
const DATA = vi.hoisted(() => {
  const tipo = { id: "t1", nombre: "Yoga", categoriaId: "c1" };
  const categoria = { id: "c1", nombre: "Bienestar" };
  return {
    actividades: [] as unknown[],
    tiposActividad: [tipo],
    categorias: [categoria],
    nivelesIntensidad: [],
    getTipoActividad: () => tipo,
    getCategoria: () => categoria,
    instructorNombre: { i1: "Carla Nuñez" },
    cargandoCatalogo: false,
    registrarInteraccion: () => Promise.resolve(),
  };
});
DATA.actividades = ACTIVIDADES;

vi.mock("../../context/DataContext", () => ({ useData: () => DATA }));
vi.mock("../../components/AlumnoNav", () => ({ default: () => null }));
vi.mock("../../components/ActivityCard", () => ({
  default: ({ name }: { name: string }) => <div data-testid="tarjeta">{name}</div>,
}));

function montar() {
  return render(
    <MemoryRouter>
      <AlumnoExplorar />
    </MemoryRouter>,
  );
}

const visibles = () => screen.queryAllByTestId("tarjeta").map((t) => t.textContent);
const campoFecha = () => document.querySelector('input[type="date"]') as HTMLInputElement;

describe("filtro de disponibilidad", () => {
  /**
   * Retirado a pedido del usuario (2026-10-23): "Solo con cupos" filtraba actividades mirando
   * sólo su próxima clase, así que una actividad sin clases pasaba como disponible y una con la
   * próxima clase llena quedaba afuera aunque tuviera otras con lugar.
   */
  it("no se ofrece 'Solo con cupos'", () => {
    montar();
    expect(screen.queryByText("Solo con cupos")).not.toBeInTheDocument();
    expect(screen.queryByText("Disponibilidad")).not.toBeInTheDocument();
  });
});

describe("filtros de fecha y horario", () => {
  it("elegir una franja horaria filtra en el momento", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(visibles()).toEqual(["Yoga matutino", "Natación nocturna"]);

    await usuario.click(screen.getByText("Noche"));

    expect(visibles()).toEqual(["Natación nocturna"]);
  });

  it("elegir una fecha filtra en el momento", () => {
    montar();

    fireEvent.change(campoFecha(), { target: { value: "2026-11-03" } });

    expect(visibles()).toEqual(["Yoga matutino"]);
  });

  it("'Limpiar' borra también la fecha y el horario", async () => {
    montar();
    const usuario = userEvent.setup();
    fireEvent.change(campoFecha(), { target: { value: "2026-11-03" } });
    await usuario.click(screen.getByText("Noche"));
    expect(visibles()).toEqual([]);

    await usuario.click(screen.getByText("Limpiar"));

    expect(visibles()).toEqual(["Yoga matutino", "Natación nocturna"]);
    expect(campoFecha().value).toBe("");
  });
});

describe("paginación", () => {
  function conCatalogo(cantidad: number) {
    const original = DATA.actividades;
    onTestFinished(() => {
      DATA.actividades = original;
    });
    DATA.actividades = Array.from({ length: cantidad }, (_, i) =>
      actividad(`x${i}`, `Actividad ${String(i + 1).padStart(2, "0")}`, local(2026, 11, 3, 9)),
    );
  }

  it("muestra 12 por página", async () => {
    conCatalogo(14);
    montar();
    const usuario = userEvent.setup();
    expect(visibles()).toHaveLength(12);

    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(visibles()).toEqual(["Actividad 13", "Actividad 14"]);
  });

  it("un filtro nuevo vuelve a la página 1", async () => {
    conCatalogo(14);
    montar();
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));

    await usuario.type(screen.getByPlaceholderText("Buscar por actividad o instructor…"), "Actividad 0");

    // Coinciden "Actividad 01" a "Actividad 09": entran en la primera página.
    expect(visibles()).toHaveLength(9);
    expect(visibles()[0]).toBe("Actividad 01");
  });
});
