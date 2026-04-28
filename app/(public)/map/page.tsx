import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Χάρτης Αναφορών – GreeceClean',
  description: 'Δες όλες τις εγκεκριμένες αναφορές σε διαδραστικό χάρτη.',
}

import MapWrapper from '@/components/MapWrapper'

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <MapWrapper />
    </div>
  )
}
