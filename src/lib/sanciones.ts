import type { EstadoComprobantePenalizacion, EstadoPagoPenalizacion } from "./types";

/**
 * Penalizaciones del instructor (V36 del backend). Dos reglas que comparten la guarda de rutas
 * (`components/RequireSinMultaPendiente.tsx`) y el menú lateral (`DashSidebar`):
 *
 * - Con una multa sin pagar, el instructor sólo ve "Mis sanciones" (donde la paga), sus
 *   próximas clases y la lista de inscriptos de cada una, para confirmar cobros en efectivo.
 *   El backend lo hace cumplir por su cuenta (`MultaPendienteFilter`): esto es la pantalla.
 * - Con una suspensión vigente entra a todo, pero no puede crear ni editar actividades ni
 *   clases: eso lo dice el cartel de `DashLayout`.
 */

export const RUTA_SANCIONES = "/instructor/sanciones";

/** Las pantallas que puede abrir un instructor con la multa sin pagar. */
const PERMITIDAS_CON_MULTA = [/^\/instructor\/sanciones$/, /^\/instructor\/proximas-clases$/, /^\/instructor\/clases\/[^/]+$/];

/** Los ítems del menú lateral que siguen visibles con la multa sin pagar. */
export const ITEMS_CON_MULTA = ["proximasclases", "sanciones"];

export function rutaPermitidaConMulta(pathname: string): boolean {
  return PERMITIDAS_CON_MULTA.some((r) => r.test(pathname));
}

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPagoPenalizacion, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  EN_REVISION: "En revisión",
  PAGADA: "Pagada",
};

export const ETIQUETA_ESTADO_COMPROBANTE: Record<EstadoComprobantePenalizacion, string> = {
  EN_REVISION: "En revisión",
  APROBADO: "Aprobado",
  INVALIDO: "Inválido",
};

/** "2026-11-30" -> "30/11/2026", sin pasar por `Date` (que lo correría un día por el huso). */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const FORMATO_DIA = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Un instante ("2026-11-02T15:00:00Z") como día local "02/11/2026". */
export function fechaDeInstante(iso: string | null | undefined): string {
  return iso ? FORMATO_DIA.format(new Date(iso)) : "";
}

/** Lo mínimo que hace falta de una penalización para saber si va con otra en la misma sanción. */
interface PenalizacionAgrupable {
  id: string;
  usuarioId: string;
  tipo: string;
  motivo: string;
  denunciaId: string | null;
  createdAt: string;
}

/** Hoy las dos partes se guardan con milisegundos de diferencia; un minuto es margen de sobra. */
const VENTANA_MISMA_SANCION_MS = 60_000;

function mismaSancion(a: PenalizacionAgrupable, b: PenalizacionAgrupable): boolean {
  if (a.usuarioId !== b.usuarioId || a.tipo === b.tipo) return false;
  if (a.denunciaId || b.denunciaId) return a.denunciaId === b.denunciaId;
  return (
    a.motivo.trim() === b.motivo.trim() &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <= VENTANA_MISMA_SANCION_MS
  );
}

/**
 * Multa + suspensión aplicadas juntas son UNA sanción para el administrador, aunque el backend
 * guarde una penalización por tipo (cada una con su estado y sus acciones). No hay un id que las
 * una, así que se juntan por aproximación: mismo instructor y misma denuncia o, sin denuncia,
 * mismo motivo y creadas con menos de un minuto de diferencia. Cada grupo tiene a lo sumo una de
 * cada tipo. Respeta el orden de la lista: el grupo va donde estaba su primera parte.
 */
export function agruparPenalizaciones<T extends PenalizacionAgrupable>(lista: T[]): T[][] {
  const grupos: T[][] = [];
  for (const p of lista) {
    const grupo = grupos.find((g) => g.length === 1 && mismaSancion(g[0], p));
    if (grupo) grupo.push(p);
    else grupos.push([p]);
  }
  return grupos;
}

/** Mismo tope que el backend y que la documentación del instructor. */
export const TIPOS_COMPROBANTE = ["application/pdf", "image/jpeg", "image/png"];
export const TAMANIO_MAXIMO_COMPROBANTE = 5 * 1024 * 1024;

/** El motivo por el que no se puede mandar un archivo, o null si se puede. */
export function errorComprobante(archivo: File): string | null {
  if (!TIPOS_COMPROBANTE.includes(archivo.type)) return "Formato no permitido. Subí un PDF, JPG o PNG.";
  if (archivo.size > TAMANIO_MAXIMO_COMPROBANTE) return "El archivo supera los 5 MB.";
  return null;
}
