import { useState } from "react";

/**
 * Instante (epoch ms) capturado al montar la pantalla.
 *
 * `Date.now()` durante el render es impuro: dos renders del mismo estado dan resultados
 * distintos, y el compilador de React lo marca. Para lo que hacen estas pantallas —"faltan
 * X días", "esta clase ya pasó", "últimos 30 días"— alcanza con congelar el reloj al montar:
 * el usuario navega o recarga y se toma una lectura nueva.
 *
 * Para decisiones de negocio de verdad manda el backend, que usa su propio `Clock`.
 */
export function useAhora(): number {
  const [ahora] = useState(() => Date.now());
  return ahora;
}
