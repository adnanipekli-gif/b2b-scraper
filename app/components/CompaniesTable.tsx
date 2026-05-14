'use client'

import { useState } from 'react'
import { Company } from '@/lib/types'

type SortKey = 'name' | 'branches' | 'instagram_followers' | 'design_score' | 'google_maps_rating'
type SortDir = 'asc' | 'desc'

interface Props {
  companies: Company[]
  onGenerateEmails: (ids: number[]) => void
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function CompaniesTable({ companies, onGenerateEmails }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [tooltip, setTooltip] = useState<number | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...companies].sort((a, b) => {
    const va = (a[sortKey] as string | number | null | undefined) ?? ''
    const vb = (b[sortKey] as string | number | null | undefined) ?? ''
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === companies.length ? new Set() : new Set(companies.map(c => c.id))
    )
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-1 hover:text-white transition-colors group"
    >
      {label}
      <span className="opacity-40 group-hover:opacity-100 text-[10px]">
        {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </button>
  )

  if (companies.length === 0) return null

  return (
    <div className="bg-surface border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Action bar — shown when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a2e] border-b border-[#2a2a3e]">
          <span className="text-sm text-accent font-medium">{selected.size} firma seçildi</span>
          <button
            onClick={() => onGenerateEmails([...selected])}
            className="inline-flex items-center gap-1.5 bg-highlight hover:bg-[#b0005a] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            ✉️ Email Oluştur
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e2e] text-gray-500 text-xs uppercase tracking-wider">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === companies.length && companies.length > 0}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < companies.length }}
                  onChange={toggleAll}
                  className="accent-accent w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left"><SortBtn k="name" label="Firma Adı" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="branches" label="Şubeler" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="instagram_followers" label="Instagram" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="google_maps_rating" label="Puan" /></th>
              <th className="px-4 py-3 text-left"><SortBtn k="design_score" label="Design" /></th>
              <th className="px-4 py-3 text-left text-gray-500">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr
                key={c.id}
                onMouseEnter={() => setTooltip(c.id)}
                onMouseLeave={() => setTooltip(null)}
                className={`border-b border-[#1a1a28] transition-colors relative ${
                  selected.has(c.id)
                    ? 'bg-primary/20'
                    : i % 2 === 0
                    ? 'hover:bg-[#1a1a2e]'
                    : 'bg-[#0f0f16] hover:bg-[#1a1a2e]'
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="accent-accent w-3.5 h-3.5 cursor-pointer"
                  />
                </td>

                {/* Name + city */}
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{c.name}</div>
                  {c.city && <div className="text-xs text-gray-600 mt-0.5">{c.city}</div>}

                  {/* Hover tooltip */}
                  {tooltip === c.id && (c.phone || c.website || c.growth_signal) && (
                    <div className="absolute left-4 z-10 mt-1 bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg p-3 text-xs space-y-1 shadow-xl min-w-48">
                      {c.phone && (
                        <div className="text-gray-300">📞 {c.phone}</div>
                      )}
                      {c.website && (
                        <div className="text-accent truncate max-w-48">🌐 {c.website}</div>
                      )}
                      {c.growth_signal && (
                        <div className={
                          c.growth_signal === 'expanding' ? 'text-green-400' :
                          c.growth_signal === 'stable' ? 'text-blue-400' : 'text-gray-500'
                        }>
                          📈 {c.growth_signal}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Branches */}
                <td className="px-4 py-3 text-gray-400">{c.branches ?? '—'}</td>

                {/* Instagram */}
                <td className="px-4 py-3">
                  {c.instagram_handle ? (
                    <div>
                      <span className="text-accent text-xs">@{c.instagram_handle}</span>
                      {c.instagram_followers != null && (
                        <div className="text-gray-500 text-xs mt-0.5">
                          {formatFollowers(c.instagram_followers)} takipçi
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </td>

                {/* Google rating */}
                <td className="px-4 py-3">
                  {c.google_maps_rating != null ? (
                    <span className="text-yellow-400 text-xs font-medium">
                      ★ {c.google_maps_rating.toFixed(1)}
                      {c.google_maps_reviews != null && (
                        <span className="text-gray-600 ml-1">({c.google_maps_reviews})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </td>

                {/* Design score */}
                <td className="px-4 py-3">
                  {c.design_score != null ? (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <span
                          key={n}
                          className={n <= c.design_score! ? 'text-highlight' : 'text-gray-800'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="text-gray-600 hover:text-white transition-colors text-base"
                        title={c.phone}
                      >
                        📞
                      </a>
                    )}
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-accent transition-colors text-base"
                        title={c.website}
                      >
                        🌐
                      </a>
                    )}
                    <button
                      onClick={() => onGenerateEmails([c.id])}
                      className="text-xs text-gray-600 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2 py-0.5 rounded transition-colors"
                    >
                      Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600">
        {companies.length} firma listeleniyor
        {selected.size > 0 && ` · ${selected.size} seçildi`}
      </div>
    </div>
  )
}
