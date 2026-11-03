import type { PenalizacionAdmin } from "../context/DataContext";
import { ETIQUETA_ESTADO_PAGO } from "./sanciones";
import { incluye } from "./texto";

/**
 * Buscador, filtros y orden de Penalizaciones del administrador. Trabajan sobre las SANCIONES
 * (los grupos de `agruparPenalizaciones`: una multa, una suspensión o las dos aplicadas juntas),
 * que es lo que se ve como una fila. Viven acá y no en la pantalla para probarlos sin montarla,
 * igual que `lib/filtrosGestion.ts`. "todos" o un texto vacío no filtran.
 */

export const TODOS = "todos";

export type EstadoParte = "Pendiente de pago" | "En revisión" | "Pagada" | "Aplicada" | "Vigente" | "Levantada";

/**
 * El estado de una parte, con la misma etiqueta que su chip. Una multa se lee por su pago (las
 * anteriores a V36 no se pagan por la plataforma y quedan "Aplicada"); una suspensión, por si
 * sigue en curso o un administrador la levantó.
 */
export function estadoDeParte(p: PenalizacionAdmin): EstadoParte {
  if (p.tipo === "Económica") return p.estadoPago ? (ETIQUETA_ESTADO_PAGO[p.estadoPago] as EstadoParte) : "Aplicada";
  if (p.levantadaAt) return "Levantada";
  return p.vigente ? "Vigente" : "Aplicada";
}

export const OPCIONES_TIPO = [
  { valor: TODOS, etiqueta: "Todos" },
  { valor: "Económica", etiqueta: "Económica" },
  { valor: "Suspensión temporal", etiqueta: "Suspensión temporal" },
  { valor: "AMBAS", etiqueta: "Multa y suspensión" },
];

/** En el orden en que el administrador los atiende: lo que espera una acción suya, primero. */
export const OPCIONES_ESTADO: { valor: string; etiqueta: string }[] = [
  { valor: TODOS, etiqueta: "Todos" },
  ...(["En revisión", "Pendiente de pago", "Pagada", "Vigente", "Levantada", "Aplicada"] as EstadoParte[]).map((e) => ({
    valor: e,
    etiqueta: e,
  })),
];

export const OPCIONES_ORIGEN = [
  { valor: TODOS, etiqueta: "Todos" },
  { valor: "DENUNCIA", etiqueta: "Originada en una denuncia" },
  { valor: "MANUAL", etiqueta: "Aplicada desde Penalizaciones" },
];

export interface FiltroPenalizaciones {
  texto: string;
  tipo: string;
  estado: string;
  origen: string;
}

export const FILTRO_VACIO: FiltroPenalizaciones = { texto: "", tipo: TODOS, estado: TODOS, origen: TODOS };

export function hayFiltro(f: FiltroPenalizaciones): boolean {
  return f.texto.trim() !== "" || f.tipo !== TODOS || f.estado !== TODOS || f.origen !== TODOS;
}

function cumpleTipo(grupo: PenalizacionAdmin[], tipo: string): boolean {
  if (tipo === TODOS) return true;
  if (tipo === "AMBAS") return grupo.length > 1;
  return grupo.some((p) => p.tipo === tipo);
}

/** La lupa busca por el instructor (nombre o correo), que es por donde se lo reconoce. */
export function filtrarSanciones(grupos: PenalizacionAdmin[][], f: FiltroPenalizaciones): PenalizacionAdmin[][] {
  return grupos.filter((grupo) => {
    const primera = grupo[0];
    return (
      (incluye(primera.usuarioNombre, f.texto) || incluye(primera.usuarioEmail, f.texto)) &&
      cumpleTipo(grupo, f.tipo) &&
      (f.estado === TODOS || grupo.some((p) => estadoDeParte(p) === f.estado)) &&
      (f.origen === TODOS || (f.origen === "DENUNCIA") === (primera.denunciaId !== null))
    );
  });
}

export const ORDENES_PENALIZACIONES = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "antiguas", etiqueta: "Más antiguas" },
  { valor: "porRevisar", etiqueta: "Comprobantes por revisar primero" },
  { valor: "pagadas", etiqueta: "Pagadas recientemente" },
  { valor: "monto", etiqueta: "Mayor monto" },
  { valor: "acumuladas", etiqueta: "Más penalizaciones acumuladas" },
  { valor: "instructor", etiqueta: "Instructor (A-Z)" },
];

const COLLATOR = new Intl.Collator("es-AR", { sensitivity: "base" });

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);
const creada = (g: PenalizacionAdmin[]) => ms(g[0].createdAt);
const multaDe = (g: PenalizacionAdmin[]) => g.find((p) => p.tipo === "Económica");
/** Cuándo se aprobó el pago de la multa, o 0 si no tiene multa pagada por la plataforma. */
const pagadaEl = (g: PenalizacionAdmin[]) => ms(multaDe(g)?.pagoAprobadoAt);
/** Desde cuándo espera el comprobante, o null si no hay ninguno en revisión. */
const esperaDesde = (g: PenalizacionAdmin[]) => {
  const multa = multaDe(g);
  return multa?.estadoPago === "EN_REVISION" ? ms(multa.comprobantes[0]?.createdAt ?? multa.createdAt) : null;
};

/**
 * Devuelve una copia ordenada. A igual criterio, la más reciente primero. "Pagadas
 * recientemente" deja al final las que no tienen un pago aprobado, y "Comprobantes por revisar
 * primero" pone arriba las que esperan, de la que más espera a la que menos.
 */
export function ordenarSanciones(grupos: PenalizacionAdmin[][], orden: string): PenalizacionAdmin[][] {
  const recientes = (a: PenalizacionAdmin[], b: PenalizacionAdmin[]) => creada(b) - creada(a);
  const comparar: Record<string, (a: PenalizacionAdmin[], b: PenalizacionAdmin[]) => number> = {
    recientes,
    antiguas: (a, b) => creada(a) - creada(b),
    porRevisar: (a, b) => {
      const ea = esperaDesde(a);
      const eb = esperaDesde(b);
      if (ea !== null && eb !== null) return ea - eb;
      if (ea !== null) return -1;
      if (eb !== null) return 1;
      return recientes(a, b);
    },
    pagadas: (a, b) => pagadaEl(b) - pagadaEl(a) || recientes(a, b),
    monto: (a, b) => (multaDe(b)?.monto ?? -1) - (multaDe(a)?.monto ?? -1) || recientes(a, b),
    acumuladas: (a, b) => b[0].cantidadPenalizacionesUsuario - a[0].cantidadPenalizacionesUsuario || recientes(a, b),
    instructor: (a, b) => COLLATOR.compare(a[0].usuarioNombre, b[0].usuarioNombre) || recientes(a, b),
  };
  return [...grupos].sort(comparar[orden] ?? recientes);
}
