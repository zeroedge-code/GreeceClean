'use client'

import { createContext, useContext } from 'react'
import type { Locale, Dictionary } from '@/lib/i18n/types'
import el from '@/lib/i18n/el'
import en from '@/lib/i18n/en'
import de from '@/lib/i18n/de'

const dicts: Record<Locale, Dictionary> = { el, en, de }

type LocaleCtx = { locale: Locale; t: Dictionary }
const Ctx = createContext<LocaleCtx | null>(null)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <Ctx.Provider value={{ locale, t: dicts[locale] }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider')
  return ctx
}
