import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentacionCard from "./DocumentacionCard";
import type { DocumentoInstructor } from "../context/DataContext";

/**
 * La documentación del instructor (2026-10-26): antes no la podía ver ni actualizar, así que un
 * rechazo no se podía corregir ni un curso nuevo agregar.
 */

function doc(id: string, nombre: string, nuevo = false): DocumentoInstructor {
  return { id, nombreArchivo: nombre, tipoDocumento: "application/pdf", tamanioBytes: 2048, createdAt: "2026-10-20T12:00:00Z", nuevo };
}

const DATA = vi.hoisted(() => ({
  docs: [] as unknown[],
  listarMisDocumentos: vi.fn(),
  subirDocumento: vi.fn(),
  verMiDocumento: vi.fn(),
  retirarMiDocumento: vi.fn(),
}));
vi.mock("../context/DataContext", () => ({ useData: () => DATA }));

beforeEach(() => {
  DATA.docs = [doc("d1", "titulo.pdf"), doc("d2", "curso-nuevo.pdf", true)];
  DATA.listarMisDocumentos.mockReset().mockImplementation(() => Promise.resolve(DATA.docs));
  DATA.subirDocumento.mockReset().mockResolvedValue(doc("d3", "otro.pdf", true));
  DATA.retirarMiDocumento.mockReset().mockResolvedValue(undefined);
  DATA.verMiDocumento.mockReset().mockResolvedValue(undefined);
});

describe("DocumentacionCard", () => {
  it("lista la documentación, marca lo nuevo y avisa la lista a la pantalla", async () => {
    const onCambio = vi.fn();
    render(<DocumentacionCard descripcion="x" onCambio={onCambio} />);

    expect(await screen.findByText("titulo.pdf")).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(onCambio).toHaveBeenCalledWith(DATA.docs);
  });

  it("rechaza un formato que el backend no acepta, sin subirlo", async () => {
    render(<DocumentacionCard descripcion="x" />);
    await screen.findByText("titulo.pdf");

    fireEvent.change(screen.getByLabelText("Archivo a subir"), {
      target: { files: [new File(["x"], "foto.gif", { type: "image/gif" })] },
    });

    expect(await screen.findByText("Formato no permitido. Subí un PDF, JPG o PNG.")).toBeInTheDocument();
    expect(DATA.subirDocumento).not.toHaveBeenCalled();
  });

  it("sube un PDF y recarga la lista", async () => {
    render(<DocumentacionCard descripcion="x" />);
    await screen.findByText("titulo.pdf");

    fireEvent.change(screen.getByLabelText("Archivo a subir"), {
      target: { files: [new File(["x"], "certificado.pdf", { type: "application/pdf" })] },
    });

    expect(await screen.findByText('Subiste "certificado.pdf".')).toBeInTheDocument();
    expect(DATA.subirDocumento).toHaveBeenCalledTimes(1);
    expect(DATA.listarMisDocumentos).toHaveBeenCalledTimes(2);
  });

  it("quita un documento después de confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DocumentacionCard descripcion="x" />);
    const usuario = userEvent.setup();
    await screen.findByText("titulo.pdf");

    await usuario.click(screen.getAllByRole("button", { name: "Quitar" })[0]);

    expect(DATA.retirarMiDocumento).toHaveBeenCalledWith("d1");
    expect(await screen.findByText('Quitaste "titulo.pdf".')).toBeInTheDocument();
  });

  it("no deja quitar el único documento", async () => {
    DATA.docs = [doc("d1", "titulo.pdf")];
    render(<DocumentacionCard descripcion="x" />);
    await screen.findByText("titulo.pdf");

    expect(screen.getByRole("button", { name: "Quitar" })).toBeDisabled();
  });
});
