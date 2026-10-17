import type { AccionResolucion, DenunciaAdmin } from "../context/DataContext";
import { MAX_DIAS_SUSPENSION, MIN_DIAS_SUSPENSION } from "./limites";

/**
 * Las resoluciones de una denuncia, compartidas por las dos pantallas que resuelven:
 * "Gestión de denuncias" (`admin/Auditoria.tsx`) y la pestaña Reclamos de `admin/Gestion.tsx`.
 * Estaban escritas sólo en la segunda, y la primera ofrecía las cuatro acciones de una clase
 * también sobre una reseña denunciada — botones que el backend rechaza con 400.
 *
 * Las descripciones dicen lo que el backend <i>hace</i> (`ResolverDenunciaService`), no lo
 * que uno esperaría que hiciera. Si cambia el comportamiento allá, cambian acá.
 */
export const ETIQUETA_ACCION: Record<AccionResolucion, string> = {
  REINTEGRAR: "Reintegrar el pago",
  SUSPENDER: "Suspender al instructor",
  PENALIZAR: "Aplicar penalización económica",
  DESESTIMAR: "Desestimar",
  OCULTAR_RESENIA: "Ocultar la reseña",
};

export const DESCRIPCION_ACCION: Record<AccionResolucion, string> = {
  REINTEGRAR:
    "Cancela la inscripción y devuelve el pago a todos los inscriptos de la clase, no sólo a quien denunció: lo denunciado es un hecho de la clase y afecta a todos los que pagaron.",
  SUSPENDER:
    `Inhabilita al instructor por la cantidad de días que elijas (entre ${MIN_DIAS_SUSPENSION} y ${MAX_DIAS_SUSPENSION}) y, si cargás un monto, además le aplica una multa. Cancela las clases que tuviera en ese período y reintegra a todos sus inscriptos. Puede seguir iniciando sesión, pero no publicar ni gestionar nada.`,
  PENALIZAR:
    "Suma una penalización económica al historial del instructor. No lo inhabilita, no cancela clases y no devuelve ningún pago.",
  DESESTIMAR:
    "Cierra el caso sin ninguna consecuencia: no se toca el pago, ni la inscripción, ni el instructor. Se le avisa al denunciante igual.",
  OCULTAR_RESENIA:
    "Saca la reseña del listado público y la descuenta del promedio de la actividad. No se borra: queda registrada.",
};

/**
 * Qué se puede hacer según qué se denunció. Sobre una reseña no aplican las acciones que
 * tocan el pago o al instructor: el backend las rechaza con 400, así que tampoco se ofrecen.
 */
export const ACCIONES_POR_TIPO: Record<DenunciaAdmin["tipo"], AccionResolucion[]> = {
  CLASE: ["REINTEGRAR", "SUSPENDER", "PENALIZAR", "DESESTIMAR"],
  RESENIA: ["OCULTAR_RESENIA", "DESESTIMAR"],
};
