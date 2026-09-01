export interface AddressResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

// Búsqueda de direcciones vía Nominatim (OpenStreetMap), gratis y sin key. Su
// política de uso pide no autocompletar mientras se tipea — por eso esto se
// llama solo al click de un botón "Buscar", nunca por cada tecla.
export async function searchAddress(query: string): Promise<AddressResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo buscar la dirección.");
  const items: NominatimItem[] = await res.json();
  return items.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
  }));
}
