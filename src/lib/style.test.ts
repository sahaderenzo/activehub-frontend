import { describe, expect, it } from "vitest";
import { s } from "./style";

/**
 * `s()` es lo que permite que las pantallas conserven las declaraciones CSS del prototipo tal
 * cual. Si parsea mal, no se rompe nada ruidosamente: simplemente un estilo deja de aplicarse.
 */
describe("s", () => {
  it("convierte declaraciones sueltas en un objeto de React", () => {
    expect(s("display:flex;gap:10px;")).toEqual({ display: "flex", gap: "10px" });
  });

  it("pasa las propiedades con guion a camelCase", () => {
    expect(s("background-color:#fff;border-top-left-radius:4px;")).toEqual({
      backgroundColor: "#fff",
      borderTopLeftRadius: "4px",
    });
  });

  it("no se come los dos puntos del valor (las URL y los gradientes los usan)", () => {
    expect(s("background:url(https://x.test/a.png);")).toEqual({
      background: "url(https://x.test/a.png)",
    });
  });

  it("tolera espacios, saltos de línea y el punto y coma final ausente", () => {
    expect(s("  color : #0E2A47 ;\n  font-weight : 700 ")).toEqual({ color: "#0E2A47", fontWeight: "700" });
  });

  it("descarta las reglas incompletas en vez de generar propiedades vacías", () => {
    expect(s("color:#fff;;sin-valor:;:sin-propiedad;")).toEqual({ color: "#fff" });
  });

  it("una cadena vacía da un objeto vacío", () => {
    expect(s("")).toEqual({});
  });

  it("cachea por cadena: la misma entrada devuelve el MISMO objeto", () => {
    // De esto depende que pasar `style={s("...")}` en un render no cree un objeto nuevo cada
    // vez, que es lo que haría re-renderizar de más a los componentes memoizados.
    expect(s("color:red;")).toBe(s("color:red;"));
    expect(s("color:red;")).not.toBe(s("color:blue;"));
  });
});
