'use client'

import { DraftEntry } from '@/lib/types'

export type { DraftEntry }

interface Props {
  entries: DraftEntry[]
  errors: Record<number, string>
  onReview: (entry: DraftEntry, index: number) => void
  onEdit: (entry: DraftEntry) => void
  onDelete: (draftId: number) => void
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Taslak',     cls: 'bg-gray-800 text-gray-400' },
  approved: { label: 'Onaylı',     cls: 'bg-green-900/50 text-green-400' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-900/50 text-red-400' },
  sent:     { label: 'Gönderildi', cls: 'bg-blue-900/50 text-blue-400' },
}

export default function EmailDraftsList({ entries, errors, onReview, onEdit, onDelete }: Props) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-4 px-5 py-2 text-[11px] text-gray-600 uppercase tracking-wide border-b border-[#1e1e2e]">
        <span>Firma</span>
        <span>Konu</span>
        <span>Durum</span>
        <span>İşlem</span>
      </div>

      {/* Rows */}
      {entries.map((entry, idx) => {
        const { draft, company } = entry
        const st = STATUS[draft.status ?? 'draft'] ?? STATUS.draft

        return (
          <div
            key={draft.id}
            className="grid grid-cols-[1fr_2fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#0f0f16] transition-colors border-b border-[#1a1a28] last:border-b-0"
          >
            {/* Company */}
            <span className="text-sm font-medium text-white truncate">{company.name}</span>

            {/* Subject */}
            <span className="text-sm text-accent truncate">{draft.subject}</span>

            {/* Status */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${st.cls}`}>
              {st.label}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onReview(entry, idx)}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                İncele
              </button>
              <button
                onClick={() => onEdit(entry)}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                Düzenle
              </button>
              <button
                onClick={() => onDelete(draft.id)}
                className="text-xs text-red-500 hover:text-red-400 border border-red-900/30 hover:border-red-800/50 px-2.5 py-1 rounded-lg transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        )
      })}

      {/* Error rows */}
      {Object.entries(errors).map(([cid, msg]) => (
        <div key={cid} className="px-5 py-3 bg-red-950/20 border-b border-[#1a1a28]">
          <p className="text-sm text-red-400">❌ Firma {cid}: {msg}</p>
        </div>
      ))}
    </div>
  )
}
