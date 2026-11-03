import { describe, expect, it } from "vitest";
import type { PenalizacionAdmin } from "../context/DataContext";
import { FILTRO_VACIO, estadoDeParte, filtrarSanciones, hayFiltro, ordenarSanciones } from "./filtrosPenalizaciones";

const pen = (extra: Partial<PenalizacionAdmin>): PenalizacionAdmin => ({
  id: "p",
  usuarioId: "inst-1",
  usuarioNombre: "Sofía Ruiz",
  usuarioEmail: "sofia@activehub.test",
  tipo: "Económica",
  motivo: "Faltó",
  monto: 5000,
  fechaInicio: null,
  fechaFin: null,
  vigente: false,
  denunciaId: null,
  cantidadPenalizacionesUsuario: 1,
  createdAt: "2026-11-01T10:00:00Z",
  estadoPago: "PENDIENTE_PAGO",
  pagoAprobadoAt: null,
  levantadaAt: null,
  motivoLevantamiento: null,
  comprobantes: [],
  ...extra,
});

const suspension = (extra: Partial<PenalizacionAdmin> = {}) =>
  pen({ tipo: "Suspensión temporal", monto: null, estadoPago: null, vigente: true, fechaInicio: "2026-11-01", fechaFin: "2026-11-30", ...extra });

const ids = (grupos: PenalizacionAdmin[][]) => grupos.map((g) => g.map((p) => p.id).join("+"));

describe("estadoDeParte", () => {
  it("usa la misma etiqueta que el chip", () => {
    expect(estadoDeParte(pen({ estadoPago: "EN_REVISION" }))).toBe("En revisión");
    expect(estadoDeParte(pen({ estadoPago: null }))).toBe("Aplicada");
    expect(estadoDeParte(suspension())).toBe("Vigente");
    expect(estadoDeParte(suspension({ vigente: false, levantadaAt: "2026-11-05T00:00:00Z" }))).toBe("Levantada");
    expect(estadoDeParte(suspension({ vigente: false }))).toBe("Aplicada");
  });
});

describe("filtrarSanciones", () => {
  const sofia = [pen({ id: "m1" }), suspension({ id: "s1" })];
  const diego = [pen({ id: "m2", usuarioNombre: "Diego Morales", usuarioEmail: "diego@activehub.test", estadoPago: "PAGADA", denunciaId: "d-1" })];
  const grupos = [sofia, diego];

  it("sin filtros devuelve todo", () => {
    expect(hayFiltro(FILTRO_VACIO)).toBe(false);
    expect(ids(filtrarSanciones(grupos, FILTRO_VACIO))).toEqual(["m1+s1", "m2"]);
  });

  it("la lupa busca por nombre o correo del instructor, sin tildes", () => {
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, texto: "sofia" }))).toEqual(["m1+s1"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, texto: "diego@" }))).toEqual(["m2"]);
  });

  it("filtra por tipo, también la sanción con las dos partes", () => {
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, tipo: "Suspensión temporal" }))).toEqual(["m1+s1"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, tipo: "AMBAS" }))).toEqual(["m1+s1"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, tipo: "Económica" }))).toEqual(["m1+s1", "m2"]);
  });

  it("filtra por el estado de cualquiera de sus partes y por origen", () => {
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, estado: "Vigente" }))).toEqual(["m1+s1"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, estado: "Pagada" }))).toEqual(["m2"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, origen: "DENUNCIA" }))).toEqual(["m2"]);
    expect(ids(filtrarSanciones(grupos, { ...FILTRO_VACIO, origen: "MANUAL" }))).toEqual(["m1+s1"]);
  });
});

describe("ordenarSanciones", () => {
  const vieja = [pen({ id: "vieja", createdAt: "2026-10-01T10:00:00Z", monto: 9000, cantidadPenalizacionesUsuario: 3, usuarioNombre: "Zoe" })];
  const pagadaAntes = [pen({ id: "pagadaAntes", createdAt: "2026-10-15T10:00:00Z", estadoPago: "PAGADA", pagoAprobadoAt: "2026-10-20T10:00:00Z", usuarioNombre: "Ana" })];
  const pagadaRecien = [pen({ id: "pagadaRecien", createdAt: "2026-10-10T10:00:00Z", estadoPago: "PAGADA", pagoAprobadoAt: "2026-11-01T10:00:00Z", usuarioNombre: "Ángel" })];
  const enRevision = [
    pen({
      id: "enRevision",
      createdAt: "2026-11-01T10:00:00Z",
      estadoPago: "EN_REVISION",
      monto: 1000,
      comprobantes: [{ id: "c", nombreArchivo: "c.pdf", estado: "EN_REVISION", motivoInvalidez: null, createdAt: "2026-11-02T10:00:00Z", revisadoAt: null }],
    }),
  ];
  const grupos = [vieja, pagadaAntes, pagadaRecien, enRevision];

  it("más recientes y más antiguas, por la fecha en que se aplicó", () => {
    expect(ids(ordenarSanciones(grupos, "recientes"))).toEqual(["enRevision", "pagadaAntes", "pagadaRecien", "vieja"]);
    expect(ids(ordenarSanciones(grupos, "antiguas"))).toEqual(["vieja", "pagadaRecien", "pagadaAntes", "enRevision"]);
  });

  it("pagadas recientemente: por la fecha de aprobación del pago, las sin pago al final", () => {
    expect(ids(ordenarSanciones(grupos, "pagadas"))).toEqual(["pagadaRecien", "pagadaAntes", "enRevision", "vieja"]);
  });

  it("comprobantes por revisar primero", () => {
    expect(ids(ordenarSanciones(grupos, "porRevisar"))[0]).toBe("enRevision");
  });

  it("mayor monto, más acumuladas e instructor de la A a la Z", () => {
    expect(ids(ordenarSanciones(grupos, "monto"))[0]).toBe("vieja");
    expect(ids(ordenarSanciones(grupos, "acumuladas"))[0]).toBe("vieja");
    // Con el collator de es-AR, "Ángel" va junto a "Ana" y no después de la "Z".
    expect(ids(ordenarSanciones(grupos, "instructor")).slice(0, 2).sort()).toEqual(["pagadaAntes", "pagadaRecien"]);
    expect(ids(ordenarSanciones(grupos, "instructor")).at(-1)).toBe("vieja");
  });

  it("no modifica la lista original", () => {
    ordenarSanciones(grupos, "antiguas");
    expect(ids(grupos)).toEqual(["vieja", "pagadaAntes", "pagadaRecien", "enRevision"]);
  });
});
