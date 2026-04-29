'use client'

import dynamic from 'next/dynamic'
import type { SeedReport } from '@/lib/seed-data'

const MapClient = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-100">
      <p className="text-gray-500">Φόρτωση χάρτη…</p>
    </div>
  ),
})

export default function MapWrapper({ reports }: { reports: SeedReport[] }) {
  return <MapClient reports={reports} />
}
