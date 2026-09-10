/**
 * Colores del badge de nivel de intensidad.
 *
 * Desde la V21 del backend los niveles son una entidad con ABM (E4Ad-HU05): el admin puede
 * crear los que quiera, así que ya no alcanza con un `Record` de tres claves fijas — el
 * badge de un nivel nuevo tiene que salir igual. Los tres originales conservan su color
 * histórico; cualquier otro cae en el neutro.
 *
 * Vive acá y no en cada pantalla porque el mismo mapa estaba duplicado en `ActivityCard`,
 * `MisActividades` y `Taxonomia`, y ya se habían desincronizado una vez.
 */
export type NivelStyle = [bg: string, fg: string, bd: string];

const POR_NOMBRE: Record<string, NivelStyle> = {
  "física baja": ["#E7F8F5", "#0C8576", "#CBEDE7"],
  "física media": ["#FFF3E0", "#B9741A", "#F6E2C0"],
  "física alta": ["#FBEAEB", "#BE3A3E", "#F3D2D3"],
};

const NEUTRO: NivelStyle = ["#EEF4FB", "#2D5BC8", "#DCE7F5"];

export function nivelStyle(nombre: string | undefined): NivelStyle {
  return POR_NOMBRE[(nombre ?? "").trim().toLowerCase()] ?? NEUTRO;
}
