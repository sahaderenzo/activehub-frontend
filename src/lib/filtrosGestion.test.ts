import { describe, expect, it } from "vitest";
import {
  TODOS,
  filtrarActividades,
  filtrarInstructores,
  filtrarReclamos,
  filtrarReportes,
  filtrarResenas,
  filtrarUsuarios,
  ordenarActividades,
  ordenarInstructores,
  ordenarReclamos,
  ordenarReportes,
  ordenarResenas,
  ordenarUsuarios,
} from "./filtrosGestion";
import type { DenunciaAdmin, InstructorAdmin, ReporteSoporteAdmin, ReseniaPublicada, UsuarioAdmin } from "../context/DataContext";
import type { Actividad } from "./types";

/** Filtros de las pestañas de Gestión del admin (2026-10-26). */

const persona = (nombre: string, apellido: string) => ({ id: nombre, nombre, apellido });

describe("filtrarUsuarios", () => {
  const usuarios = [
    { id: "1", nombre: "Ana", apellido: "López", email: "ana@x.com", rol: "ALUMNO", estado: "ACTIVO" },
    { id: "2", nombre: "Sofía", apellido: "Ruiz", email: "sofi@x.com", rol: "INSTRUCTOR", estado: "SUSPENDIDO" },
  ] as UsuarioAdmin[];

  it("por nombre sin tildes, por correo, por rol y por estado", () => {
    expect(filtrarUsuarios(usuarios, { texto: "lopez", rol: TODOS, estado: TODOS }).map((u) => u.id)).toEqual(["1"]);
    expect(filtrarUsuarios(usuarios, { texto: "sofi@", rol: TODOS, estado: TODOS }).map((u) => u.id)).toEqual(["2"]);
    expect(filtrarUsuarios(usuarios, { texto: "", rol: "INSTRUCTOR", estado: TODOS }).map((u) => u.id)).toEqual(["2"]);
    expect(filtrarUsuarios(usuarios, { texto: "", rol: TODOS, estado: "ACTIVO" }).map((u) => u.id)).toEqual(["1"]);
    expect(filtrarUsuarios(usuarios, { texto: "", rol: TODOS, estado: TODOS })).toHaveLength(2);
  });
});

describe("filtrarInstructores", () => {
  const instructores = [
    { id: "1", nombre: "Sofía", apellido: "Ruiz", email: "s@x.com", especialidad: "Natación", estadoVerificacion: "PENDIENTE" },
    { id: "2", nombre: "Matías", apellido: "Ferrer", email: "m@x.com", especialidad: "Yoga", estadoVerificacion: "RECHAZADO" },
  ] as InstructorAdmin[];

  it("por especialidad sin tildes y por validación", () => {
    expect(filtrarInstructores(instructores, { texto: "natacion", estado: TODOS }).map((i) => i.id)).toEqual(["1"]);
    expect(filtrarInstructores(instructores, { texto: "", estado: "RECHAZADO" }).map((i) => i.id)).toEqual(["2"]);
  });
});

describe("filtrarActividades", () => {
  const actividades = [
    { id: "a1", nombre: "Yoga", instructorId: "i1", tipoActividadId: "t1", nivelIntensidad: "Física baja" },
    { id: "a2", nombre: "Pileta", instructorId: "i2", tipoActividadId: "t2", nivelIntensidad: "Física alta" },
  ] as Actividad[];
  const nombres = { i1: "Sofía Ruiz", i2: "Matías Ferrer" };
  const categoria = (a: Actividad) => (a.tipoActividadId === "t1" ? "c-bien" : "c-agua");

  it("por actividad o instructor, categoría y nivel", () => {
    expect(filtrarActividades(actividades, { texto: "matias", categoriaId: TODOS, nivel: TODOS }, nombres, categoria).map((a) => a.id)).toEqual(["a2"]);
    expect(filtrarActividades(actividades, { texto: "", categoriaId: "c-bien", nivel: TODOS }, nombres, categoria).map((a) => a.id)).toEqual(["a1"]);
    expect(filtrarActividades(actividades, { texto: "", categoriaId: TODOS, nivel: "Física alta" }, nombres, categoria).map((a) => a.id)).toEqual(["a2"]);
  });
});

