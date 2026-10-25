import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Carrusel from "./Carrusel";

/**
 * jsdom no calcula tamaños (scrollWidth y clientWidth valen 0), así que las medidas de la fila
 * se simulan y se dispara el evento de scroll, que es cuando el carrusel vuelve a medir.
 */
function simularMedidas(fila: HTMLElement, { ancho, contenido, scrollLeft }: { ancho: number; contenido: number; scrollLeft: number }) {
  Object.defineProperty(fila, "clientWidth", { configurable: true, value: ancho });
  Object.defineProperty(fila, "scrollWidth", { configurable: true, value: contenido });
  Object.defineProperty(fila, "scrollLeft", { configurable: true, writable: true, value: scrollLeft });
  fireEvent.scroll(fila);
}

function montar(cantidad: number) {
  render(
    <Carrusel etiqueta="Próximas clases">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i}>Tarjeta {i + 1}</div>
      ))}
    </Carrusel>,
  );
  return screen.getByRole("region", { name: "Próximas clases" });
}

describe("Carrusel", () => {
  it("muestra todas las tarjetas dentro de una fila con nombre", () => {
    const fila = montar(6);
    expect(fila.children).toHaveLength(6);
    expect(screen.getByText("Tarjeta 6")).toBeInTheDocument();
  });

  it("al principio sólo ofrece la flecha hacia adelante, y avanza de a una página", () => {
    const fila = montar(6);
    const scrollBy = vi.fn();
    fila.scrollBy = scrollBy;
    simularMedidas(fila, { ancho: 900, contenido: 1840, scrollLeft: 0 });

    expect(screen.queryByRole("button", { name: "Ver anteriores de Próximas clases" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver más de Próximas clases" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 900, behavior: "smooth" });
  });

  it("al final sólo ofrece la flecha hacia atrás", () => {
    const fila = montar(6);
    simularMedidas(fila, { ancho: 900, contenido: 1840, scrollLeft: 940 });

    expect(screen.getByRole("button", { name: "Ver anteriores de Próximas clases" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver más de Próximas clases" })).not.toBeInTheDocument();
  });

  it("si todo entra, no hay flechas", () => {
    const fila = montar(3);
    simularMedidas(fila, { ancho: 900, contenido: 900, scrollLeft: 0 });

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
