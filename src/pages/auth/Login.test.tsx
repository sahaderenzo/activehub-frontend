import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";

/**
 * Panel izquierdo del Login con la ilustración de fondo (2026-10-25). La ilustración ya trae el
 * logo, así que el panel dejó de dibujar el suyo: el enlace al inicio es una zona invisible
 * encima del logo de la imagen, y tiene que seguir funcionando.
 */

const AUTH = vi.hoisted(() => ({ login: () => Promise.resolve(), ingresarConGoogle: () => Promise.resolve() }));
vi.mock("../../context/AuthContext", async (original) => ({
  ...(await original<typeof import("../../context/AuthContext")>()),
  useAuth: () => AUTH,
}));
vi.mock("../../components/BotonGoogle", () => ({ default: () => null }));

function montar() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Página de inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Login: panel con la ilustración", () => {
  it("mantiene los textos del panel", () => {
    montar();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Tu próxima clase está a un clic de distancia");
    expect(screen.getByText("Inscribite y pagá en pocos pasos")).toBeInTheDocument();
    expect(screen.getByText("Cupos y horarios en tiempo real")).toBeInTheDocument();
    expect(screen.getByText("Calificá y comentá tus actividades")).toBeInTheDocument();
  });

  it("el logo de la ilustración lleva al inicio", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("link", { name: "ActiveHub, ir al inicio" }));

    expect(screen.getByText("Página de inicio")).toBeInTheDocument();
  });
});
