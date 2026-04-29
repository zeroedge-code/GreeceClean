'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from './LocaleProvider'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useLocale()

  const nav = [
    { href: '/', label: t.nav.home },
    { href: '/map', label: t.nav.map },
  ]

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight shrink-0">
          <span className="text-2xl">🌿</span>
          <span>GreeceClean</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1 justify-end">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-action-300 transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/report"
            className="bg-action text-white px-4 py-2 rounded-2xl hover:bg-action-600 transition-colors duration-150"
          >
            {t.nav.report}
          </Link>
          <LanguageSwitcher />
        </nav>

        {/* Mobile right-side: flags + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <button
            className="p-2 rounded-xl hover:bg-primary-600 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-primary-600 px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-action-300 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/report"
            className="bg-action text-white px-4 py-2 rounded-2xl text-center hover:bg-action-600 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {t.nav.report}
          </Link>
        </div>
      )}
    </header>
  )
}
