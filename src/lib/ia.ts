// Cliente del asistente con IA (backend: slice `preguntaralasistente`, modelo Groq).
//
// Vive en `lib/` y no en `DataContext` a propósito: el chat es **público** — la burbuja "¿Dudas?"
// también está en `/ayuda`, que se usa sin sesión — así que no es "datos del usuario logueado",
// que es de lo que se ocupa el contexto. El informe de beneficios, que sí es del alumno, sí está
// en `DataContext`.
import { ApiError, api } from "./api";

export interface TurnoAsistente {
  /** true = lo dijo el asistente. El backend lo traduce al rol del proveedor. */
  deElAsistente: boolean;
  texto: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  /** Títulos de las secciones del manual con las que se armó la respuesta. */
  secciones: string[];
  /** El asistente contestó que la consulta no está cubierta por el manual de usuario. */
  sinInformacion: boolean;
}

/** Tope del backend (`@Size(max = 400)`). Se replica acá para no dejar escribir de más. */
export const MAX_CARACTERES_CONSULTA = 400;

/**
 * Le pregunta al asistente. El historial viaja porque el chat **no tiene estado en el servidor**:
 * la conversación vive mientras la pestaña está abierta.
 *
 * <p>Se manda recortado a los últimos 6 turnos, que es lo que el backend acepta: son tokens de una
 * cuota gratuita, y el contexto útil de una duda operativa no necesita más.
 */
export function preguntarAlAsistente(
  pregunta: string,
  historial: TurnoAsistente[] = [],
): Promise<RespuestaAsistente> {
  return api.post<RespuestaAsistente>("/api/asistente/consultas", {
    pregunta,
    historial: historial.slice(-6),
  });
}

/**
 * Si el error es "la IA no está disponible ahora" (503 `IA_NO_DISPONIBLE`) y no un problema del
 * pedido. Es la señal para **caer al comportamiento sin IA** en vez de mostrar un cartel de error:
 * las FAQs por coincidencia de palabras en el chat, las plantillas por nivel en el informe.
 *
 * <p>Un error de red (`ERROR_RED`, status 0) cuenta igual: con el backend caído el resultado para
 * la persona es el mismo, y tiene sentido responderle algo útil antes que nada.
 */
export function esIaNoDisponible(error: unknown): boolean {
  return error instanceof ApiError && (error.code === "IA_NO_DISPONIBLE" || error.status === 0);
}

/**
 * Si el asistente se quedó **sin cuota** (429 `IA_SIN_CUOTA`): se agotó el plan gratuito del
 * proveedor o esta persona consultó demasiado seguido.
 *
 * <p>**Es distinto de `esIaNoDisponible` y hay que tratarlo distinto.** Ahí no hay IA y el chat
 * responde con las FAQs sin decir nada; acá la IA existe pero hay que esperar, así que **se muestra
 * el mensaje del backend tal cual**: dice cuánto falta y deriva a las preguntas frecuentes. Si se
 * lo tratara como "no disponible", la persona recibiría una FAQ que no contesta lo que preguntó y
 * no se enteraría de que puede volver en un rato.
 *
 * <p>El tiempo lo calcula el backend (lo sabe por el `Retry-After` del proveedor o por su propia
 * ventana), así que la pantalla no arma ese texto: lo muestra.
 */
export function esSinCuota(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    // DEMASIADOS_INTENTOS es la red de seguridad: es el 429 genérico del backend, por si algún
    // camino de límite no pasa por IA_SIN_CUOTA.
    (error.code === "IA_SIN_CUOTA" || error.code === "DEMASIADOS_INTENTOS")
  );
}