describe("filtrarReclamos", () => {
  const reclamos = [
    { id: "d1", tipo: "CLASE", actividadNombre: "Yoga", motivo: "No vino", estado: "Pendiente", denunciante: persona("Ana", "López"), instructor: persona("Sofía", "Ruiz"), resenia: null },
    {
      id: "d2",
      tipo: "RESENIA",
      actividadNombre: "Pileta",
      motivo: "Insulto",
      estado: "Resuelta",
      denunciante: persona("Sofía", "Ruiz"),
      instructor: persona("Sofía", "Ruiz"),
      resenia: { id: "r", puntaje: 1, comentario: "x", autor: persona("Juan", "Pérez"), oculta: true },
    },
  ] as unknown as DenunciaAdmin[];

  it("por el denunciado (el autor en una reseña), tipo y estado", () => {
    expect(filtrarReclamos(reclamos, { texto: "perez", tipo: TODOS, estado: TODOS }).map((d) => d.id)).toEqual(["d2"]);
    expect(filtrarReclamos(reclamos, { texto: "", tipo: "CLASE", estado: TODOS }).map((d) => d.id)).toEqual(["d1"]);
    expect(filtrarReclamos(reclamos, { texto: "", tipo: TODOS, estado: "Resuelta" }).map((d) => d.id)).toEqual(["d2"]);
  });
});

describe("filtrarResenas", () => {
  const resenas = [
    { id: "r1", alumno: persona("Ana", "López"), actividadNombre: "Yoga", puntaje: 5, comentario: "Excelente", oculta: false },
    { id: "r2", alumno: persona("Juan", "Pérez"), actividadNombre: "Pileta", puntaje: 1, comentario: null, oculta: true },
  ] as unknown as ReseniaPublicada[];

  it("por texto, visibilidad y puntaje", () => {
    expect(filtrarResenas(resenas, { texto: "excelente", estado: TODOS, puntaje: TODOS }).map((r) => r.id)).toEqual(["r1"]);
    expect(filtrarResenas(resenas, { texto: "", estado: "ocultas", puntaje: TODOS }).map((r) => r.id)).toEqual(["r2"]);
    expect(filtrarResenas(resenas, { texto: "", estado: "visibles", puntaje: TODOS }).map((r) => r.id)).toEqual(["r1"]);
    expect(filtrarResenas(resenas, { texto: "", estado: TODOS, puntaje: "1" }).map((r) => r.id)).toEqual(["r2"]);
  });
});

describe("filtrarReportes", () => {
  const reportes = [
    { id: "s1", email: "a@x.com", asunto: "No puedo pagar", detalle: "…", estado: "Abierto", autorNombre: null },
    { id: "s2", email: "b@x.com", asunto: "Otra cosa", detalle: "La ubicación está mal", estado: "Cerrado", autorNombre: "Ana López" },
  ] as ReporteSoporteAdmin[];

  it("por asunto, detalle, persona y estado", () => {
    expect(filtrarReportes(reportes, { texto: "ubicacion", estado: TODOS }).map((r) => r.id)).toEqual(["s2"]);
    expect(filtrarReportes(reportes, { texto: "lopez", estado: TODOS }).map((r) => r.id)).toEqual(["s2"]);
    expect(filtrarReportes(reportes, { texto: "", estado: "Abierto" }).map((r) => r.id)).toEqual(["s1"]);
  });
});

