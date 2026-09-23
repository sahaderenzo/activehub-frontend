import { describe, expect, it } from "vitest";
import type { SesionUsuario } from "../context/AuthContext";
import { perfilIncompleto } from "./perfil";

/**
 * `perfilIncompleto` decide si a alguien lo encierra la pantalla "Terminá tu registro".
 * **Sólo alcanza a las cuentas de Google**, y eso no es un detalle: mirar los campos vacíos
 * sin mirar el proveedor atrapaba al administrador sembrado, que nace sin teléfono.
 */
function usuario(parcial: Partial<SesionUsuario>): SesionUsuario {
  return {
    id: "1",
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@test.com",
    rol: "ALUMNO",
    estado: "ACTIVO",
    authProveedor: "GOOGLE",
    telefono: "2611234567",
    fechaNacimiento: "1995-04-02",
    ...parcial,
  } as SesionUsuario;
}

describe("perfilIncompleto", () => {
  it("sin sesión, no hay nada que completar", () => {
    expect(perfilIncompleto(null)).toBe(false);
  });

  it("una cuenta LOCAL nunca queda incompleta, aunque le falten datos", () => {
    // El admin sembrado por `app.admin-seed` nace sin teléfono y no le corresponde esa pantalla.
    expect(perfilIncompleto(usuario({ authProveedor: "LOCAL", telefono: "", fechaNacimiento: undefined }))).toBe(false);
  });

  it("una cuenta de Google con los dos datos está completa", () => {
    expect(perfilIncompleto(usuario({}))).toBe(false);
  });

  it("una cuenta de Google sin teléfono está incompleta", () => {
    expect(perfilIncompleto(usuario({ telefono: undefined }))).toBe(true);
    expect(perfilIncompleto(usuario({ telefono: "" }))).toBe(true);
    // Un teléfono de puros espacios tampoco sirve: `PUT /api/usuarios/me` lo exige.
    expect(perfilIncompleto(usuario({ telefono: "   " }))).toBe(true);
  });

  it("una cuenta de Google sin fecha de nacimiento está incompleta", () => {
    expect(perfilIncompleto(usuario({ fechaNacimiento: undefined }))).toBe(true);
  });
});
