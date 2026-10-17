import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NotificationBell from "./NotificationBell";

/**
 * Reportado: al abrir la campana sobre un gráfico, el gráfico quedaba por encima del menú. La
 * campana del instructor y del admin vive en `DashSidebar` (`position:sticky`), que encerraba el
 * z-index del menú. El arreglo es renderizarlo en un portal a `document.body`.
 */
const listarNotificaciones = vi.hoisted(() => vi.fn());
const marcarNotificacionesLeidas = vi.hoisted(() => vi.fn());

vi.mock("../context/DataContext", () => ({
  useData: () => ({ listarNotificaciones, marcarNotificacionesLeidas }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ permisos: [] }),
}));

beforeEach(() => {
  listarNotificaciones.mockReset().mockResolvedValue([
    { id: "n1", tipo: "CLASE_CANCELADA", mensaje: "Se canceló la clase de Yoga.", leida: false, createdAt: "2026-10-16T18:00:00Z", destinoTipo: "NINGUNO", destinoId: null },
  ]);
  marcarNotificacionesLeidas.mockReset().mockResolvedValue(undefined);
});

describe("desplegable de notificaciones", () => {
  it("se abre fuera del contenedor (portal a body), con position fixed y un z-index por encima de todo", async () => {
    const { container } = render(
      <MemoryRouter>
        <div style={{ position: "sticky" }} data-testid="sidebar">
          <NotificationBell area="instructor" variant="dark" align="left" />
        </div>
      </MemoryRouter>,
    );
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("button", { name: "Notificaciones" }));

    const menu = await screen.findByRole("dialog", { name: "Notificaciones" });
    expect(container.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe("fixed");
    expect(Number(menu.style.zIndex)).toBeGreaterThanOrEqual(1100);
    expect(await screen.findByText("Se canceló la clase de Yoga.")).toBeInTheDocument();
  });

  it("se cierra con Escape", async () => {
    render(
      <MemoryRouter>
        <NotificationBell area="alumno" />
      </MemoryRouter>,
    );
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole("button", { name: "Notificaciones" }));
    expect(await screen.findByRole("dialog", { name: "Notificaciones" })).toBeInTheDocument();
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Notificaciones" })).not.toBeInTheDocument();
  });
});
