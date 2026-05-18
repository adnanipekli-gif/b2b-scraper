'use client'

import { useState, useMemo, useRef } from 'react'
import { Company } from '@/lib/types'
import QuickSendModal from './QuickSendModal'

type SortKey = 'name' | 'branches' | 'instagram_followers' | 'design_score' | 'google_maps_rating'
type SortDir = 'asc' | 'desc'

interface Props {
  companies: Company[]
  onGenerateEmails: (ids: number[]) => void
  sentCompanyIds?: Set<number>
  onEmailSent?: (companyId: number) => void
  onDeleteCompany?: (id: number) => void
  onResetAll?: () => void
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function CompaniesTable({ companies, onGenerateEmails, sentCompanyIds, onEmailSent, onDeleteCompany, onResetAll }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [openCities, setOpenCities] = useState<Set<string>>(new Set())
  const [tooltip, setTooltip] = useState<number | null>(null)
  const [quickSendCompany, setQuickSendCompany] = useState<Company | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key
      ? <span className="text-[10px] text-white">{sortDir === 'asc' ? '▲' : '▼'}</span>
      : <span className="text-[10px] opacity-30">⇅</span>

  // Sort all companies then group by city
  const grouped = useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      const va = (a[sortKey] as string | number | null | undefined) ?? ''
      const vb = (b[sortKey] as string | number | null | undefined) ?? ''
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    const map = new Map<string, Company[]>()
    sorted.forEach(c => {
      const city = c.city ?? 'Bilinmiyor'
      if (!map.has(city)) map.set(city, [])
      map.get(city)!.push(c)
    })
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [companies, sortKey, sortDir])

  const toggleCity = (city: string) => {
    setOpenCities(prev => {
      const next = new Set(prev)
      if (next.has(city)) next.delete(city)
      else next.add(city)
      return next
    })
  }

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () =>
    setSelected(prev => prev.size === companies.length ? new Set() : new Set(companies.map(c => c.id)))

