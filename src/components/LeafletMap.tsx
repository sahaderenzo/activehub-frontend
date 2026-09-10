import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { s } from "../lib/style";

// Los íconos por default de Leaflet rompen con bundlers (Vite incluido): las URLs
// que arma internamente asumen rutas relativas al HTML, no al build. Se reasignan
// una sola vez, a nivel de módulo, a los assets ya resueltos por Vite.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LeafletMapProps {
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: number;
  title?: string;
  placeholderText?: string;
}

export default function LeafletMap({
  lat,
  lng,
  zoom = 15,
  height = 160,
  title,
  placeholderText = "Ubicación no disponible",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [failed, setFailed] = useState(false);

  const hasCoords = lat !== undefined && lng !== undefined;
  // El ref guarda la última posición conocida para que el efecto de creación no dependa de
  // lat/lng. Se escribe en un efecto, no durante el render (react-hooks/refs).
  const posRef = useRef({ lat, lng });
  useEffect(() => {
    posRef.current = { lat, lng };
  }, [lat, lng]);

  // Crea el mapa + marker una sola vez, apenas hay coordenadas por primera vez.
  // lat/lng quedan afuera de las deps a propósito: el efecto de abajo se encarga
  // de actualizarlos en el mapa ya creado, en vez de re-crearlo en cada cambio.
  useEffect(() => {
    if (!hasCoords || !containerRef.current || mapRef.current) return;
    try {
      const { lat: initLat, lng: initLng } = posRef.current as { lat: number; lng: number };
      const map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markerRef.current = L.marker([initLat, initLng], { title }).addTo(map);
      mapRef.current = map;
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- falló crear el mapa (sistema externo): hay que mostrar el fallback
      setFailed(true);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, zoom, title]);

  // Actualiza posición/centro del mapa ya creado cuando cambian las coordenadas.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat === undefined || lng === undefined) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng]);
  }, [lat, lng]);

  const chrome = s("width:100%;position:relative;background:#EEF2F6;");

  if (failed || !hasCoords) {
    return (
      <div style={{ ...chrome, height }}>
        <div
          style={s(
            "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 16px;text-align:center;font:600 12px Manrope,sans-serif;color:#7A8C9E;",
          )}
        >
          {failed ? "No se pudo cargar el mapa." : placeholderText}
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ ...chrome, height }} />;
}
