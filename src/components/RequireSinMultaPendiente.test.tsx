import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireSinMultaPendiente from "./RequireSinMultaPendiente";

/** V36: con una multa sin pagar, el instructor sólo ve Mis sanciones y los inscriptos de sus clases. */

const AUTH = vi.hoisted(() => ({
  initializing: false,
  currentUser: { id: "inst-1", restricciones: { suspendidoHasta: null as string | null, multaPendiente: true } },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => AUTH }));

function montar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<RequireSinMultaPendiente />}>
          <Route path="/instructor/actividades" element={<div>Mis actividades</div>} />
          <Route path="/instructor/clases/:id" element={<div>Inscriptos de la clase</div>} />
          <Route path="/instructor/sanciones" element={<div>Pantalla de pago</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireSinMultaPendiente", () => {
  it("con la multa sin pagar manda a Mis sanciones", () => {
    AUTH.currentUser.restricciones.multaPendiente = true;
    montar("/instructor/actividades");
    expect(screen.getByText("Pantalla de pago")).toBeInTheDocument();
  });

  it("deja ver los inscriptos para confirmar cobros en efectivo", () => {
    AUTH.currentUser.restricciones.multaPendiente = true;
    montar("/instructor/clases/c-1");
    expect(screen.getByText("Inscriptos de la clase")).toBeInTheDocument();
  });

  it("sin multa no se mete, aunque esté suspendido", () => {
    AUTH.currentUser.restricciones.multaPendiente = false;
    AUTH.currentUser.restricciones.suspendidoHasta = "2026-12-01";
    montar("/instructor/actividades");
    expect(screen.getByText("Mis actividades")).toBeInTheDocument();
  });
});
