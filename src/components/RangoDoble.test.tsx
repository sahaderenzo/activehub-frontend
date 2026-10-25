import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RangoDoble from "./RangoDoble";

function montar(desde: number, hasta: number, onChange = vi.fn()) {
  render(
    <RangoDoble
      min={0}
      max={30}
      desde={desde}
      hasta={hasta}
      onChange={onChange}
      formato={(n) => `${n} km`}
      etiquetaDesde="Distancia mínima"
      etiquetaHasta="Distancia máxima"
    />,
  );
  return onChange;
}

describe("RangoDoble", () => {
  it("muestra el rango elegido como 'De … hasta …'", () => {
    montar(3, 12);
    expect(screen.getByText("De 3 km hasta 12 km")).toBeInTheDocument();
  });

  it("cada manija es un control propio, con su nombre", () => {
    const onChange = montar(3, 12);

    fireEvent.change(screen.getByRole("slider", { name: "Distancia mínima" }), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith(5, 12);

    fireEvent.change(screen.getByRole("slider", { name: "Distancia máxima" }), { target: { value: "20" } });
    expect(onChange).toHaveBeenLastCalledWith(3, 20);
  });

  it("las manijas no se cruzan", () => {
    const onChange = montar(3, 12);

    fireEvent.change(screen.getByRole("slider", { name: "Distancia mínima" }), { target: { value: "25" } });
    expect(onChange).toHaveBeenLastCalledWith(12, 12);

    fireEvent.change(screen.getByRole("slider", { name: "Distancia máxima" }), { target: { value: "1" } });
    expect(onChange).toHaveBeenLastCalledWith(3, 3);
  });
});
