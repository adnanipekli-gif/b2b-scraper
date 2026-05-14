'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',          label: 'Ana Sayfa' },
  { href: '/history',   label: 'Geçmiş' },
  { href: '/analytics', label: 'Analitik' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-[#1e1e2e]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <span className="text-lg">⚡</span>
          <span className="font-bold tracking-tight text-white">B2B Scraper</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
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

        <span className="text-[11px] text-gray-600 bg-[#1a1a28] border border-[#2a2a3e] px-3 py-1 rounded-full">
          Sprint 6
        </span>
      </div>
    </header>
  )
}
