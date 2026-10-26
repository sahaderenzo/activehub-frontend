import type { DenunciaAdmin, InstructorAdmin, ReporteSoporteAdmin, ReseniaPublicada, UsuarioAdmin } from "../context/DataContext";
import type { Actividad } from "./types";
import { incluye } from "./texto";

/**
 * Filtros de las seis pestañas de Gestión (`admin/Gestion.tsx`, 2026-10-26). Viven acá y no en la
 * pantalla para poder probarlos sin montarla. Todas buscan sin tildes (`incluye`) y un término
 * vacío o "todos" no filtra.
 */

export const TODOS = "todos";

export interface FiltroUsuarios {
  texto: string;
  rol: string;
  estado: string;
}

export function filtrarUsuarios(usuarios: UsuarioAdmin[], f: FiltroUsuarios): UsuarioAdmin[] {
  return usuarios.filter(
    (u) =>
      (incluye(`${u.nombre} ${u.apellido}`, f.texto) || incluye(u.email, f.texto)) &&
      (f.rol === TODOS || u.rol === f.rol) &&
      (f.estado === TODOS || u.estado === f.estado),
  );
}

export interface FiltroInstructores {
  texto: string;
  estado: string;
}

export function filtrarInstructores(instructores: InstructorAdmin[], f: FiltroInstructores): InstructorAdmin[] {
  return instructores.filter(
    (i) =>
      (incluye(`${i.nombre} ${i.apellido}`, f.texto) || incluye(i.email, f.texto) || incluye(i.especialidad ?? "", f.texto)) &&
      (f.estado === TODOS || i.estadoVerificacion === f.estado),
  );
}

export interface FiltroActividades {
  texto: string;
  categoriaId: string;
  nivel: string;
}

export function filtrarActividades(
  actividades: Actividad[],
  f: FiltroActividades,
  instructorNombre: Record<string, string>,
  categoriaIdDe: (a: Actividad) => string | undefined,
): Actividad[] {
  return actividades.filter(
    (a) =>
      (incluye(a.nombre, f.texto) || incluye(instructorNombre[a.instructorId] ?? "", f.texto)) &&
      (f.categoriaId === TODOS || categoriaIdDe(a) === f.categoriaId) &&
      (f.nivel === TODOS || a.nivelIntensidad === f.nivel),
  );
}

export interface FiltroReclamos {
  texto: string;
  tipo: string;
  estado: string;
}

export function filtrarReclamos(denuncias: DenunciaAdmin[], f: FiltroReclamos): DenunciaAdmin[] {
  return denuncias.filter((d) => {
    const denunciado = d.tipo === "RESENIA" ? d.resenia?.autor : d.instructor;
    const texto = [
      `${d.denunciante.nombre} ${d.denunciante.apellido}`,
      denunciado ? `${denunciado.nombre} ${denunciado.apellido}` : "",
      d.actividadNombre,
      d.motivo,
    ];
    return (
      texto.some((t) => incluye(t ?? "", f.texto)) &&
      (f.tipo === TODOS || d.tipo === f.tipo) &&
      (f.estado === TODOS || d.estado === f.estado)
    );
  });
}

export interface FiltroResenas {
  texto: string;
  /** "visibles" | "ocultas" | todos */
  estado: string;
  /** "1".."5" | todos */
  puntaje: string;
}

export function filtrarResenas(resenas: ReseniaPublicada[], f: FiltroResenas): ReseniaPublicada[] {
  return resenas.filter(
    (r) =>
      (incluye(`${r.alumno.nombre} ${r.alumno.apellido}`, f.texto) ||
        incluye(r.actividadNombre, f.texto) ||
        incluye(r.comentario ?? "", f.texto)) &&
      (f.estado === TODOS || (f.estado === "ocultas" ? r.oculta : !r.oculta)) &&
      (f.puntaje === TODOS || r.puntaje === Number(f.puntaje)),
  );
}

export interface FiltroSoporte {
  texto: string;
  estado: string;
}

export function filtrarReportes(reportes: ReporteSoporteAdmin[], f: FiltroSoporte): ReporteSoporteAdmin[] {
  return reportes.filter(
    (r) =>
      [r.autorNombre ?? "", r.email, r.asunto, r.detalle].some((t) => incluye(t, f.texto)) &&
      (f.estado === TODOS || r.estado === f.estado),
  );
}

/* ------------------------------------------------------------------------------------------
 * Orden de cada pestaña (2026-10-26). Cada lista tiene sus opciones; la primera es la de por
 * defecto y coincide con el orden en que la devolvía el backend (salvo Actividades, que venía en
 * el orden del catálogo y pasa a nombre). Ordenar devuelve una copia: no toca la lista cargada.
 * ---------------------------------------------------------------------------------------- */

export interface OpcionOrden {
  valor: string;
  etiqueta: string;
}

const porTexto = new Intl.Collator("es-AR", { sensitivity: "base" }).compare;
const fecha = (iso: string) => new Date(iso).getTime();
const masReciente = (x: { createdAt: string }, y: { createdAt: string }) => fecha(y.createdAt) - fecha(x.createdAt);
const masAntiguo = (x: { createdAt: string }, y: { createdAt: string }) => fecha(x.createdAt) - fecha(y.createdAt);

