import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePaginado } from "./paginado";

/** Paginación de Reseñas y Reclamos de Gestión y de "Gestión de denuncias" (pedido del usuario). */
describe("usePaginado", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("corta la lista en páginas del tamaño pedido", () => {
    const { result } = renderHook(() => usePaginado(items, 10));
    expect(result.current.totalPaginas).toBe(3);
    expect(result.current.visibles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    act(() => result.current.irAPagina(3));
    expect(result.current.visibles).toEqual([21, 22, 23]);
  });

  it("recorta un número de página fuera de rango", () => {
    const { result } = renderHook(() => usePaginado(items, 10));
    act(() => result.current.irAPagina(99));
    expect(result.current.paginaActual).toBe(3);
    act(() => result.current.irAPagina(-4));
    expect(result.current.paginaActual).toBe(1);
  });

  it("si la lista se achica, cae a la última página válida en vez de quedar vacía", () => {
    const { result, rerender } = renderHook(({ lista }) => usePaginado(lista, 10), { initialProps: { lista: items } });
    act(() => result.current.irAPagina(3));
    rerender({ lista: items.slice(0, 12) });
    expect(result.current.paginaActual).toBe(2);
    expect(result.current.visibles).toEqual([11, 12]);
  });

  it("una lista vacía es una sola página", () => {
    const { result } = renderHook(() => usePaginado([], 10));
    expect(result.current.totalPaginas).toBe(1);
    expect(result.current.visibles).toEqual([]);
  });
});
