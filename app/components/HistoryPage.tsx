'use client'

import { useState, useMemo } from 'react'
import { useEmailTracking, SentEmailRow } from '@/app/hooks/useEmailTracking'
import EmailTrackingDetail from './EmailTrackingDetail'
import ExportToCSV from './ExportToCSV'

type Filter = 'all' | 'sent' | 'opened' | 'replied' | 'no_response'
type SortKey = 'sent_at' | 'open_count' | 'click_count'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',         label: 'Tümü' },
  { id: 'sent',        label: 'Gönderildi' },
  { id: 'opened',      label: 'Açıldı' },
  { id: 'replied',     label: 'Yanıtlandı' },
  { id: 'no_response', label: 'Yanıt Yok' },
]

const STATUS_CLS: Record<string, string> = {
  sent:    'bg-blue-900/50 text-blue-400',
  bounced: 'bg-red-900/50 text-red-400',
  spam:    'bg-orange-900/50 text-orange-400',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const { emails, isLoading, error, markReplied, exportCSV, refresh } = useEmailTracking()
  const [filter, setFilter]   = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('sent_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')
  const [detail, setDetail]   = useState<SentEmailRow | null>(null)

  const filtered = useMemo(() => {
    let rows = [...emails]

    // Filter
    if (filter === 'opened')      rows = rows.filter(r => r.email_tracking?.opened)
    else if (filter === 'replied') rows = rows.filter(r => r.email_tracking?.reply_received)
    else if (filter === 'no_response')
      rows = rows.filter(r => !r.email_tracking?.opened && !r.email_tracking?.reply_received)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        (r.companies?.name ?? r.recipient_name ?? '').toLowerCase().includes(q) ||
        (r.recipient_email ?? '').toLowerCase().includes(q)
      )
    }

    // Date range
    if (dateFrom) rows = rows.filter(r => r.sent_at >= dateFrom)
    if (dateTo)   rows = rows.filter(r => r.sent_at <= dateTo + 'T23:59:59')

    // Sort
    rows.sort((a, b) => {
      let va: number, vb: number
      if (sortKey === 'sent_at') {
        va = new Date(a.sent_at).getTime()
        vb = new Date(b.sent_at).getTime()
      } else if (sortKey === 'open_count') {
        va = a.email_tracking?.open_count ?? 0
        vb = b.email_tracking?.open_count ?? 0
      } else {
        va = a.email_tracking?.click_count ?? 0
        vb = b.email_tracking?.click_count ?? 0
      }
      return sortAsc ? va - vb : vb - va
    })

    return rows
  }, [emails, filter, search, dateFrom, dateTo, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400 text-sm">
        Veriler yüklenemedi.
      </div>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-lg">Email Geçmişi</h1>
            <p className="text-xs text-gray-600 mt-0.5">{emails.length} email gönderildi</p>
          </div>
          <ExportToCSV onExport={exportCSV} />
        </div>

        {/* Filters row */}
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-4 space-y-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f.id
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'text-gray-500 hover:text-white border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + date range */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Firma veya email ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#0f0f16] border border-[#2a2a3e] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-accent transition-colors placeholder:text-gray-700"
            />
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Tarih:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-[#0f0f16] border border-[#2a2a3e] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent transition-colors"
              />
              <span>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-[#0f0f16] border border-[#2a2a3e] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button
              onClick={() => refresh()}
              className="text-xs text-gray-500 hover:text-white border border-[#2a2a3e] px-3 py-1.5 rounded-lg transition-colors"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 text-[11px] text-gray-600 uppercase tracking-wide border-b border-[#1e1e2e]">
            <span>Firma</span>
            <span>Email</span>
            <button onClick={() => toggleSort('sent_at')} className="text-left hover:text-white transition-colors">
              Gönderildi{sortIndicator('sent_at')}
            </button>
            <span>Durumu</span>
            <button onClick={() => toggleSort('open_count')} className="text-left hover:text-white transition-colors">
              Açıldı{sortIndicator('open_count')}
            </button>
            <button onClick={() => toggleSort('click_count')} className="text-left hover:text-white transition-colors">
              Tıklandı{sortIndicator('click_count')}
            </button>
            <span>Yanıtlandı</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-600 text-sm">
              {emails.length === 0 ? (
                <>
                  <p className="text-3xl mb-3">✉️</p>
                  <p>Henüz gönderilmiş email yok.</p>
                </>
              ) : (
                <p>Bu filtreye uygun sonuç bulunamadı.</p>
              )}
            </div>
          ) : (
            filtered.map(row => {
              const t = row.email_tracking
              const stCls = STATUS_CLS[row.status ?? 'sent'] ?? STATUS_CLS.sent
              return (
                <div
                  key={row.id}
                  onClick={() => setDetail(row)}
                  className="grid grid-cols-[2fr_2fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#0f0f16] transition-colors cursor-pointer border-b border-[#1a1a28] last:border-b-0"
                >
                  <span className="text-sm text-white font-medium truncate">
                    {row.companies?.name ?? row.recipient_name ?? '—'}
                  </span>
                  <span className="text-xs text-accent truncate">{row.recipient_email ?? '—'}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.sent_at)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${stCls}`}>
                    Gönderildi
                  </span>
                  <span className={`text-xs tabular-nums text-center ${t?.opened ? 'text-green-400' : 'text-gray-700'}`}>
                    {t?.open_count ?? 0}x
                  </span>
                  <span className={`text-xs tabular-nums text-center ${t?.clicked ? 'text-blue-400' : 'text-gray-700'}`}>
                    {t?.click_count ?? 0}x
                  </span>
                  <span className={`text-xs text-center ${t?.reply_received ? 'text-purple-400' : 'text-gray-700'}`}>
                    {t?.reply_received ? '✓' : '—'}
                  </span>
                </div>
              )
            })
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600 flex gap-4">
              <span>{filtered.length} sonuç</span>
              <span>{filtered.filter(r => r.email_tracking?.opened).length} açıldı</span>
              <span>{filtered.filter(r => r.email_tracking?.reply_received).length} yanıtlandı</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <EmailTrackingDetail
          row={detail}
          onClose={() => setDetail(null)}
          onMarkReplied={async (id) => {
            await markReplied(id)
            setDetail(null)
          }}
          onResend={(draftId) => {
            // Navigate to main page for resend — pass draft_id via URL or state
            window.location.href = `/?resend=${draftId}`
          }}
        />
      )}
    </>
  )
}
