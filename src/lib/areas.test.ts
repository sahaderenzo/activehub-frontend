import { describe, expect, it } from "vitest";
import {
  AREAS,
  areasDisponibles,
  cumple,
  homeDe,
  homeDeArea,
  permisosDePantalla,
  puedeEntrarA,
  puedeVerItem,
} from "./areas";

/**
 * RN-19 del lado del cliente: a dónde entra alguien lo deciden sus **permisos**, no su rol.
 *
 * <p>Estas pruebas cubren los casos que ya se rompieron una vez y están documentados en el
 * propio `areas.ts`: el permiso que abría un área sin ninguna pantalla adentro, el permiso
 * implícito que metía al admin en el área de alumno y el aterrizaje en una pantalla que la
 * persona no podía usar.
 */
describe("cumple", () => {
  it("sin permiso declarado, la ve cualquiera", () => {
    expect(cumple(undefined, [])).toBe(true);
  });

  it("con una lista, alcanza con uno", () => {
    expect(cumple(["usuarios.gestionar", "denuncias.resolver"], ["denuncias.resolver"])).toBe(true);
    expect(cumple(["usuarios.gestionar", "denuncias.resolver"], ["reportes.ver"])).toBe(false);
  });

  it("con un permiso suelto, exige ese", () => {
    expect(cumple("taxonomia.gestionar", ["taxonomia.gestionar"])).toBe(true);
    expect(cumple("taxonomia.gestionar", [])).toBe(false);
  });
});

describe("invariante de las áreas", () => {
  it("cada permiso que abre un área habilita alguna de sus pantallas", () => {
    // Si esto se cae, alguien agregó un permiso a `requiere` de un área sin darle una
    // pantalla: la persona entra y no tiene nada que ver, que es el bug de `cobros.confirmar`.
    for (const area of AREAS) {
      for (const permiso of area.requiere) {
        const abreAlguna = area.pantallas.some((p) => cumple(p.requiere, [permiso]));
        expect(abreAlguna, `${permiso} no habilita ninguna pantalla de ${area.area}`).toBe(true);
      }
    }
  });

  it("no hay dos pantallas con la misma clave", () => {
    const claves = AREAS.flatMap((a) => a.pantallas).map((p) => p.key);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("areasDisponibles y puedeEntrarA", () => {
  it("sin permisos, ninguna área", () => {
    expect(areasDisponibles([])).toEqual([]);
    expect(puedeEntrarA("alumno", [])).toBe(false);
  });

  it("`catalogo.explorar` es implícito y NO abre el área de alumno", () => {
    // Incluirlo en `requiere` metía al admin y al instructor en el área del alumno.
    expect(puedeEntrarA("alumno", ["catalogo.explorar"])).toBe(false);
  });

  it("`cobros.confirmar` es una acción, no un módulo: no abre el área de instructor", () => {
    expect(puedeEntrarA("instructor", ["cobros.confirmar"])).toBe(false);
  });

  it("un permiso de alumno abre el área de alumno y ninguna otra", () => {
    const areas = areasDisponibles(["inscripciones.gestionar"]).map((a) => a.area);
    expect(areas).toEqual(["alumno"]);
  });

  it("alguien con permisos de dos áreas ve las dos, con admin primero", () => {
    const areas = areasDisponibles(["reportes.ver", "clases.gestionar"]).map((a) => a.area);
    expect(areas).toEqual(["admin", "instructor"]);
  });
});

describe("puedeVerItem", () => {
  it("la bandeja de Soporte vive en Gestión: `soporte.gestionar` tiene que abrirla", () => {
    // Sin esta clave en la pantalla, quien sólo tuviera `soporte.gestionar` entraba al área
    // y no podía llegar a la única pantalla que su permiso habilita.
    expect(puedeVerItem("gestionadmin", ["soporte.gestionar"])).toBe(true);
    expect(puedeEntrarA("admin", ["soporte.gestionar"])).toBe(true);
  });

  it("el panel del admin no se ofrece si todas sus tarjetas estarían vacías", () => {
    expect(puedeVerItem("admin", ["taxonomia.gestionar"])).toBe(false);
    expect(puedeVerItem("admin", ["usuarios.gestionar"])).toBe(true);
  });

  it("las pantallas sin permiso las ve cualquiera que entró al área", () => {
    expect(puedeVerItem("explorar", [])).toBe(true);
    expect(puedeVerItem("perfil", [])).toBe(true);
  });

  it("una clave inexistente no rompe: se trata como pantalla sin permiso", () => {
    expect(puedeVerItem("pantalla-que-no-existe", [])).toBe(true);
  });
});

describe("permisosDePantalla", () => {
  it("devuelve siempre una lista, tanto para uno como para varios", () => {
    expect(permisosDePantalla("taxonomia")).toEqual(["taxonomia.gestionar"]);
    expect(permisosDePantalla("gestionadmin")).toContain("soporte.gestionar");
    expect(permisosDePantalla("perfil")).toEqual([]);
  });
});

describe("aterrizaje", () => {
  it("un admin completo aterriza en su Dashboard", () => {
    expect(homeDeArea("admin", ["usuarios.gestionar", "reportes.ver"])).toBe("/admin");
  });

  it("un admin parcial saltea el Dashboard y cae en la pantalla que sí puede usar", () => {
    // El caso reportado: con sólo `taxonomia.gestionar` caía en /admin y veía el cartel de error.
    expect(homeDeArea("admin", ["taxonomia.gestionar"])).toBe("/admin/taxonomia");
  });

  it("sin ninguna pantalla habilitada, el catálogo público y nunca la raíz del área", () => {
    expect(homeDeArea("admin", [])).toBe("/admin/perfil");
    expect(homeDeArea("instructor", [])).toBe("/instructor/perfil");
    // El área de alumno tiene pantallas sin permiso, así que siempre hay dónde aterrizar.
    expect(homeDeArea("alumno", [])).toBe("/alumno");
  });

  it("homeDe manda al catálogo público a quien no tiene ningún área", () => {
    expect(homeDe([])).toBe("/");
    expect(homeDe(["catalogo.explorar"])).toBe("/");
  });

  it("homeDe respeta el orden entre áreas: admin antes que instructor", () => {
    expect(homeDe(["clases.gestionar", "usuarios.gestionar"])).toBe("/admin");
  });

  it("un instructor sólo con `actividades.publicar` no aterriza en su panel", () => {
    // El panel resume clases y reseñas: sin esos módulos no tiene nada que mostrar.
    expect(homeDeArea("instructor", ["actividades.publicar"])).toBe("/instructor/actividades");
  });
});
