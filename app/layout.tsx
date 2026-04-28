import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin', 'greek'] })

export const metadata: Metadata = {
  title: 'GreeceClean – Αναφορά Απορριμμάτων',
  description: 'Βοηθήστε να κρατήσουμε την Ελλάδα καθαρή. Αναφέρετε παράνομες χωματερές και σκουπίδια στον δήμο σας.',
  keywords: ['ελλάδα', 'καθαριότητα', 'αναφορά', 'δήμος', 'περιβάλλον'],
  authors: [{ name: 'GreeceClean' }],
  openGraph: {
    title: 'GreeceClean',
    description: 'Κρατήστε την Ελλάδα καθαρή',
    locale: 'el_GR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <body className={inter.className}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}
