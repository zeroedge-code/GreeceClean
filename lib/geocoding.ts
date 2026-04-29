type GeocodeResult = {
  municipalityName: string
  municipalityId: string | null
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    // zoom=10 → municipality/city level; zoom=8 → county fallback
    const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&accept-language=el&zoom=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GreeceClean/1.0 (contact@greececlean.gr)' },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Nominatim ${res.status}`)

    const data = (await res.json()) as {
      address?: {
        // Municipality-level (most specific first)
        municipality?:  string
        city?:          string
        town?:          string
        village?:       string
        hamlet?:        string
        city_district?: string
        suburb?:        string
        // Broader fallbacks
        county?:        string
        state_district?: string
        state?:         string
      }
    }

    const a = data.address ?? {}
    const name =
      a.municipality  ??
      a.city          ??
      a.town          ??
      a.village       ??
      a.hamlet        ??
      a.city_district ??
      a.suburb        ??
      a.county        ??
      a.state_district ??
      a.state         ??
      ''

    if (!name) {
      // Retry at a broader zoom level (county/state)
      return reverseGeocodeWide(lat, lng)
    }

    return { municipalityName: name, municipalityId: null }
  } catch (err) {
    console.warn('reverseGeocode failed:', err)
    return { municipalityName: '', municipalityId: null }
  }
}

// Fallback with zoom=8 (regional unit level) for locations without municipality data
async function reverseGeocodeWide(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&accept-language=el&zoom=8`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GreeceClean/1.0 (contact@greececlean.gr)' },
      cache: 'no-store',
    })
    if (!res.ok) return { municipalityName: '', municipalityId: null }

    const data = (await res.json()) as { address?: { county?: string; state?: string } }
    const a = data.address ?? {}
    const name = a.county ?? a.state ?? ''
    return { municipalityName: name, municipalityId: null }
  } catch {
    return { municipalityName: '', municipalityId: null }
  }
}
