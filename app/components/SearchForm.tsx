'use client'

import { useState } from 'react'

interface Props {
  onJobStart: (jobId: number, startedAt: string) => void
  isSearching: boolean
  onRetry?: () => void
}

export default function SearchForm({ onJobStart, isSearching, onRetry }: Props) {
  const [city, setCity] = useState('')
  const [segment, setSegment] = useState('yerel_zincir')
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city.trim()) { setError('Şehir adı giriniz'); return }
    setError('')

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city.trim(),
          segment,
          keyword: keyword.trim() || undefined,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') ?? '60'
        setError(`Çok fazla istek. Lütfen ${retryAfter} saniye bekleyin.`)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scraping başlatılamadı')
      onJobStart(data.job_id, new Date().toISOString())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        setError('Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.')
      } else if (err instanceof TypeError) {
        setError('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.')
      } else {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-[#1e1e2e] rounded-2xl p-6">
      <h2 className="text-base font-bold text-white mb-5 tracking-tight">Firma Ara</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* City */}
        <div>
          <label htmlFor="search-city" className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Şehir</label>
          <input
            id="search-city"
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="İstanbul"
            disabled={isSearching}
            autoComplete="off"
            aria-required="true"
            aria-describedby={error ? 'search-error' : undefined}
            className="w-full bg-[#0f0f13] border border-[#2a2a3e] text-white placeholder-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors disabled:opacity-40"
          />
        </div>

        {/* Segment */}
        <div>
          <label htmlFor="search-segment" className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Segment</label>
          <select
            id="search-segment"
            value={segment}
            onChange={e => setSegment(e.target.value)}
            disabled={isSearching}
            className="w-full bg-[#0f0f13] border border-[#2a2a3e] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors disabled:opacity-40 appearance-none"
          >
            <option value="yerel_zincir">Yerel Zincir Market</option>
            <option value="soguk_depo">Soğuk Depo</option>
          </select>
        </div>

        {/* Keyword */}
        <div>
          <label htmlFor="search-keyword" className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
            Anahtar Kelime <span className="normal-case text-gray-700">(opsiyonel)</span>
          </label>
          <input
            id="search-keyword"
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="market, depo..."
            disabled={isSearching}
            autoComplete="off"
            className="w-full bg-[#0f0f13] border border-[#2a2a3e] text-white placeholder-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors disabled:opacity-40"
          />
        </div>
      </div>

      {error && (
        <div
          id="search-error"
          role="alert"
          className="flex items-center justify-between bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 mb-4"
        >
          <span className="text-red-400 text-sm">{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-red-400 hover:text-white underline ml-3 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            >
              Tekrar dene
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSearching}
        aria-busy={isSearching}
        className="inline-flex items-center gap-2 bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#0f0f13] min-h-[44px]"
      >
        {isSearching ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-[#0f0f13] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            Taranıyor...
          </>
        ) : (
          <><span aria-hidden="true">🔍</span> Firma Ara</>
        )}
      </button>
    </form>
  )
}