export const ORDENES_USUARIOS: OpcionOrden[] = [
  { valor: "recientes", etiqueta: "Más nuevos primero" },
  { valor: "antiguos", etiqueta: "Más antiguos primero" },
  { valor: "nombre", etiqueta: "Nombre (A-Z)" },
];

export function ordenarUsuarios(lista: UsuarioAdmin[], orden: string): UsuarioAdmin[] {
  const copia = [...lista];
  if (orden === "antiguos") return copia.sort(masAntiguo);
  if (orden === "nombre") return copia.sort((x, y) => porTexto(`${x.nombre} ${x.apellido}`, `${y.nombre} ${y.apellido}`));
  return copia.sort(masReciente);
}

export const ORDENES_INSTRUCTORES: OpcionOrden[] = [
  { valor: "nombre", etiqueta: "Nombre (A-Z)" },
  { valor: "antiguos", etiqueta: "Solicitud más antigua primero" },
  { valor: "recientes", etiqueta: "Solicitud más reciente primero" },
];

export function ordenarInstructores(lista: InstructorAdmin[], orden: string): InstructorAdmin[] {
  const copia = [...lista];
  if (orden === "antiguos") return copia.sort(masAntiguo);
  if (orden === "recientes") return copia.sort(masReciente);
  return copia.sort((x, y) => porTexto(`${x.nombre} ${x.apellido}`, `${y.nombre} ${y.apellido}`));
}

export const ORDENES_ACTIVIDADES: OpcionOrden[] = [
  { valor: "nombre", etiqueta: "Nombre (A-Z)" },
  { valor: "precioMenor", etiqueta: "Precio: menor" },
  { valor: "precioMayor", etiqueta: "Precio: mayor" },
  { valor: "mejores", etiqueta: "Mejor calificadas" },
  { valor: "peores", etiqueta: "Peor calificadas" },
];

export function ordenarActividades(lista: Actividad[], orden: string): Actividad[] {
  const copia = [...lista];
  const nombre = (x: Actividad, y: Actividad) => porTexto(x.nombre, y.nombre);
  // Una actividad sin reseñas tiene rating 0: no es "la peor", es "sin calificar". Va al final
  // en los dos órdenes por calificación.
  const sinCalificar = (x: Actividad, y: Actividad) => Number(x.rating <= 0) - Number(y.rating <= 0);
  switch (orden) {
    case "precioMenor":
      return copia.sort((x, y) => x.precio - y.precio || nombre(x, y));
    case "precioMayor":
      return copia.sort((x, y) => y.precio - x.precio || nombre(x, y));
    case "mejores":
      return copia.sort((x, y) => sinCalificar(x, y) || y.rating - x.rating || nombre(x, y));
    case "peores":
      return copia.sort((x, y) => sinCalificar(x, y) || x.rating - y.rating || nombre(x, y));
    default:
      return copia.sort(nombre);
  }
}

export const ORDENES_RECLAMOS: OpcionOrden[] = [
  { valor: "recientes", etiqueta: "Más recientes primero" },
  { valor: "antiguos", etiqueta: "Más antiguos primero" },
];

export function ordenarReclamos(lista: DenunciaAdmin[], orden: string): DenunciaAdmin[] {
  return [...lista].sort(orden === "antiguos" ? masAntiguo : masReciente);
}

export const ORDENES_RESENAS: OpcionOrden[] = [
  { valor: "recientes", etiqueta: "Más recientes primero" },
  { valor: "antiguos", etiqueta: "Más antiguas primero" },
  { valor: "peores", etiqueta: "Peor puntaje" },
  { valor: "mejores", etiqueta: "Mejor puntaje" },
];

export function ordenarResenas(lista: ReseniaPublicada[], orden: string): ReseniaPublicada[] {
  const copia = [...lista];
  // A igual puntaje, la más reciente primero.
  if (orden === "peores") return copia.sort((x, y) => x.puntaje - y.puntaje || masReciente(x, y));
  if (orden === "mejores") return copia.sort((x, y) => y.puntaje - x.puntaje || masReciente(x, y));
  if (orden === "antiguos") return copia.sort(masAntiguo);
  return copia.sort(masReciente);
}

export const ORDENES_SOPORTE: OpcionOrden[] = [
  { valor: "abiertos", etiqueta: "Abiertos primero" },
  { valor: "recientes", etiqueta: "Más recientes primero" },
  { valor: "antiguos", etiqueta: "Más antiguos primero" },
];

export function ordenarReportes(lista: ReporteSoporteAdmin[], orden: string): ReporteSoporteAdmin[] {
  const copia = [...lista];
  if (orden === "recientes") return copia.sort(masReciente);
  if (orden === "antiguos") return copia.sort(masAntiguo);
  return copia.sort((x, y) => Number(x.estado !== "Abierto") - Number(y.estado !== "Abierto") || masReciente(x, y));
}
