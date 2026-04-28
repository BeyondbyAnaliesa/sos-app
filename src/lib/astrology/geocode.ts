interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface GeocodingSuggestion extends GeocodingResult {
  placeId: string;
}

async function searchNominatim(query: string, limit: number) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SOS App Onboarding/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  return res.json();
}

export async function searchLocations(query: string, limit = 5): Promise<GeocodingSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results = await searchNominatim(trimmed, limit);
  return results.map((match: { place_id: string | number; lat: string; lon: string; display_name: string }) => ({
    placeId: String(match.place_id),
    latitude: parseFloat(match.lat),
    longitude: parseFloat(match.lon),
    displayName: match.display_name,
  }));
}

export async function geocodeLocation(query: string): Promise<GeocodingResult> {
  const results = await searchLocations(query, 1);
  if (!results.length) {
    throw new Error(`Location not found: "${query}"`);
  }

  const match = results[0];
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    displayName: match.displayName,
  };
}
