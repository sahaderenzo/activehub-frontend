/**
 * RN-19 del lado del cliente: a qué parte de la aplicación entra alguien lo deciden sus
 * **permisos**, no el nombre de su rol.
 *
 * Antes esto se resolvía comparando `currentUser.rol` contra "ALUMNO" / "INSTRUCTOR" /
 * "ADMIN". Efecto reportado: darle `actividades.publicar` a un rol de alumno no le mostraba
 * ningún menú de instructor — el backend lo dejaba pasar y el frontend no tenía por dónde
 * llevarlo. Los permisos ya no cambiaban nada, que es justo lo contrario de HU08.
 *
 * Un área está disponible si el usuario tiene **alguno** de sus permisos (`requiere`).
 * Cada pantalla dentro del área se filtra después con su propio permiso; acá sólo se
 * decide "¿tiene algo que hacer en esta sección?".
 */
export type Area = "alumno" | "instructor" | "admin";

export interface AreaDef {
  area: Area;
  label: string;
  home: string;
  /** Alcanza con uno de estos para entrar al área. */
  requiere: string[];
}

/**
 * El orden importa: es el que se usa para elegir a dónde mandar a alguien que no pidió
 * ninguna pantalla en particular (login, raíz, redirección tras un 403).
 */
export const AREAS: AreaDef[] = [
  {
    area: "admin",
    label: "Administración",
    home: "/admin",
    requiere: [
      "usuarios.gestionar",
      "roles.configurar",
      "taxonomia.gestionar",
      "penalizaciones.gestionar",
      "denuncias.resolver",
      "instructores.validar",
      "auditoria.ver",
      "reportes.ver",
      "actividades.moderar",
    ],
  },
  {
    area: "instructor",
    label: "Instructor",
    home: "/instructor",
    requiere: ["actividades.publicar", "clases.gestionar", "cobros.confirmar", "resenias.responder"],
  },
  {
    area: "alumno",
    label: "Alumno",
    home: "/alumno",
    // Sin `catalogo.explorar`: es un permiso IMPLÍCITO (lo tienen todos los roles, ver
    // `Permiso.IMPLICITOS` en el backend), así que incluirlo acá metía al administrador y al
    // instructor en el área de alumno y les pintaba el botón "Ir a Alumno" en la barra.
    requiere: ["inscripciones.gestionar", "resenias.escribir", "denuncias.crear"],
  },
];

export function areasDisponibles(permisos: string[]): AreaDef[] {
  return AREAS.filter((a) => a.requiere.some((p) => permisos.includes(p)));
}

export function puedeEntrarA(area: Area, permisos: string[]): boolean {
  const def = AREAS.find((a) => a.area === area);
  return !!def && def.requiere.some((p) => permisos.includes(p));
}

/**
 * A dónde mandar a alguien sin destino. Sin ningún permiso de área queda el catálogo
 * público (`/`), que no pide nada.
 */
export function homeDe(permisos: string[]): string {
  return areasDisponibles(permisos)[0]?.home ?? "/";
}

/**
 * Permiso que hace falta para ver cada ítem de menú. Las claves son las de los menús
 * (sidebar de instructor y de admin, nav del alumno). Un ítem que no está acá lo ve
 * cualquiera que haya entrado al área.
 */
export const PERMISO_POR_ITEM: Record<string, string> = {
  // Alumno. `explorar` y `favoritos` no se filtran: `catalogo.explorar` es implícito y lo
  // tiene todo rol, así que el filtro no decidía nada.
  calendario: "inscripciones.gestionar",
  misclases: "inscripciones.gestionar",
  // Instructor
  misactividades: "actividades.publicar",
  proximasclases: "clases.gestionar",
  historial: "clases.gestionar",
  metricas: "clases.gestionar",
  resenias: "resenias.responder",
  // Admin
  gestionadmin: "usuarios.gestionar",
  taxonomia: "taxonomia.gestionar",
  roles: "roles.configurar",
  penalizaciones: "penalizaciones.gestionar",
  auditoria: "auditoria.ver",
  trazabilidad: "auditoria.ver",
  reportes: "reportes.ver",
};
