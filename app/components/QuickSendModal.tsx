'use client'

import { useState, useEffect } from 'react'
import { Company, EmailDraft } from '@/lib/types'
import { wrapEmailWithBranding } from '@/lib/email-template'

interface Props {
  company: Company
  onClose: () => void
  onSent: () => void
}

type Stage = 'loading' | 'ready' | 'no-draft' | 'sending' | 'success' | 'error'

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

export default function QuickSendModal({ company, onClose, onSent }: Props) {
  const [stage, setStage] = useState<Stage>('loading')
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [toEmail, setToEmail] = useState(company.email ?? '')
  const [showPreview, setShowPreview] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/generate-email?companyIds=${company.id}`)
      .then(r => r.json())
      .then(data => {
        const drafts: EmailDraft[] = data.drafts ?? []
        // Prefer approved/sent, otherwise latest draft
        const best =
          drafts.find(d => d.status === 'approved') ??
          drafts.find(d => d.status === 'draft') ??
          drafts[0] ?? null
        setDraft(best)
        setStage(best ? 'ready' : 'no-draft')
      })
      .catch(() => setStage('no-draft'))
  }, [company.id])

  const handleSend = async () => {
    if (!draft) return
    setStage('sending')
    setErrorMsg('')
    try {
      // Auto-approve if still draft
      if (draft.status === 'draft') {
        await fetch('/api/generate-email', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: draft.id, status: 'approved' }),
        })
      }
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, to_email: toEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gönderme hatası')
      setStage('success')
      onSent()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Hata oluştu')
      setStage('error')
    }
  }

  const valid = isValidEmail(toEmail)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <h3 className="font-bold text-white text-sm">Email Gönder</h3>
            <p className="text-xs text-gray-600 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Loading */}
          {stage === 'loading' && (
            <div className="flex items-center gap-3 py-4">
              <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-gray-500">Taslak aranıyor...</span>
            </div>
          )}

          {/* No draft */}
          {stage === 'no-draft' && (
            <div className="py-4 text-center space-y-2">
              <p className="text-sm text-gray-400">Bu firma için henüz email taslağı yok.</p>
              <p className="text-xs text-gray-600">Önce "Email Oluştur" ile bir taslak oluşturun.</p>
            </div>
          )}

          {/* Ready / Sending / Error */}
          {(stage === 'ready' || stage === 'sending' || stage === 'error') && draft && (
            <>
              {/* Draft info */}
              <div className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-600 uppercase tracking-wide">Konu</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    draft.status === 'approved' ? 'bg-green-900/40 text-green-400' :
                    draft.status === 'sent' ? 'bg-blue-900/40 text-blue-400' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {draft.status === 'approved' ? 'Onaylı' : draft.status === 'sent' ? 'Gönderildi' : 'Taslak'}
                  </span>
                </div>
                <p className="text-sm text-white font-medium">{draft.subject || '(Konu yok)'}</p>
                <button
                  onClick={() => setShowPreview(p => !p)}
                  className="text-[11px] text-accent hover:text-white transition-colors"
                >
                  {showPreview ? '▲ Önizlemeyi Gizle' : '▼ Önizle'}
                </button>
              </div>

              {/* Preview */}
              {showPreview && (
                <iframe
                  srcDoc={wrapEmailWithBranding(draft.body_html ?? '')}
                  title="Önizleme"
                  className="w-full rounded-xl border border-[#1e1e2e]"
                  style={{ height: 280 }}
                  sandbox="allow-same-origin"
                />
              )}

              {/* To email input */}
              <div>
                <label className="block text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">
                  Alıcı Email
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  placeholder="alici@firma.com"
                  disabled={stage === 'sending'}
                  className={`w-full bg-[#0f0f16] border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                    toEmail && !valid
                      ? 'border-red-700 text-red-400'
                      : 'border-[#2a2a3e] text-white focus:border-accent'
                  }`}
                />
                {company.email && toEmail !== company.email && (
                  <button
                    onClick={() => setToEmail(company.email!)}
                    className="mt-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    ← Firmadan al: {company.email}
                  </button>
                )}
              </div>

              {/* Error */}
              {stage === 'error' && errorMsg && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
                  ❌ {errorMsg}
                </p>
              )}
            </>
          )}

          {/* Success */}
          {stage === 'success' && (
            <div className="py-6 text-center space-y-2">
              <p className="text-3xl">✅</p>
              <p className="text-sm text-white font-medium">Email gönderildi!</p>
              <p className="text-xs text-gray-500">{toEmail}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1e1e2e]">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
          >
            {stage === 'success' ? 'Kapat' : 'İptal'}
          </button>
          {(stage === 'ready' || stage === 'error') && draft && (
            <button
              onClick={handleSend}
              disabled={!valid}
              className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              ✉️ Gönder
            </button>
          )}
          {stage === 'sending' && (
            <span className="text-sm text-accent flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Gönderiliyor...
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