  const toggleCityAll = (cityCompanies: Company[]) => {
    const ids = cityCompanies.map(c => c.id)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSel ? next.delete(id) : next.add(id))
      return next
    })
  }

  if (companies.length === 0) return null

  const SORT_COLS: [SortKey, string][] = [
    ['name', 'Firma Adı'],
    ['branches', 'Şube'],
    ['instagram_followers', 'Instagram'],
    ['google_maps_rating', 'Puan'],
    ['design_score', 'Design'],
  ]

  return (
    <div className="bg-surface border border-[#1e1e2e] rounded-2xl overflow-hidden">

      {/* Global selection action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a2e] border-b border-[#2a2a3e]">
          <span className="text-sm text-accent font-medium">{selected.size} firma seçildi</span>
          <button
            onClick={() => onGenerateEmails([...selected])}
            className="inline-flex items-center gap-1.5 bg-highlight hover:bg-[#b0005a] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            ✉️ Email Oluştur
          </button>
        </div>
      )}

      {/* Sort bar (desktop only) */}
      <div className="hidden sm:flex items-center gap-1 px-4 py-2.5 border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <input
          type="checkbox"
          checked={selected.size === companies.length && companies.length > 0}
          ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < companies.length }}
          onChange={toggleAll}
          className="accent-accent w-3.5 h-3.5 cursor-pointer mr-2"
          aria-label="Tümünü seç"
        />
        <span className="text-[11px] text-gray-700 mr-2 uppercase tracking-wide">Sırala:</span>
        {SORT_COLS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] uppercase tracking-wide hover:text-white transition-colors ${
              sortKey === key ? 'text-white' : 'text-gray-600'
            }`}
          >
            {label} {sortIcon(key)}
          </button>
        ))}
      </div>

      {/* City accordion sections */}
      {grouped.map(([city, cityCompanies]) => {
        const isOpen = openCities.has(city)
        const citySelCount = cityCompanies.filter(c => selected.has(c.id)).length
        const allCitySel = citySelCount === cityCompanies.length

        return (
          <div key={city} className="border-b border-[#1e1e2e] last:border-b-0">

            {/* City header row — clickable to toggle */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-[#0c0c10] hover:bg-[#111118] transition-colors cursor-pointer select-none"
              onClick={() => toggleCity(city)}
            >
              {/* City-level select-all checkbox (desktop) */}
              <div className="hidden sm:block" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={allCitySel && cityCompanies.length > 0}
                  ref={el => { if (el) el.indeterminate = citySelCount > 0 && !allCitySel }}
                  onChange={() => toggleCityAll(cityCompanies)}
                  className="accent-accent w-3.5 h-3.5 cursor-pointer"
                  aria-label={`${city} şehrini tümünü seç`}
                />
              </div>

              <span className="text-[13px] font-semibold text-white flex-1">
                📍 {city}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">
                {cityCompanies.length} firma
                {citySelCount > 0 && <span className="text-accent ml-1.5">· {citySelCount} seçili</span>}
              </span>
              <span className={`text-xs text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
            </div>

            {/* Companies inside city — desktop table */}
            {isOpen && (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm" role="grid">
                    <tbody>
                      {cityCompanies.map((c, i) => (
                        <tr
                          key={c.id}
                          onMouseEnter={() => setTooltip(c.id)}
                          onMouseLeave={() => setTooltip(null)}
                          className={`border-b border-[#1a1a28] last:border-b-0 transition-colors relative ${
                            selected.has(c.id)
                              ? 'bg-primary/20'
                              : i % 2 === 0 ? 'hover:bg-[#1a1a2e]' : 'bg-[#0f0f16] hover:bg-[#1a1a2e]'
                          }`}
                        >
                          <td className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleOne(c.id)}
                              className="accent-accent w-3.5 h-3.5 cursor-pointer"
                              aria-label={`${c.name} seç`}
                            />
                          </td>

                          {/* Name + tooltip */}
                          <td className="px-4 py-3 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{c.name}</span>
                              {sentCompanyIds?.has(c.id) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-medium flex-shrink-0">
                                  Gönderildi
                                </span>
                              )}
                            </div>
                            {c.email && (
                              <div className="text-xs text-accent/70 mt-0.5 truncate max-w-[200px]">{c.email}</div>
                            )}
                            {tooltip === c.id && (c.phone || c.website || c.growth_signal) && (
                              <div className="absolute left-4 z-10 mt-1 bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg p-3 text-xs space-y-1 shadow-xl min-w-48" role="tooltip">
                                {c.phone && <div className="text-gray-300">📞 {c.phone}</div>}
                                {c.website && <div className="text-accent truncate max-w-48">🌐 {c.website}</div>}
                                {c.growth_signal && (
                                  <div className={c.growth_signal === 'expanding' ? 'text-green-400' : c.growth_signal === 'stable' ? 'text-blue-400' : 'text-gray-500'}>
                                    📈 {c.growth_signal}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-400 tabular-nums">{c.branches ?? '—'}</td>

                          <td className="px-4 py-3">
                            {c.instagram_handle ? (
                              <div>
                                <span className="text-accent text-xs">@{c.instagram_handle}</span>
                                {c.instagram_followers != null && (
                                  <div className="text-gray-500 text-xs mt-0.5">{formatFollowers(c.instagram_followers)} takipçi</div>
                                )}
                              </div>
                            ) : <span className="text-gray-700">—</span>}
                          </td>

                          <td className="px-4 py-3">
                            {c.google_maps_rating != null ? (
                              <span className="text-yellow-400 text-xs font-medium">
                                ★ {c.google_maps_rating.toFixed(1)}
                                {c.google_maps_reviews != null && <span className="text-gray-600 ml-1">({c.google_maps_reviews})</span>}
                              </span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>

                          <td className="px-4 py-3">
                            {c.design_score != null ? (
                              <div className="flex gap-0.5" aria-label={`Design skoru: ${c.design_score}/5`}>
                                {[1, 2, 3, 4, 5].map(n => (
                                  <span key={n} className={n <= c.design_score! ? 'text-highlight' : 'text-gray-800'} aria-hidden="true">★</span>
                                ))}
                              </div>
                            ) : <span className="text-gray-700">—</span>}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="text-gray-600 hover:text-white transition-colors flex items-center min-h-[36px]" aria-label={`Ara: ${c.phone}`}>📞</a>
                              )}
                              {c.website && (
                                <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-accent transition-colors flex items-center min-h-[36px]" aria-label={`${c.name} web sitesi`}>🌐</a>
                              )}
                              <button
                                onClick={() => onGenerateEmails([c.id])}
                                className="text-xs text-gray-600 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2 py-1 rounded transition-colors whitespace-nowrap"
                              >
                                Oluştur
                              </button>
                              <button
                                onClick={() => setQuickSendCompany(c)}
                                className="text-xs text-accent hover:text-white border border-accent/30 hover:border-accent/60 bg-accent/5 hover:bg-accent/10 px-2 py-1 rounded transition-colors whitespace-nowrap"
                              >
                                Gönder
                              </button>
                              {onDeleteCompany && (
                                <button
                                  onClick={() => onDeleteCompany(c.id)}
                                  className="text-gray-700 hover:text-red-400 transition-colors px-1 py-1 rounded"
                                  aria-label={`${c.name} sil`}
                                  title="Listeden kaldır"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards inside city */}
                <div className="sm:hidden divide-y divide-[#1a1a28]">
                  {cityCompanies.map(c => (
                    <div key={c.id} className={`px-4 py-4 transition-colors ${selected.has(c.id) ? 'bg-primary/20' : ''}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          className="accent-accent w-4 h-4 cursor-pointer mt-1 flex-shrink-0"
                          aria-label={`${c.name} seç`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white text-sm">{c.name}</p>
                                {sentCompanyIds?.has(c.id) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-medium flex-shrink-0">Gönderildi</span>
                                )}
                              </div>
                              {c.email && (
                                <p className="text-xs text-accent/70 mt-0.5">{c.email}</p>
                              )}
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => onGenerateEmails([c.id])} className="text-xs text-gray-600 hover:text-white border border-[#2a2a3e] px-2 py-1.5 rounded transition-colors">Oluştur</button>
                              <button onClick={() => setQuickSendCompany(c)} className="text-xs text-accent border border-accent/30 bg-accent/5 px-2 py-1.5 rounded transition-colors">Gönder</button>
                              {onDeleteCompany && (
                                <button onClick={() => onDeleteCompany(c.id)} className="text-gray-700 hover:text-red-400 transition-colors px-2 py-1.5 rounded" title="Listeden kaldır">✕</button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {c.branches != null && <span className="text-gray-400">{c.branches} şube</span>}
                            {c.google_maps_rating != null && <span className="text-yellow-400">★ {c.google_maps_rating.toFixed(1)}</span>}
                            {c.instagram_handle && (
                              <span className="text-accent">@{c.instagram_handle}
                                {c.instagram_followers != null && <span className="text-gray-500 ml-1">({formatFollowers(c.instagram_followers)})</span>}
                              </span>
                            )}
                            {c.design_score != null && <span className="text-gray-500">Design: {c.design_score}/5</span>}
                          </div>
                          {(c.phone || c.website) && (
                            <div className="mt-2 flex items-center gap-3">
                              {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-gray-500 hover:text-white">📞 {c.phone}</a>}
                              {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent truncate max-w-[160px]">🌐 {c.website.replace(/^https?:\/\//, '')}</a>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600 flex items-center justify-between">
        <span>
          {companies.length} firma · {grouped.length} şehir
          {selected.size > 0 && ` · ${selected.size} seçildi`}
        </span>
        {onResetAll && (
          <button
            onClick={() => {
              if (confirm('Tüm firma listesi silinecek. Emin misiniz?')) onResetAll()
            }}
            className="text-red-600 hover:text-red-400 transition-colors"
          >
            Listeyi Sıfırla
          </button>
        )}
      </div>

      {quickSendCompany && (
        <QuickSendModal
          company={quickSendCompany}
          onClose={() => setQuickSendCompany(null)}
          onSent={() => {
            onEmailSent?.(quickSendCompany.id)
            setQuickSendCompany(null)
          }}
        />
      )}
    </div>
  )
}
