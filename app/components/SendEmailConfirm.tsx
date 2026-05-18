'use client'

import { useState } from 'react'
import { DraftEntry } from '@/lib/types'

interface Props {
  entry: DraftEntry
  onConfirm: (email: string) => void
  onCancel: () => void
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

export default function SendEmailConfirm({ entry, onConfirm, onCancel }: Props) {
  const { draft, company } = entry
  const [email, setEmail] = useState(company.email ?? '')

  const bodyPreview =
    draft.body_plain?.slice(0, 200) ??
    draft.body_html?.replace(/<[^>]+>/g, '').slice(0, 200) ??
    ''

  const valid = isValidEmail(email)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <h3 className="font-bold text-white text-sm">Göndermeyi Onayla</h3>
          <button onClick={onCancel} className="text-gray-600 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-gray-600 w-14 flex-shrink-0">Firma</span>
              <span className="text-sm text-white font-medium">{company.name}</span>
            </div>

            {/* Editable recipient email */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-600 w-14 flex-shrink-0 pt-2.5">Alıcı</span>
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                  className={`w-full bg-[#0f0f16] border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                    email && !valid
                      ? 'border-red-700 text-red-400 focus:border-red-600'
                      : 'border-[#2a2a3e] text-accent focus:border-accent'
                  }`}
                />
                {company.email && email !== company.email && (
                  <button
                    onClick={() => setEmail(company.email!)}
                    className="mt-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    ← Firmadan al: {company.email}
                  </button>
                )}
                {!company.email && (
                  <p className="mt-1 text-[11px] text-gray-600">Firmada kayıtlı email yok</p>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-xs text-gray-600 w-14 flex-shrink-0">Konu</span>
              <span className="text-sm text-white">{draft.subject}</span>
            </div>
          </div>

          {bodyPreview && (
            <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-1.5">Önizleme</p>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                {bodyPreview}{bodyPreview.length >= 200 ? '...' : ''}
              </p>
            </div>
          )}

          <p className="text-xs text-yellow-500/70 bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2">
            ⚠️ Bu işlem geri alınamaz. Email alıcının gelen kutusuna ulaşacak.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1e1e2e]">
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm(email.trim())}
            disabled={!valid}
            className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✉️ Gmail ile Gönder
          </button>
        </div>

      </div>
    </div>
  )
}
