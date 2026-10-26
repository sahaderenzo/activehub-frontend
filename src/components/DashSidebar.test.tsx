import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DashSidebar from "./DashSidebar";

/**
 * Panel lateral del instructor y del administrador. Reportado (2026-10-25): tocar el logo de
 * ActiveHub llevaba a la landing pública. El logo es identidad: no hace nada.
 */

const AUTH = vi.hoisted(() => ({
  currentUser: { id: "inst-1", nombre: "Sofía", apellido: "Ruiz" },
  logout: () => {},
  permisos: ["actividades.gestionar"],
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("./NotificationBell", () => ({ default: () => null }));
vi.mock("./Avatar", () => ({ default: () => null }));

describe("DashSidebar", () => {
  it("tocar el logo no navega", async () => {
    render(
      <MemoryRouter initialEntries={["/instructor/perfil"]}>
        <Routes>
          <Route path="/instructor/perfil" element={<DashSidebar role="instructor" active="perfilInstructor" />} />
          <Route path="/" element={<div>Landing pública</div>} />
        </Routes>
      </MemoryRouter>,
    );
    const usuario = userEvent.setup();

    await usuario.click(screen.getByText("ActiveHub"));

    expect(screen.queryByText("Landing pública")).not.toBeInTheDocument();
    expect(screen.getByTestId("logo-panel")).not.toHaveStyle({ cursor: "pointer" });
  });
});