describe("orden de cada pestaña", () => {
  const conFecha = <T extends object>(o: T, dia: number) => ({ ...o, createdAt: `2026-10-${String(dia).padStart(2, "0")}T12:00:00Z` });

  it("usuarios: más nuevos por defecto, más antiguos y por nombre sin importar tildes", () => {
    const lista = [
      conFecha({ id: "b", nombre: "Ángela", apellido: "Z" }, 2),
      conFecha({ id: "a", nombre: "Bruno", apellido: "A" }, 9),
    ] as UsuarioAdmin[];
    expect(ordenarUsuarios(lista, "recientes").map((u) => u.id)).toEqual(["a", "b"]);
    expect(ordenarUsuarios(lista, "antiguos").map((u) => u.id)).toEqual(["b", "a"]);
    expect(ordenarUsuarios(lista, "nombre").map((u) => u.id)).toEqual(["b", "a"]);
    // No toca la lista original.
    expect(lista.map((u) => u.id)).toEqual(["b", "a"]);
  });

  it("instructores: por nombre por defecto y por fecha de solicitud", () => {
    const lista = [conFecha({ id: "z", nombre: "Zoe", apellido: "" }, 1), conFecha({ id: "a", nombre: "Ana", apellido: "" }, 5)] as InstructorAdmin[];
    expect(ordenarInstructores(lista, "nombre").map((i) => i.id)).toEqual(["a", "z"]);
    expect(ordenarInstructores(lista, "antiguos").map((i) => i.id)).toEqual(["z", "a"]);
  });

  it("actividades: precio y calificación, con las sin calificar al final en los dos sentidos", () => {
    const lista = [
      { id: "sin", nombre: "Sin reseñas", precio: 500, rating: 0 },
      { id: "buena", nombre: "Buena", precio: 3000, rating: 4.8 },
      { id: "mala", nombre: "Mala", precio: 1000, rating: 2.1 },
    ] as Actividad[];
    expect(ordenarActividades(lista, "precioMenor").map((a) => a.id)).toEqual(["sin", "mala", "buena"]);
    expect(ordenarActividades(lista, "precioMayor").map((a) => a.id)).toEqual(["buena", "mala", "sin"]);
    expect(ordenarActividades(lista, "mejores").map((a) => a.id)).toEqual(["buena", "mala", "sin"]);
    expect(ordenarActividades(lista, "peores").map((a) => a.id)).toEqual(["mala", "buena", "sin"]);
    expect(ordenarActividades(lista, "nombre").map((a) => a.id)).toEqual(["buena", "mala", "sin"]);
  });

  it("reclamos y reseñas: por fecha y por puntaje (a igual puntaje, la más reciente)", () => {
    const reclamos = [conFecha({ id: "viejo" }, 1), conFecha({ id: "nuevo" }, 20)] as unknown as DenunciaAdmin[];
    expect(ordenarReclamos(reclamos, "recientes").map((d) => d.id)).toEqual(["nuevo", "viejo"]);
    expect(ordenarReclamos(reclamos, "antiguos").map((d) => d.id)).toEqual(["viejo", "nuevo"]);

    const resenas = [
      conFecha({ id: "uno-viejo", puntaje: 1 }, 1),
      conFecha({ id: "cinco", puntaje: 5 }, 5),
      conFecha({ id: "uno-nuevo", puntaje: 1 }, 9),
    ] as unknown as ReseniaPublicada[];
    expect(ordenarResenas(resenas, "peores").map((r) => r.id)).toEqual(["uno-nuevo", "uno-viejo", "cinco"]);
    expect(ordenarResenas(resenas, "mejores").map((r) => r.id)).toEqual(["cinco", "uno-nuevo", "uno-viejo"]);
  });

  it("soporte: abiertos primero por defecto, o sólo por fecha", () => {
    const lista = [
      conFecha({ id: "cerrado-nuevo", estado: "Cerrado" }, 20),
      conFecha({ id: "abierto-viejo", estado: "Abierto" }, 1),
    ] as unknown as ReporteSoporteAdmin[];
    expect(ordenarReportes(lista, "abiertos").map((r) => r.id)).toEqual(["abierto-viejo", "cerrado-nuevo"]);
    expect(ordenarReportes(lista, "recientes").map((r) => r.id)).toEqual(["cerrado-nuevo", "abierto-viejo"]);
  });
});
