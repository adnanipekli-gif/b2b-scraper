'use client'

import { useState } from 'react'
import { EmailDraft } from '@/lib/types'
import { DraftEntry } from './EmailDraftsList'

interface Props {
  entry: DraftEntry
  onClose: () => void
  onEdit: () => void
  onUpdate: (draft: EmailDraft) => void
}

export default function EmailPreviewModal({ entry, onClose, onEdit, onUpdate }: Props) {
  const [tab, setTab] = useState<'html' | 'plain'>('html')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { draft, company } = entry

  const patch = async (status: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate(data.draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-0.5">Alıcı</p>
            <p className="text-sm font-semibold text-white">{company.name}</p>
            {company.email && (
              <p className="text-xs text-accent mt-0.5">{company.email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-white transition-colors text-xl leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Subject */}
        <div className="px-5 py-3 bg-[#0f0f16] border-b border-[#1e1e2e]">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-0.5">Konu</p>
          <p className="text-sm font-semibold text-white">{draft.subject}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e1e2e]">
          {(['html', 'plain'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {t === 'html' ? 'HTML Görünüm' : 'Düz Metin'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {tab === 'html' ? (
            <iframe
              srcDoc={draft.body_html ?? '<p>İçerik yok</p>'}
              title="Email önizleme"
              className="w-full rounded-xl border border-[#1e1e2e] bg-white"
              style={{ minHeight: 280 }}
              sandbox="allow-same-origin"
            />
          ) : (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {draft.body_plain ?? 'İçerik yok'}
            </pre>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-950/30 border-t border-red-900/30">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e1e2e] gap-2">
          <button
            onClick={() => patch('rejected')}
            disabled={loading || draft.status === 'rejected'}
            className="text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
          >
            🗑 Sil
          </button>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              disabled={loading}
              className="text-sm text-gray-300 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              ✏️ Düzenle
            </button>
            <button
              onClick={() => patch('approved')}
              disabled={loading || draft.status === 'approved' || draft.status === 'sent'}
              className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              {loading
                ? 'Kaydediliyor...'
                : draft.status === 'approved'
                ? '✓ Onaylandı'
                : '✓ Onayla'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
