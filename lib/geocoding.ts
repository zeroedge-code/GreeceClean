type GeocodeResult = {
  municipalityName: string
  municipalityId: string | null
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&accept-language=el&zoom=10`
    const res = await fetch(url, {
      headers: {
        // Nominatim policy requires a User-Agent identifying the application
        'User-Agent': 'GreeceClean/1.0 (contact@greececlean.gr)',
      },
      // Never cache geocoding results — coordinates are precise
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Nominatim ${res.status}`)

    const data = (await res.json()) as {
      address?: {
        municipality?: string
        city?: string
        town?: string
        village?: string
        county?: string
        state?: string
      }
    }

    const a = data.address ?? {}
    // Nominatim uses different admin-level keys depending on country/region
    const municipalityName =
      a.municipality ??
      a.city ??
      a.town ??
      a.village ??
      a.county ??
      a.state ??
      'Άγνωστος Δήμος'

    return { municipalityName, municipalityId: null }
  } catch (err) {
    console.warn('reverseGeocode failed, using fallback:', err)
    // Stub fallback — production should match against the municipalities table
    return { municipalityName: 'Άγνωστος Δήμος', municipalityId: null }
  }
}
