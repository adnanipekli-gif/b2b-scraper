'use client'

import { Company, EmailDraft } from '@/lib/types'

export interface DraftEntry {
  draft: EmailDraft
  company: Company
}

interface Props {
  entries: DraftEntry[]
  errors: Record<number, string>
  onView: (entry: DraftEntry) => void
  onEdit: (entry: DraftEntry) => void
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Taslak',     cls: 'bg-gray-800 text-gray-400' },
  approved: { label: 'Onaylı',     cls: 'bg-green-900/50 text-green-400' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-900/50 text-red-400' },
  sent:     { label: 'Gönderildi', cls: 'bg-blue-900/50 text-blue-400' },
}

export default function EmailDraftsList({ entries, errors, onView, onEdit }: Props) {
  return (
    <div className="divide-y divide-[#1a1a28]">
      {entries.map(entry => {
        const { draft, company } = entry
        const st = STATUS[draft.status ?? 'draft'] ?? STATUS.draft
        const preview =
          draft.body_plain?.slice(0, 130) ??
          draft.body_html?.replace(/<[^>]+>/g, '').slice(0, 130)

        return (
          <div
            key={draft.id}
            className="px-5 py-4 hover:bg-[#0f0f16] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Firm + status */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm truncate">
                    {company.name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                {/* Subject */}
                <p className="text-sm text-accent font-medium truncate">{draft.subject}</p>
                {/* Preview */}
                {preview && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {preview}…
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onView(entry)}
                  className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2.5 py-1 rounded-lg transition-colors"
                >
                  Görüntüle
                </button>
                <button
                  onClick={() => onEdit(entry)}
                  className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-2.5 py-1 rounded-lg transition-colors"
                >
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Error rows */}
      {Object.entries(errors).map(([cid, msg]) => (
        <div key={cid} className="px-5 py-3 bg-red-950/20">
          <p className="text-sm text-red-400">❌ Firma {cid}: {msg}</p>
        </div>
      ))}
    </div>
  )
}
