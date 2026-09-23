import { describe, expect, it } from "vitest";
import { MANUAL, textoDeBloque } from "./manual";
import { incluye } from "./texto";

/**
 * El contenido del Manual de usuario. No se prueba la redacción —eso lo corrige quien escribe
 * la documentación— sino las **invariantes** de las que depende la pantalla: ids únicos para
 * el índice y las anclas, ningún apartado vacío y el marcado de negritas balanceado.
 */
const apartados = MANUAL.flatMap((s) => s.apartados);

describe("estructura", () => {
  it("los ids de apartado son únicos: son las anclas de la URL y las claves del índice", () => {
    const ids = apartados.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los ids de sección son únicos", () => {
    const ids = MANUAL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ninguna sección queda sin apartados y ningún apartado sin bloques", () => {
    for (const seccion of MANUAL) {
      expect(seccion.apartados.length, seccion.id).toBeGreaterThan(0);
      for (const apartado of seccion.apartados) {
        expect(apartado.titulo.trim().length, apartado.id).toBeGreaterThan(0);
        expect(apartado.bloques.length, apartado.id).toBeGreaterThan(0);
      }
    }
  });

  it("están las cuatro secciones numeradas del anexo más el glosario", () => {
    expect(MANUAL.map((s) => s.num)).toEqual(["", "1", "2", "3", "4", "5"]);
  });

  it("cada sección declara para qué rol es (lo muestra el índice)", () => {
    const roles = new Set(MANUAL.map((s) => s.rol));
    expect([...roles].sort()).toEqual(["Administrador", "Alumno", "Instructor", "Referencia", "Todos"]);
  });

  it("las listas y las tablas no vienen vacías, y cada fila tiene tantas celdas como columnas", () => {
    for (const bloque of apartados.flatMap((a) => a.bloques)) {
      if (bloque.tipo === "pasos" || bloque.tipo === "lista") {
        expect(bloque.items.length).toBeGreaterThan(0);
      }
      if (bloque.tipo === "tabla") {
        expect(bloque.cols.length).toBeGreaterThan(0);
        for (const fila of bloque.filas) expect(fila).toHaveLength(bloque.cols.length);
      }
    }
  });
});

describe("marcado", () => {
  it("los asteriscos de negrita están balanceados en todo el manual", () => {
    // Un `**` suelto se vería como asteriscos literales en la pantalla.
    for (const apartado of apartados) {
      for (const bloque of apartado.bloques) {
        const marcas = textoDeBloque(bloque).match(/\*\*/g)?.length ?? 0;
        expect(marcas % 2, `${apartado.id}: marcado de negrita sin cerrar`).toBe(0);
      }
    }
  });

  it("el texto no trae HTML: la pantalla lo renderiza como texto y se vería crudo", () => {
    for (const apartado of apartados) {
      for (const bloque of apartado.bloques) {
        expect(textoDeBloque(bloque), apartado.id).not.toMatch(/<[a-z/][^>]*>/i);
      }
    }
  });
});

describe("textoDeBloque", () => {
  it("devuelve el texto de cualquier tipo de bloque, que es lo que recorre el buscador", () => {
    expect(textoDeBloque({ tipo: "p", texto: "hola" })).toBe("hola");
    expect(textoDeBloque({ tipo: "sub", texto: "Mensajes frecuentes" })).toBe("Mensajes frecuentes");
    expect(textoDeBloque({ tipo: "pasos", items: ["uno", "dos"] })).toBe("uno dos");
    expect(textoDeBloque({ tipo: "lista", items: ["a", "b"] })).toBe("a b");
    expect(textoDeBloque({ tipo: "tabla", cols: ["Estado"], filas: [["Retenido"]] })).toBe("Estado Retenido");
  });
});

describe("contenido buscable", () => {
  const buscar = (termino: string) =>
    apartados.filter((a) => incluye(a.titulo, termino) || a.bloques.some((b) => incluye(textoDeBloque(b), termino)));

  it("buscar sin tildes encuentra los apartados de inscripción", () => {
    const ids = buscar("inscripcion").map((a) => a.id);
    expect(ids).toContain("a-2-6");
  });

  it("los métodos de pago están documentados", () => {
    expect(buscar("mercado pago").length).toBeGreaterThan(0);
    expect(buscar("efectivo").length).toBeGreaterThan(0);
  });

  it("el glosario cubre los estados del proyecto", () => {
    const glosario = apartados.find((a) => a.id === "a-5-1");
    const tabla = glosario?.bloques.find((b) => b.tipo === "tabla");
    const estados = tabla?.tipo === "tabla" ? tabla.filas.map((f) => f[1]) : [];
    for (const estado of ["PreInscripción", "PagoPendiente", "Inscripto", "Cancelada", "Retenido", "Liberado"]) {
      expect(estados, `falta el estado ${estado}`).toContain(estado);
    }
  });

  it("una búsqueda sin coincidencias no devuelve nada", () => {
    expect(buscar("cotizacion del dolar")).toHaveLength(0);
  });
});
