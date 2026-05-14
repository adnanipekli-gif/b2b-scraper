'use client'

import { useState } from 'react'
import useSWR from 'swr'

interface SentEmailRow {
  id: number
  company_id: number
  draft_id?: number
  gmail_message_id?: string
  recipient_email?: string
  recipient_name?: string
  subject?: string
  sent_at: string
  status?: 'sent' | 'bounced' | 'spam'
  created_at: string
  companies?: { id: number; name: string; segment?: string }
  email_tracking?: {
    opened: boolean
    opened_at?: string
    open_count: number
    clicked: boolean
    clicked_at?: string
    click_count: number
    reply_received: boolean
    replied_at?: string
    last_activity?: string
  }
}

type Filter = 'all' | 'sent' | 'opened' | 'replied'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent:    { label: 'Gönderildi', cls: 'bg-blue-900/50 text-blue-400' },
  bounced: { label: 'Bounced',    cls: 'bg-red-900/50 text-red-400' },
  spam:    { label: 'Spam',       cls: 'bg-orange-900/50 text-orange-400' },
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',     label: 'Tümü' },
  { id: 'sent',    label: 'Gönderildi' },
  { id: 'opened',  label: 'Açıldı' },
  { id: 'replied', label: 'Yanıtlandı' },
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SentEmailsList() {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading, error } = useSWR('/api/sent-emails', fetcher, {
    refreshInterval: 30_000,
  })

  const rows: SentEmailRow[] = data?.sent_emails ?? []

  const filtered = rows.filter(r => {
    if (filter === 'opened') return r.email_tracking?.opened
    if (filter === 'replied') return r.email_tracking?.reply_received
    return true
  })

  if (isLoading) {
    return (
      <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-8 text-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5 text-center text-red-400 text-sm">
        Gönderilen emailler yüklenemedi
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-10 text-center text-gray-600">
        <p className="text-3xl mb-3">✉️</p>
        <p className="text-sm">Henüz gönderilmiş email yok.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
        <div>
          <h2 className="font-bold text-white text-sm">Gönderilen Emailler</h2>
          <p className="text-xs text-gray-600 mt-0.5">{rows.length} email</p>
        </div>
        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === f.id
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-gray-500 hover:text-white border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-2 text-[11px] text-gray-600 uppercase tracking-wide border-b border-[#1e1e2e]">
        <span>Firma</span>
        <span>Alıcı</span>
        <span>Gönderildi</span>
        <span>Durum</span>
        <span>Açılma</span>
        <span>Tıklama</span>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-600 text-sm">
          Bu filtreye uygun sonuç yok.
        </div>
      ) : (
        filtered.map(row => {
          const tracking = row.email_tracking
          const st = STATUS_BADGE[row.status ?? 'sent'] ?? STATUS_BADGE.sent
          const isExpanded = expanded === row.id

          return (
            <div key={row.id} className="border-b border-[#1a1a28] last:border-b-0">
              {/* Main row */}
              <div
                className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#0f0f16] transition-colors cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : row.id)}
              >
                <span className="text-sm text-white font-medium truncate">
                  {row.companies?.name ?? row.recipient_name ?? '—'}
                </span>
                <span className="text-xs text-accent truncate">
                  {row.recipient_email ?? '—'}
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {fmtDate(row.sent_at)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${st.cls}`}>
                  {st.label}
                </span>
                <span className={`text-xs tabular-nums ${tracking?.opened ? 'text-green-400' : 'text-gray-700'}`}>
                  {tracking?.open_count ?? 0}x
                </span>
                <span className={`text-xs tabular-nums ${tracking?.clicked ? 'text-green-400' : 'text-gray-700'}`}>
                  {tracking?.click_count ?? 0}x
                </span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-4 bg-[#0a0a0d] border-t border-[#1e1e2e]">
                  <div className="pt-3 space-y-1.5 text-xs">
                    <div className="flex gap-3">
                      <span className="text-gray-600 w-24">Konu</span>
                      <span className="text-gray-300">{row.subject ?? '—'}</span>
                    </div>
                    {row.gmail_message_id && (
                      <div className="flex gap-3">
                        <span className="text-gray-600 w-24">Message-ID</span>
                        <span className="text-gray-600 font-mono text-[11px] break-all">{row.gmail_message_id}</span>
                      </div>
                    )}
                    {tracking?.opened && tracking.opened_at && (
                      <div className="flex gap-3">
                        <span className="text-gray-600 w-24">İlk açılma</span>
                        <span className="text-gray-300">{fmtDate(tracking.opened_at!)}</span>
                      </div>
                    )}
                    {tracking?.reply_received && (
                      <div className="flex gap-3">
                        <span className="text-gray-600 w-24">Yanıt</span>
                        <span className="text-green-400">✓ Yanıt alındı</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Summary footer */}
      <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600 flex gap-4">
        <span>{rows.filter(r => r.email_tracking?.opened).length} açıldı</span>
        <span>{rows.filter(r => r.email_tracking?.reply_received).length} yanıtlandı</span>
        <span>{rows.filter(r => r.status === 'bounced').length} bounced</span>
      </div>
    </div>
  )
}
