'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',          label: 'Ana Sayfa' },
  { href: '/history',   label: 'Geçmiş' },
  { href: '/analytics', label: 'Analitik' },
]

export default function AppNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-[#1e1e2e]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <span className="text-lg" aria-hidden="true">⚡</span>
          <span className="font-bold tracking-tight text-white">B2B Scraper</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Ana navigasyon">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                pathname === link.href
                  ? 'text-white bg-[#1a1a28] border border-[#2a2a3e]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          className="sm:hidden border-t border-[#1e1e2e] bg-[#0c0c10] px-6 py-3 space-y-1"
          aria-label="Mobil navigasyon"
        >
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`block text-sm px-3 py-2.5 rounded-lg transition-colors ${
                pathname === link.href
                  ? 'text-white bg-[#1a1a28] border border-[#2a2a3e]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
