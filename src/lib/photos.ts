import { BASE_URL } from "./api";

export const fotoPerfilUrl = (usuarioId: string, version?: number): string =>
  `${BASE_URL}/api/fotos/perfil/${usuarioId}${version ? `?v=${version}` : ""}`;

export const fotoActividadUrl = (actividadId: string, version?: number): string =>
  `${BASE_URL}/api/fotos/actividad/${actividadId}${version ? `?v=${version}` : ""}`;
