interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeLocation(query: string): Promise<GeocodingResult> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SOS App Onboarding/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const results = await res.json();
  if (!results.length) {
    throw new Error(`Location not found: "${query}"`);
  }

  const match = results[0];
  return {
    latitude:    parseFloat(match.lat),
    longitude:   parseFloat(match.lon),
    displayName: match.display_name,
  };
}
