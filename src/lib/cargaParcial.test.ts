import { describe, expect, it, vi } from "vitest";
import { siPuede } from "./cargaParcial";

/**
 * `siPuede` es lo que evita que un 403 de un módulo secundario tire la pantalla entera: un
 * `Promise.all` se rechaza si una sola de sus consultas falla.
 */
describe("siPuede", () => {
  it("con permiso, pide", async () => {
    const pedir = vi.fn().mockResolvedValue([{ id: "1" }]);
    await expect(siPuede(true, pedir, [])).resolves.toEqual([{ id: "1" }]);
    expect(pedir).toHaveBeenCalledOnce();
  });

  it("sin permiso, NO llama a la API y resuelve con el vacío", async () => {
    const pedir = vi.fn();
    await expect(siPuede(false, pedir, [])).resolves.toEqual([]);
    expect(pedir).not.toHaveBeenCalled();
  });

  it("el vacío es el que se le pasa: puede ser una lista, un objeto o un número", async () => {
    await expect(siPuede(false, vi.fn(), { total: 0 })).resolves.toEqual({ total: 0 });
    await expect(siPuede(false, vi.fn(), 0)).resolves.toBe(0);
  });

  it("dentro de un Promise.all, la consulta sin permiso no arrastra a las demás", async () => {
    const [conPermiso, sinPermiso] = await Promise.all([
      siPuede(true, () => Promise.resolve("datos"), ""),
      siPuede(false, () => Promise.reject(new Error("403")), ""),
    ]);
    expect(conPermiso).toBe("datos");
    expect(sinPermiso).toBe("");
  });
});
