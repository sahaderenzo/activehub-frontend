import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Manual from "./Manual";

/**
 * La pantalla del Manual de usuario. Se prueba lo que la hace útil y no el texto, que vive en
 * `lib/manual.ts` y tiene sus propias pruebas: que el índice y el cuerpo estén, que el
 * buscador filtre sin tildes, que el marcado de negritas no se vea crudo y que la pantalla se
 * pueda leer sin sesión.
 */

// La pantalla sólo le pregunta al contexto si hay alguien y con qué rol, para decidir si el
// enlace del encabezado dice "Volver a mi panel" o "Volver al inicio". Montar el proveedor
// real arrastraría la sesión y la API, que no son lo que se está probando.
const usuario = vi.hoisted(() => ({ actual: null as { rol: string } | null }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ currentUser: usuario.actual }),
}));

function montar() {
  usuario.actual = null;
  return render(
    <MemoryRouter initialEntries={["/manual"]}>
      <Manual />
    </MemoryRouter>,
  );
}

describe("contenido", () => {
  it("muestra el título y el índice con las secciones del anexo", () => {
    montar();

    expect(screen.getByRole("heading", { level: 1, name: "Cómo usar ActiveHub" })).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    for (const seccion of ["1. Primeros pasos", "2. Manual del Alumno", "3. Manual del Instructor", "4. Manual del Administrador"]) {
      expect(screen.getAllByText(seccion).length).toBeGreaterThan(0);
    }
  });

  it("muestra los apartados con su número, en el índice y en el cuerpo", () => {
    montar();

    // Uno en el índice y otro como título del apartado.
    expect(screen.getAllByText(/Crear una cuenta/)).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 3, name: /2\.6\s*Inscribirse y pagar una clase/ })).toBeInTheDocument();
  });

  it("renderiza el glosario de estados como tabla", () => {
    montar();

    const tabla = screen.getAllByRole("table").at(-1)!;
    expect(within(tabla).getByText("PagoPendiente")).toBeInTheDocument();
    expect(within(tabla).getByRole("columnheader", { name: "Significado para el usuario" })).toBeInTheDocument();
  });

  it("el marcado de negritas se aplica y no se ve crudo", () => {
    montar();

    expect(document.body.textContent).not.toContain("**");
    expect(screen.getAllByText("Retenido:").length).toBeGreaterThan(0);
  });

  it("sin sesión ofrece volver al inicio; con sesión, al panel del rol", () => {
    const { unmount } = montar();
    expect(screen.getByText("Volver al inicio")).toBeInTheDocument();
    unmount();

    usuario.actual = { rol: "INSTRUCTOR" };
    render(
      <MemoryRouter>
        <Manual />
      </MemoryRouter>,
    );
    expect(screen.getByText("Volver a mi panel")).toBeInTheDocument();
  });
});

describe("buscador", () => {
  it("filtra los apartados y cuenta los resultados", async () => {
    montar();
    const usuarioEvento = userEvent.setup();

    await usuarioEvento.type(screen.getByPlaceholderText("Buscar en el manual…"), "congelada");

    expect(screen.getByText(/apartados?$/)).toBeInTheDocument();
    expect(screen.getAllByText(/Clases congeladas/).length).toBeGreaterThan(0);
    // Lo que no coincide desaparece del cuerpo Y del índice.
    expect(screen.queryByText(/Crear una cuenta/)).not.toBeInTheDocument();
  });

  it("ignora las tildes, como el resto de los buscadores del sistema", async () => {
    montar();
    const usuarioEvento = userEvent.setup();

    await usuarioEvento.type(screen.getByPlaceholderText("Buscar en el manual…"), "preinscripcion");

    expect(screen.getAllByText(/Preinscribirse a una clase/).length).toBeGreaterThan(0);
  });

  it("sin coincidencias lo dice, y 'Limpiar' devuelve el manual completo", async () => {
    montar();
    const usuarioEvento = userEvent.setup();
    const campo = screen.getByPlaceholderText("Buscar en el manual…");

    await usuarioEvento.type(campo, "cotizacion del dolar");
    expect(screen.getByText("No encontramos apartados que coincidan con tu búsqueda.")).toBeInTheDocument();

    await usuarioEvento.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(campo).toHaveValue("");
    expect(screen.getAllByText(/Crear una cuenta/).length).toBe(2);
  });
});

describe("navegación", () => {
  it("al presionar un apartado del índice, la pantalla se desplaza hasta él", async () => {
    montar();
    const usuarioEvento = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    // El primero de los dos es el del índice; el segundo es el título del apartado.
    await usuarioEvento.click(screen.getAllByText(/Mis pagos/)[0]);

    expect(scrollTo).toHaveBeenCalled();
  });

  it("'Imprimir / PDF' abre el diálogo de impresión del navegador", async () => {
    montar();
    const usuarioEvento = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal("print", print);

    await usuarioEvento.click(screen.getByRole("button", { name: "Imprimir / PDF" }));

    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("'Volver arriba' sube al principio", async () => {
    montar();
    const usuarioEvento = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    await usuarioEvento.click(screen.getByRole("button", { name: "Volver arriba" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("entrando con un ancla en la URL, arranca desplazado a ese apartado", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/manual#a-2-6"]}>
        <Manual />
      </MemoryRouter>,
    );

    expect(scrollTo).toHaveBeenCalled();
  });
});
