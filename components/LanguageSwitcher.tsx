'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from './LocaleProvider'
import type { Locale } from '@/lib/i18n/types'

const LANGS: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'el', flag: '🇬🇷', label: 'Ελληνικά' },
  { locale: 'en', flag: '🇬🇧', label: 'English' },
  { locale: 'de', flag: '🇩🇪', label: 'Deutsch' },
]

export default function LanguageSwitcher() {
  const { locale } = useLocale()
  const router = useRouter()

  async function switchLocale(next: Locale) {
    if (next === locale) return
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    })
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      {LANGS.map(({ locale: l, flag, label }) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          title={label}
          aria-label={label}
          className={`text-lg leading-none px-1 py-0.5 rounded transition-opacity ${
            l === locale ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'
          }`}
        >
          {flag}
        </button>
      ))}
    </div>
  )
}
