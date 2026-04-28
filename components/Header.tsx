'use client'

import Link from 'next/link'
import { useState } from 'react'

const nav = [
  { href: '/', label: 'Αρχική' },
  { href: '/map', label: 'Χάρτης' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-2xl">🌿</span>
          <span>GreeceClean</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
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
            href="/"
            className="bg-action text-white px-4 py-2 rounded-2xl hover:bg-action-600 transition-colors duration-150"
          >
            Αναφορά
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-primary-600 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Μενού"
        >
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white mb-1" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>
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
            href="/"
            className="bg-action text-white px-4 py-2 rounded-2xl text-center hover:bg-action-600 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Αναφορά
          </Link>
        </div>
      )}
    </header>
  )
}
