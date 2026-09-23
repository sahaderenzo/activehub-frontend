/**
 * Preparación común de todas las pruebas (`setupFiles` de `vite.config.ts`).
 *
 * <p>Acá va únicamente lo que **todo** archivo de prueba necesita. Un mock que sirve a una
 * sola prueba va en esa prueba, no acá: lo global es lo que después nadie sabe por qué está.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Testing Library monta en un contenedor propio por prueba; sin esto, dos pruebas del mismo
// archivo comparten el DOM y una consulta por texto encuentra dos coincidencias.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom no implementa ninguna de estas tres, y las pantallas las usan para el scroll y el
// resaltado. Sin los stubs, cualquier prueba que scrollee revienta con "not implemented".
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);

// `requestAnimationFrame` sí existe en jsdom, pero encola para el próximo tick; varias
// pantallas scrollean dentro de uno. Ejecutarlo de inmediato hace la prueba determinista.
window.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
