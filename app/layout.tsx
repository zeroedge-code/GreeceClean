import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import { LocaleProvider } from '@/components/LocaleProvider'
import { getLocale } from '@/lib/i18n'

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <LocaleProvider locale={locale}>
          <Header />
          <main>{children}</main>
        </LocaleProvider>
      </body>
    </html>
  )
}
