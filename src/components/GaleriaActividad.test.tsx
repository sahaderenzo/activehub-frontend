import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GaleriaActividad from "./GaleriaActividad";
import type { FotoGaleria } from "../lib/galeria";

/** Carrusel del detalle de una actividad (2026-10-25). */

const FOTOS: FotoGaleria[] = [
  { clave: "f1", src: "/f1.jpg" },
  { clave: "f2", src: "/f2.jpg" },
  { clave: "f3", src: "/f3.jpg" },
];

const principal = () => screen.getByRole("region", { name: "Fotos de Yoga" }).querySelector("img") as HTMLImageElement | null;

function montar(fotos = FOTOS) {
  return render(<GaleriaActividad fotos={fotos} nombre="Yoga" tinte="#eee" />);
}

describe("GaleriaActividad", () => {
  it("las flechas recorren las fotos en círculo y el contador lo acompaña", async () => {
    montar();
    const usuario = userEvent.setup();
    expect(principal()?.getAttribute("src")).toBe("/f1.jpg");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Foto siguiente" }));
    expect(principal()?.getAttribute("src")).toBe("/f2.jpg");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Foto anterior" }));
    await usuario.click(screen.getByRole("button", { name: "Foto anterior" }));
    expect(principal()?.getAttribute("src")).toBe("/f3.jpg");
  });

  it("una miniatura elige la foto y queda marcada", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("button", { name: "Ver foto 3 de 3" }));

    expect(principal()?.getAttribute("src")).toBe("/f3.jpg");
    expect(screen.getByRole("button", { name: "Ver foto 3 de 3" })).toHaveAttribute("aria-current", "true");
  });

  it("con el teclado: flecha derecha e izquierda", () => {
    montar();
    const region = screen.getByRole("region", { name: "Fotos de Yoga" });

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(principal()?.getAttribute("src")).toBe("/f2.jpg");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(principal()?.getAttribute("src")).toBe("/f1.jpg");
  });

  it("deslizando con el dedo", () => {
    montar();
    const region = screen.getByRole("region", { name: "Fotos de Yoga" });

    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 200 }] });

    expect(principal()?.getAttribute("src")).toBe("/f2.jpg");
  });

  it("una foto que no carga desaparece en vez de quedar rota", () => {
    // Regresión: cambiar la portada borraba el archivo de una imagen de la galería y el alumno
    // veía una miniatura rota.
    montar();

    fireEvent.error(principal()!);

    expect(principal()?.getAttribute("src")).toBe("/f2.jpg");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver foto 3 de 3" })).not.toBeInTheDocument();
  });

  it("con una sola foto no hay flechas ni miniaturas, y sin fotos queda el fondo", () => {
    const { unmount } = montar([FOTOS[0]]);
    expect(screen.queryByRole("button", { name: "Foto siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    unmount();

    montar([]);
    expect(principal()).toBeNull();
    expect(screen.getByText("FOTO · Yoga")).toBeInTheDocument();
  });
});
