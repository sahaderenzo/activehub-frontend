import { useCallback, useEffect, useState } from "react";

const RADIO_TIERRA_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanciaKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export type GeolocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export interface GeolocationState {
  coords: { lat: number; lng: number } | null;
  status: GeolocationStatus;
  /**
   * Con `status === "denied"`: si el navegador tiene el permiso BLOQUEADO para este sitio
   * (Permissions API en "denied"). Ahí `getCurrentPosition` no vuelve a mostrar el cartel; y
   * ninguna API de la página puede reabrirlo: se habilita desde la barra de direcciones.
   * Si es false, la persona cerró el cartel sin elegir y volver a pedir lo vuelve a mostrar.
   */
  bloqueado: boolean;
  request: () => void;
  /**
   * Lo dispara el botón "Activar ubicación". A diferencia de `request`, vuelve a pedir aunque
   * ya se haya negado: si el permiso no quedó bloqueado, el navegador vuelve a mostrar su
   * cartel de "¿Permitir ubicación?", que es justo lo que no encuentra quien no sabe que está
   * arriba, al lado de la dirección.
   */
  reintentar: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [bloqueado, setBloqueado] = useState(false);

  const pedir = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBloqueado(false);
        setStatus("granted");
      },
      (err) => {
        setStatus("denied");
        if (err.code !== err.PERMISSION_DENIED || !navigator.permissions?.query) {
          setBloqueado(false);
          return;
        }
        navigator.permissions
          .query({ name: "geolocation" })
          .then((p) => setBloqueado(p.state === "denied"))
          .catch(() => setBloqueado(false));
      },
      { timeout: 10_000 },
    );
  }, []);

  const request = useCallback(() => {
    if (status === "granted" || status === "denied" || status === "loading") return;
    pedir();
  }, [status, pedir]);

  const reintentar = useCallback(() => {
    if (status === "granted" || status === "loading") return;
    pedir();
  }, [status, pedir]);

  // Con el permiso bloqueado, sólo se puede habilitar por fuera de la página, desde el ícono
  // de la barra de direcciones. Se escucha
  // el cambio y, si lo habilitaron, se piden las coordenadas sin que haya que recargar.
  useEffect(() => {
    if (!bloqueado || !navigator.permissions?.query) return;
    let estado: PermissionStatus | null = null;
    let cancelado = false;
    const alCambiar = () => {
      if (!estado || estado.state === "denied") return;
      setBloqueado(false);
      if (estado.state === "granted") pedir();
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (cancelado) return;
        estado = p;
        p.onchange = alCambiar;
      })
      .catch(() => {});
    return () => {
      cancelado = true;
      if (estado) estado.onchange = null;
    };
  }, [bloqueado, pedir]);

  return { coords, status, bloqueado, request, reintentar };
}
