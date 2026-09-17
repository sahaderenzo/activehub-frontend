/**
 * RN-19 del lado del cliente: a qué parte de la aplicación entra alguien lo deciden sus
 * **permisos**, no el nombre de su rol.
 *
 * Antes esto se resolvía comparando `currentUser.rol` contra "ALUMNO" / "INSTRUCTOR" /
 * "ADMIN". Efecto reportado: darle `actividades.publicar` a un rol de alumno no le mostraba
 * ningún menú de instructor — el backend lo dejaba pasar y el frontend no tenía por dónde
 * llevarlo. Los permisos ya no cambiaban nada, que es justo lo contrario de HU08.
 *
 * <h2>Por qué este archivo es la única fuente de verdad</h2>
 *
 * Hay **3 menús**, no una variante por combinación de permisos: cada pantalla declara qué
 * permiso (o permisos) la habilitan y el menú se filtra. Agregar una pantalla = una entrada acá; la combinatoria la
 * resuelve el filtro. Lo que se deriva de esta lista:
 *
 * - qué áreas puede ver alguien (`areasDisponibles`),
 * - qué ítems de menú ve dentro de cada una (`puedeVerItem`),
 * - **a dónde aterriza** (`homeDe`, `homeDeArea`).
 *
 * <h2>Aterrizaje: la primera pantalla que sus permisos habilitan</h2>
 *
 * Cada área tenía un `home` constante (`/admin`, `/instructor`, `/alumno`) y ahí se mandaba a
 * cualquiera que la tuviera disponible. Con permisos parciales eso aterrizaba en una pantalla
 * que el usuario no podía usar: alguien con sólo `taxonomia.gestionar` caía en `/admin`, cuyo
 * panel pide otros cuatro módulos para todas sus consultas, y veía el cartel de error en vez
 * del único ABM que sí tenía.
 *
 * Ahora el aterrizaje recorre `pantallas` en orden y toma la primera que el usuario puede
 * usar. Los paneles de inicio van primeros y declaran los permisos de su **contenido**, así
 * que un administrador completo sigue cayendo en su Dashboard y uno parcial lo saltea — y,
 * por la misma razón, tampoco lo ve en el menú: un panel cuyas tarjetas están todas vacías es
 * ruido, no una pantalla.
 */
export type Area = "alumno" | "instructor" | "admin";

/** Una pantalla del menú de un área, en el orden en que se muestra y se prueba al aterrizar. */
export interface PantallaDef {
  /** Clave del ítem de menú; la usan `AlumnoNav` y `DashSidebar` para saber cuál mostrar. */
  key: string;
  path: string;
  /**
    * Permiso que hace falta para verla. Una **lista** significa "alcanza con uno" — es el caso
    * de las pantallas con pestañas de módulos distintos, como Gestión (usuarios, instructores,
    * actividades, reclamos): exigirle `usuarios.gestionar` a alguien que sólo tiene
    * `denuncias.resolver` lo dejaba sin forma de llegar a la pestaña de Reclamos, que es
    * justamente lo que su permiso habilita.
    *
    * `undefined` = la ve cualquiera que haya entrado al área (el panel de inicio, "Explorar",
    * "Favoritos", "Mis datos" del instructor).
    */
  requiere?: string | string[];
}

export interface AreaDef {
  area: Area;
  label: string;
  /** Raíz del área. Es la primera de `pantallas`; se conserva como identificador del área. */
  home: string;
  /**
   * Alcanza con uno de estos para entrar al área. **Invariante:** cada permiso de esta lista
   * tiene que habilitar alguna de las `pantallas`; si no, abre un área sin nada adentro.
   */
  requiere: string[];
  pantallas: PantallaDef[];
}

