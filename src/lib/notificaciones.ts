/**
 * A dónde lleva el click de una notificación.
 *
 * <h2>Por qué el destino lo decide el backend y la ruta la decide acá</h2>
 *
 * La campana mostraba texto muerto: "Nueva inscripción en la clase de Yoga del 12/03" no
 * llevaba a ningún lado. `entidadId` no alcanzaba para resolverlo del lado del cliente — su
 * significado cambia según el tipo (a veces es una inscripción, a veces una clase, una
 * reseña, una denuncia o un usuario) y, peor, **el destino útil no siempre es esa entidad**:
 * al instructor una inscripción nueva le sirve abierta en el roster de la CLASE, y un horario
 * nuevo de un favorito le sirve al alumno abierto en la ACTIVIDAD, que es donde puede
 * anotarse. Esa resolución la hace el usecase, que ya tiene cargada la cadena
 * inscripción → clase → actividad, y viaja en `destinoTipo` + `destinoId`.
 *
 * Lo que queda para el cliente es lo único que el backend no sabe: **qué ruta** muestra esa
 * entidad, que depende de con qué permisos mira quien recibió el aviso. Un mismo
 * `CLASE` es "Mis clases" para el alumno y el roster para el instructor.
 *
 * <h2>Se elige por permiso, no por rol</h2>
 *
 * Misma regla que `lib/areas.ts` (RN-19): cada candidata declara el permiso que la habilita y
 * se toma la primera que el usuario tiene. El área desde la que se abrió la campana sólo
 * ordena los candidatos — quien está mirando el panel de instructor prefiere la pantalla de
 * instructor — pero no los limita, porque un mismo usuario puede tener las dos y las
 * notificaciones de las dos le llegan a la misma campana.
 *
 * Sin ninguna candidata habilitada la notificación se muestra **sin link**, que es también lo
 * que pasa con `NINGUNO`: mandar a alguien a una pantalla que `RequirePermiso` le va a
 * rebotar al home es peor que no ofrecer el click.
 */
import { cumple, puedeEntrarA } from "./areas";
import type { Area } from "./areas";
import type { Notificacion } from "../context/DataContext";

/** Debe coincidir con el enum `DestinoNotificacion` del backend. */
export type DestinoNotificacion =
  | "ACTIVIDAD"
  | "CLASE"
  | "INSCRIPCION"
  | "RESENIA"
  | "DENUNCIA"
  | "PERFIL_INSTRUCTOR"
  | "NINGUNO";

interface Candidata {
  area: Area;
  /** `undefined` = la ve cualquiera que haya entrado al área (igual que en `areas.ts`). */
  requiere?: string;
  ruta: (id: string) => string;
}

/**
 * Las pantallas que muestran cada destino, por área. El orden dentro de cada lista no importa
 * (hay una sola por área); el desempate entre áreas lo hace `rutaNotificacion`.
 *
 * Los parámetros de query (`?clase=`, `?resenia=`…) los lee `useResaltado` en la pantalla de
 * destino para marcar y traer a la vista la fila concreta: caer en una lista de treinta
 * clases sin saber cuál es la del aviso no es haber llegado.
 */
const CANDIDATAS: Record<Exclude<DestinoNotificacion, "NINGUNO">, Candidata[]> = {
  ACTIVIDAD: [
    { area: "alumno", ruta: (id) => `/alumno/actividad/${id}` },
    { area: "instructor", requiere: "actividades.publicar", ruta: (id) => `/instructor/actividades/${id}` },
  ],
  CLASE: [
    // El roster: es donde el instructor ve quién se anotó y confirma los cobros.
    { area: "instructor", requiere: "clases.gestionar", ruta: (id) => `/instructor/clases/${id}` },
    { area: "alumno", requiere: "inscripciones.gestionar", ruta: (id) => `/alumno/mis-clases?clase=${id}` },
  ],
  INSCRIPCION: [
    { area: "alumno", requiere: "inscripciones.gestionar", ruta: (id) => `/alumno/mis-clases?inscripcion=${id}` },
  ],
  RESENIA: [
    // La del instructor es la única desde la que se responde un comentario.
    { area: "instructor", requiere: "resenias.responder", ruta: (id) => `/instructor/resenas?resenia=${id}` },
    { area: "alumno", requiere: "resenias.escribir", ruta: (id) => `/alumno/mis-resenas?resenia=${id}` },
  ],
  DENUNCIA: [
    { area: "alumno", requiere: "denuncias.crear", ruta: (id) => `/alumno/mis-denuncias?denuncia=${id}` },
  ],
  PERFIL_INSTRUCTOR: [
    // "Mis datos" no lleva permiso: RN-16 le deja esa pantalla al instructor no verificado,
    // que es justamente quien recibe el aprobado/rechazado.
    { area: "instructor", ruta: () => "/instructor/solicitud" },
  ],
};

/**
 * La ruta a la que lleva el click, o `null` si esta notificación no es clickeable para este
 * usuario (no tiene destino, o ninguna de las pantallas que lo muestran está a su alcance).
 *
 * @param areaActual el área desde la que se abrió la campana, sólo para desempatar.
 * @param permisos   los permisos del usuario (`AuthContext`).
 */
export function rutaNotificacion(
  notificacion: Pick<Notificacion, "destinoTipo" | "destinoId">,
  areaActual: Area,
  permisos: string[],
): string | null {
  const { destinoTipo, destinoId } = notificacion;
  if (!destinoTipo || destinoTipo === "NINGUNO" || !destinoId) return null;

  const candidatas = CANDIDATAS[destinoTipo];
  if (!candidatas) return null;

  // Las dos guardas de ruta que hay que pasar para llegar: `RequireArea` (el área) y
  // `RequirePermiso` (la pantalla). Sin la primera, un administrador que no es alumno
  // terminaba rebotado al home al clickear una notificación de actividad.
  const habilitadas = candidatas.filter(
    (c) => puedeEntrarA(c.area, permisos) && cumple(c.requiere, permisos),
  );
  const elegida = habilitadas.find((c) => c.area === areaActual) ?? habilitadas[0];
  return elegida ? elegida.ruta(destinoId) : null;
}
