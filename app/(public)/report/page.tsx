import type { Metadata } from 'next'
import ReportForm from '@/components/ReportForm'

export const metadata: Metadata = {
  title: 'Νέα Αναφορά – GreeceClean',
  description: 'Υποβάλετε αναφορά για παράνομη χωματερή ή σκουπίδια στον δήμο σας.',
}

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        <div className="pt-8 pb-2 px-4">
          <h1 className="text-3xl font-extrabold text-primary">Νέα Αναφορά</h1>
          <p className="text-gray-500 text-sm mt-1">
            3 βήματα · λιγότερο από 1 λεπτό
          </p>
        </div>
        <ReportForm />
      </div>
    </div>
  )
}