/**
 * El orden importa dos veces: entre áreas, para elegir a dónde mandar a alguien que no pidió
 * ninguna pantalla en particular (login, raíz, redirección tras un 403); y dentro de
 * `pantallas`, para elegir en cuál aterriza.
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
      "soporte.gestionar",
    ],
    pantallas: [
      // El panel resume usuarios, instructores, reclamos e inscripciones: con alguno de esos
      // módulos tiene algo que mostrar, sin ninguno es una pantalla vacía y no se ofrece.
      {
        key: "admin",
        path: "/admin",
        requiere: ["usuarios.gestionar", "instructores.validar", "denuncias.resolver", "reportes.ver"],
      },
      {
        key: "gestionadmin",
        path: "/admin/gestion",
        requiere: [
          "usuarios.gestionar", "instructores.validar", "denuncias.resolver", "actividades.moderar",
          // La bandeja de Soporte es una pestaña más de esta pantalla: sin la clave acá, alguien
          // que SOLO tenga `soporte.gestionar` abriría el área y no podría entrar a la única
          // pantalla que su permiso habilita.
          "soporte.gestionar",
        ],
      },
      { key: "taxonomia", path: "/admin/taxonomia", requiere: "taxonomia.gestionar" },
      { key: "roles", path: "/admin/roles", requiere: "roles.configurar" },
      { key: "penalizaciones", path: "/admin/penalizaciones", requiere: "penalizaciones.gestionar" },
      { key: "auditoria", path: "/admin/auditoria", requiere: "auditoria.ver" },
      { key: "trazabilidad", path: "/admin/trazabilidad", requiere: "auditoria.ver" },
      { key: "reportes", path: "/admin/reportes", requiere: "reportes.ver" },
      // Perfil no lleva permiso y va último, por la misma razón que el del instructor: son
      // los datos de la propia cuenta y nunca tiene que ser el aterrizaje de alguien que
      // tenga algo más que hacer.
      { key: "perfilAdmin", path: "/admin/perfil" },
    ],
  },
  {
    area: "instructor",
    label: "Instructor",
    home: "/instructor",
    // Sin `cobros.confirmar`: no abre ninguna pantalla por sí solo. Es una ACCIÓN dentro del
    // roster de la clase (`instructor/GestionClase.tsx`, que pide `clases.gestionar`), no un
    // módulo con menú propio. Incluirlo acá dejaba entrar al área a alguien que después no
    // tenía ni una sola pantalla que ver: el aterrizaje caía al `home` del área, que ese
    // usuario tampoco podía usar. Un permiso abre un área sólo si abre alguna de sus pantallas.
    requiere: ["actividades.publicar", "clases.gestionar", "resenias.responder"],
    pantallas: [
      { key: "instructor", path: "/instructor", requiere: ["clases.gestionar", "resenias.responder"] },
      { key: "misactividades", path: "/instructor/actividades", requiere: "actividades.publicar" },
      { key: "proximasclases", path: "/instructor/proximas-clases", requiere: "clases.gestionar" },
      { key: "metricas", path: "/instructor/metricas", requiere: "clases.gestionar" },
      { key: "historial", path: "/instructor/historial", requiere: "clases.gestionar" },
      { key: "resenias", path: "/instructor/resenas", requiere: "resenias.responder" },
      // Perfil no lleva permiso: son los datos de la propia cuenta, no un módulo. Va al
      // final para que nunca sea el aterrizaje de nadie que tenga algo más que hacer.
      { key: "perfil", path: "/instructor/perfil" },
    ],
  },
  {
    area: "alumno",
    label: "Alumno",
    home: "/alumno",
    // Sin `catalogo.explorar`: es un permiso IMPLÍCITO (lo tienen todos los roles, ver
    // `Permiso.IMPLICITOS` en el backend), así que incluirlo acá metía al administrador y al
    // instructor en el área de alumno y les pintaba el botón "Ir a Alumno" en la barra.
    requiere: ["inscripciones.gestionar", "resenias.escribir", "denuncias.crear"],
    pantallas: [
      // El Home del alumno es catálogo puro: no depende de ningún módulo.
      { key: "home", path: "/alumno" },
      // `explorar` y `favoritos` no llevan permiso: `catalogo.explorar` es implícito y lo
      // tiene todo rol, así que filtrar por él no decidía nada.
      { key: "explorar", path: "/alumno/explorar" },
      { key: "calendario", path: "/alumno/calendario", requiere: "inscripciones.gestionar" },
      { key: "favoritos", path: "/alumno/favoritos" },
      { key: "misclases", path: "/alumno/mis-clases", requiere: "inscripciones.gestionar" },
    ],
  },
];

/** Alcanza con uno de los permisos declarados; sin ninguno declarado, la ve cualquiera. */
export function cumple(requiere: string | string[] | undefined, permisos: string[]): boolean {
  if (!requiere) return true;
  const claves = Array.isArray(requiere) ? requiere : [requiere];
  return claves.some((c) => permisos.includes(c));
}

/** Si alguien ve un ítem del menú. La clave es la del ítem (`PantallaDef.key`). */
export function puedeVerItem(key: string, permisos: string[]): boolean {
  const pantalla = AREAS.flatMap((a) => a.pantallas).find((p) => p.key === key);
  return cumple(pantalla?.requiere, permisos);
}

/** Los permisos que habilitan una pantalla, para las guardas de ruta de `App.tsx`. */
export function permisosDePantalla(key: string): string[] {
  const requiere = AREAS.flatMap((a) => a.pantallas).find((p) => p.key === key)?.requiere;
  if (!requiere) return [];
  return Array.isArray(requiere) ? requiere : [requiere];
}

export function areasDisponibles(permisos: string[]): AreaDef[] {
  return AREAS.filter((a) => a.requiere.some((p) => permisos.includes(p)));
}

export function puedeEntrarA(area: Area, permisos: string[]): boolean {
  const def = AREAS.find((a) => a.area === area);
  return !!def && def.requiere.some((p) => permisos.includes(p));
}

/**
 * Dónde aterriza alguien dentro de un área: la primera pantalla que sus permisos habilitan.
 * El `home` del área queda como último recurso — hoy inalcanzable, porque quien entró al área
 * tiene por definición alguno de sus permisos, pero es la respuesta correcta si algún día una
 * pantalla se saca del menú sin sacar su permiso de `requiere`.
 */
export function homeDeArea(area: Area, permisos: string[]): string {
  const def = AREAS.find((a) => a.area === area);
  if (!def) return "/";
  // Si ninguna pantalla del área está habilitada, el catálogo público — nunca la raíz del
  // área, que sería mandarlo a una pantalla que tampoco puede usar.
  return def.pantallas.find((p) => cumple(p.requiere, permisos))?.path ?? "/";
}

/**
 * A dónde mandar a alguien sin destino. Sin ningún permiso de área queda el catálogo
 * público (`/`), que no pide nada.
 */
export function homeDe(permisos: string[]): string {
  const area = areasDisponibles(permisos)[0];
  return area ? homeDeArea(area.area, permisos) : "/";
}
