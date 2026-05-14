'use client'

import { useState } from 'react'
import { SentEmailRow } from '@/app/hooks/useEmailTracking'

interface Props {
  row: SentEmailRow
  onClose: () => void
  onMarkReplied: (id: number) => Promise<void>
  onResend: (draftId: number) => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'az önce'
  if (m < 60) return `${m} dakika önce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} saat önce`
  const d = Math.floor(h / 24)
  return `${d} gün önce`
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EmailTrackingDetail({ row, onClose, onMarkReplied, onResend }: Props) {
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState('')
  const t = row.email_tracking

  const parsedLinks: { url: string; timestamp: string }[] = (t?.links_clicked ?? [])
    .map(s => {
      try { return JSON.parse(s) } catch { return null }
    })
    .filter(Boolean)

  const handleMarkReplied = async () => {
    setMarking(true)
    setMarkError('')
    try {
      await onMarkReplied(row.id)
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <h3 className="font-bold text-white text-sm">Email Detayı</h3>
            <p className="text-xs text-gray-600 mt-0.5">{row.companies?.name ?? row.recipient_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">

          {/* Recipient info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3">
              <p className="text-gray-600 mb-1">Alıcı</p>
              <p className="text-accent">{row.recipient_email}</p>
            </div>
            <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3">
              <p className="text-gray-600 mb-1">Konu</p>
              <p className="text-white truncate">{row.subject}</p>
            </div>
          </div>

          {/* Sent */}
          <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gönderildi</span>
              <span className="text-white">{fmtDate(row.sent_at)} · {timeAgo(row.sent_at)}</span>
            </div>
            {row.gmail_message_id && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Message-ID</span>
                <span className="text-gray-700 font-mono text-[11px]">{row.gmail_message_id.slice(0, 20)}…</span>
              </div>
            )}
          </div>

          {/* Tracking stats */}
          <div className="grid grid-cols-3 gap-3">
            {/* Opens */}
            <div className={`border rounded-xl p-4 text-center ${t?.opened ? 'border-green-800/60 bg-green-950/20' : 'border-[#1e1e2e] bg-[#0a0a0f]'}`}>
              <p className={`text-2xl font-bold ${t?.opened ? 'text-green-400' : 'text-gray-700'}`}>
                {t?.open_count ?? 0}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">Açılma</p>
              {t?.opened_at && (
                <p className="text-[10px] text-gray-700 mt-1">{fmtDate(t.opened_at)}</p>
              )}
            </div>
            {/* Clicks */}
            <div className={`border rounded-xl p-4 text-center ${t?.clicked ? 'border-blue-800/60 bg-blue-950/20' : 'border-[#1e1e2e] bg-[#0a0a0f]'}`}>
              <p className={`text-2xl font-bold ${t?.clicked ? 'text-blue-400' : 'text-gray-700'}`}>
                {t?.click_count ?? 0}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">Tıklama</p>
              {t?.clicked_at && (
                <p className="text-[10px] text-gray-700 mt-1">{fmtDate(t.clicked_at)}</p>
              )}
            </div>
            {/* Replies */}
            <div className={`border rounded-xl p-4 text-center ${t?.reply_received ? 'border-purple-800/60 bg-purple-950/20' : 'border-[#1e1e2e] bg-[#0a0a0f]'}`}>
              <p className={`text-2xl font-bold ${t?.reply_received ? 'text-purple-400' : 'text-gray-700'}`}>
                {t?.reply_received ? '✓' : '—'}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">Yanıt</p>
              {t?.replied_at && (
                <p className="text-[10px] text-gray-700 mt-1">{fmtDate(t.replied_at)}</p>
              )}
            </div>
          </div>

          {/* Clicked links */}
          {parsedLinks.length > 0 && (
            <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-4">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">Tıklanan Linkler</p>
              <div className="space-y-2">
                {parsedLinks.map((l, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-blue-400 break-all">{l.url}</span>
                    <span className="text-gray-700 whitespace-nowrap flex-shrink-0">{fmtDate(l.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last activity */}
          {t?.last_activity && (
            <p className="text-xs text-gray-700">
              Son aktivite: {timeAgo(t.last_activity)}
            </p>
          )}

          {markError && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
              {markError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e1e2e]">
          <div className="flex gap-2">
            {row.draft_id && (
              <button
                onClick={() => { onResend(row.draft_id!); onClose() }}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-3 py-1.5 rounded-lg transition-colors"
              >
                ↺ Yeniden Gönder
              </button>
            )}
            {!t?.reply_received && (
              <button
                onClick={handleMarkReplied}
                disabled={marking}
                className="text-xs text-purple-400 hover:text-purple-300 border border-purple-900/40 hover:border-purple-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {marking ? 'Kaydediliyor...' : '✓ Yanıt Olarak İşaretle'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  )
}
