import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { formatDistanciaKm, haversineKm, useGeolocation } from "./geo";

/**
 * Distancias del filtro "cercanía" de Explorar y del "a X de vos" del Home. Las coordenadas
 * son de Mendoza, que es donde vive el catálogo.
 */
describe("haversineKm", () => {
  it("la distancia de un punto a sí mismo es cero", () => {
    expect(haversineKm(-32.8895, -68.8458, -32.8895, -68.8458)).toBe(0);
  });

  it("Mendoza capital a Ciudad de Buenos Aires: unos 985 km", () => {
    const km = haversineKm(-32.8895, -68.8458, -34.6037, -58.3816);
    expect(km).toBeGreaterThan(960);
    expect(km).toBeLessThan(1010);
  });

  it("es simétrica", () => {
    const ida = haversineKm(-32.88, -68.84, -32.9, -68.86);
    const vuelta = haversineKm(-32.9, -68.86, -32.88, -68.84);
    expect(ida).toBeCloseTo(vuelta, 10);
  });

  it("un grado de latitud son ~111 km en cualquier longitud", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
    expect(haversineKm(-32, -68, -33, -68)).toBeCloseTo(111.19, 1);
  });
});

describe("formatDistanciaKm", () => {
  it("debajo del kilómetro muestra metros redondeados", () => {
    expect(formatDistanciaKm(0.4)).toBe("400 m");
    expect(formatDistanciaKm(0.0499)).toBe("50 m");
  });

  it("desde un kilómetro muestra kilómetros con un decimal", () => {
    expect(formatDistanciaKm(1)).toBe("1.0 km");
    expect(formatDistanciaKm(12.34)).toBe("12.3 km");
  });
});

describe("useGeolocation · Activar ubicación", () => {
  type Exito = (p: { coords: { latitude: number; longitude: number } }) => void;
  type Falla = (e: { code: number; PERMISSION_DENIED: number }) => void;

  function navegador(estadoPermiso: "prompt" | "denied") {
    const llamadas: { ok: Exito; error: Falla }[] = [];
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: Exito, error: Falla) => llamadas.push({ ok, error }) },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: () => Promise.resolve({ state: estadoPermiso }) },
    });
    return llamadas;
  }

  it("con el cartel cerrado sin elegir, reintentar vuelve a pedir el permiso", async () => {
    const llamadas = navegador("prompt");
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());
    await act(async () => llamadas[0].error({ code: 1, PERMISSION_DENIED: 1 }));
    expect(result.current.status).toBe("denied");
    expect(result.current.bloqueado).toBe(false);

    // `request` no insiste (no es invasivo); el botón sí.
    act(() => result.current.request());
    expect(llamadas).toHaveLength(1);
    act(() => result.current.reintentar());
    expect(llamadas).toHaveLength(2);

    act(() => llamadas[1].ok({ coords: { latitude: -32.89, longitude: -68.84 } }));
    expect(result.current.status).toBe("granted");
    expect(result.current.coords).toEqual({ lat: -32.89, lng: -68.84 });
  });

  it("con el permiso bloqueado lo informa, porque el navegador no vuelve a mostrar el cartel", async () => {
    const llamadas = navegador("denied");
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());
    await act(async () => llamadas[0].error({ code: 1, PERMISSION_DENIED: 1 }));

    expect(result.current.status).toBe("denied");
    expect(result.current.bloqueado).toBe(true);
  });

  it("si lo habilitan desde la barra de direcciones, pide las coordenadas solo", async () => {
    const llamadas: { ok: Exito; error: Falla }[] = [];
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: Exito, error: Falla) => llamadas.push({ ok, error }) },
    });
    const permiso: { state: string; onchange: (() => void) | null } = { state: "denied", onchange: null };
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: () => Promise.resolve(permiso) },
    });
    const { result } = renderHook(() => useGeolocation());

    act(() => result.current.request());
    await act(async () => llamadas[0].error({ code: 1, PERMISSION_DENIED: 1 }));
    expect(result.current.bloqueado).toBe(true);
    expect(permiso.onchange).not.toBeNull();

    await act(async () => {
      permiso.state = "granted";
      permiso.onchange?.();
    });
    expect(result.current.bloqueado).toBe(false);
    expect(llamadas).toHaveLength(2);
    act(() => llamadas[1].ok({ coords: { latitude: -32.89, longitude: -68.84 } }));
    expect(result.current.status).toBe("granted");
  });
});

