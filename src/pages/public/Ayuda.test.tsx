import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Ayuda from "./Ayuda";
import { ApiError } from "../../lib/api";

/**
 * La pantalla pública de Ayuda. Cubre los controles que **alguna vez estuvieron muertos** y
 * el reporte de soporte, que era una maqueta: decía "¡Gracias! Recibimos tu reporte" sin
 * guardar nada. Cada prueba de acá es una regresión contra volver a eso.
 */
const sesion = vi.hoisted(() => ({ usuario: null as { rol: string; email: string } | null }));
const crearReporteSoporte = vi.hoisted(() => vi.fn());

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ currentUser: sesion.usuario }),
}));
vi.mock("../../context/DataContext", () => ({
  useData: () => ({ crearReporteSoporte }),
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={["/ayuda"]}>
      <Ayuda />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sesion.usuario = null;
  crearReporteSoporte.mockReset();
  crearReporteSoporte.mockResolvedValue(undefined);
});

describe("preguntas frecuentes", () => {
  it("el buscador filtra e informa cuántos resultados hay", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.type(screen.getByPlaceholderText("Escribí tu pregunta…"), "efectivo");

    expect(screen.getByText(/resultados?$/)).toBeInTheDocument();
    expect(screen.getByText("¿Cómo pago mi inscripción?")).toBeInTheDocument();
    expect(screen.queryByText("¿Cómo dejo una reseña?")).not.toBeInTheDocument();
  });

  it("buscar sin tildes encuentra igual", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.type(screen.getByPlaceholderText("Escribí tu pregunta…"), "resena");

    expect(screen.getByText("¿Cómo dejo una reseña?")).toBeInTheDocument();
  });

  it("sin coincidencias lo dice en vez de mostrar una lista vacía", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.type(screen.getByPlaceholderText("Escribí tu pregunta…"), "cotizacion del dolar");

    expect(screen.getByText("No encontramos preguntas que coincidan con tu búsqueda.")).toBeInTheDocument();
  });
});

describe("guías rápidas", () => {
  it("cada guía abre la FAQ que la responde", async () => {
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByText("Medios de pago"));

    const faq = screen.getByText("¿Cómo pago mi inscripción?").closest("details")!;
    expect(faq.open).toBe(true);
  });

  it("alternar entre dos guías deja abierta la segunda, no ninguna", async () => {
    // La regresión del `onToggle`: abrir una FAQ cierra la anterior, y el `toggle` de la que
    // se cerraba llegaba último y pisaba el id recién puesto. Las guías "no hacían nada".
    montar();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByText("Cómo inscribirte a una clase"));
    await usuario.click(screen.getByText("Medios de pago"));

    expect(screen.getByText("¿Cómo pago mi inscripción?").closest("details")!.open).toBe(true);

    await usuario.click(screen.getByText("PreInscripción vs. Inscripción"));

    expect(
      screen.getByText("¿Cuál es la diferencia entre PreInscripción e Inscripción?").closest("details")!.open,
    ).toBe(true);
  });
});

describe("reportar un problema", () => {
  async function completarYEnviar(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.type(screen.getByPlaceholderText("Tu email de contacto"), "  ana@test.com  ");
    await usuario.type(screen.getByPlaceholderText("Asunto"), "  No puedo entrar  ");
    await usuario.type(screen.getByPlaceholderText("Contanos qué pasó…"), "  El código no llega  ");
    await usuario.click(screen.getByRole("button", { name: "Enviar reporte" }));
  }

  it("envía el reporte de verdad, con los campos recortados", async () => {
    montar();
    const usuario = userEvent.setup();

    await completarYEnviar(usuario);

    expect(crearReporteSoporte).toHaveBeenCalledWith({
      email: "ana@test.com",
      asunto: "No puedo entrar",
      detalle: "El código no llega",
    });
    expect(screen.getByText("¡Gracias! Recibimos tu reporte.")).toBeInTheDocument();
  });

  it("si el backend rechaza el reporte, muestra SU mensaje y no dice que lo recibió", async () => {
    crearReporteSoporte.mockRejectedValue(new ApiError("VALIDACION", "El asunto es obligatorio", 400));
    montar();
    const usuario = userEvent.setup();

    await completarYEnviar(usuario);

    expect(await screen.findByRole("alert")).toHaveTextContent("El asunto es obligatorio");
    expect(screen.queryByText("¡Gracias! Recibimos tu reporte.")).not.toBeInTheDocument();
  });

  it("ante un error inesperado muestra un mensaje propio", async () => {
    crearReporteSoporte.mockRejectedValue(new Error("boom"));
    montar();
    const usuario = userEvent.setup();

    await completarYEnviar(usuario);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos enviar tu reporte. Intentá de nuevo.");
  });

  it("con sesión iniciada precarga el correo, y lo que se tipea gana", async () => {
    sesion.usuario = { rol: "ALUMNO", email: "ana@activehub.test" };
    montar();
    const usuario = userEvent.setup();
    const campo = screen.getByPlaceholderText("Tu email de contacto");

    expect(campo).toHaveValue("ana@activehub.test");

    await usuario.clear(campo);
    await usuario.type(campo, "otro@test.com");

    expect(campo).toHaveValue("otro@test.com");
  });

  it("se puede reportar sin sesión: el campo arranca vacío y el envío funciona igual", async () => {
    montar();
    const usuario = userEvent.setup();

    expect(screen.getByPlaceholderText("Tu email de contacto")).toHaveValue("");

    await completarYEnviar(usuario);

    expect(crearReporteSoporte).toHaveBeenCalledOnce();
  });

  it("'Enviar otro' vuelve al formulario vacío", async () => {
    montar();
    const usuario = userEvent.setup();

    await completarYEnviar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Enviar otro" }));

    expect(screen.getByPlaceholderText("Asunto")).toHaveValue("");
    expect(screen.getByPlaceholderText("Contanos qué pasó…")).toHaveValue("");
  });
});

describe("contacto y manual", () => {
  it("el mail y el teléfono son enlaces de verdad, no texto plano", () => {
    montar();

    expect(screen.getByText("soporte@activehub.com").closest("a")).toHaveAttribute(
      "href",
      "mailto:soporte@activehub.com",
    );
    expect(screen.getByText("0810 555 ACTIVE").closest("a")).toHaveAttribute("href", "tel:+548105552284");
  });

  it("ofrece el manual de usuario completo", () => {
    montar();

    expect(screen.getByText("Manual de usuario")).toBeInTheDocument();
    expect(screen.getByText("Abrir el manual →")).toBeInTheDocument();
  });
});
