'use client'

import { useState } from 'react'
import { EmailDraft } from '@/lib/types'
import { DraftEntry } from './EmailDraftsList'

interface Props {
  entry: DraftEntry
  onClose: () => void
  onSave: (draft: EmailDraft) => void
}

export default function EmailEditor({ entry, onClose, onSave }: Props) {
  const [subject, setSubject] = useState(entry.draft.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(entry.draft.body_html ?? '')
  const [bodyPlain, setBodyPlain] = useState(entry.draft.body_plain ?? '')
  const [bodyTab, setBodyTab] = useState<'html' | 'plain'>('html')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/generate-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: entry.draft.id,
          subject,
          body_html: bodyHtml,
          body_plain: bodyPlain,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <h3 className="font-bold text-white text-sm">Email Düzenle</h3>
            <p className="text-xs text-gray-600 mt-0.5">{entry.company.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(p => !p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showPreview
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-[#2a2a3e] text-gray-400 hover:text-white'
              }`}
            >
              {showPreview ? '← Editör' : 'Önizleme →'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main area — editor or split panel */}
        <div className={`flex-1 min-h-0 flex ${showPreview ? 'flex-row divide-x divide-[#1e1e2e]' : 'flex-col'}`}>

          {/* Editor panel */}
          <div className={`${showPreview ? 'w-1/2' : 'flex-1'} overflow-auto p-5 space-y-4`}>
            {/* Subject */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
                Konu
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Body with HTML/Plain tabs */}
            <div className="flex-1">
              <div className="flex border-b border-[#1e1e2e] mb-3">
                {(['html', 'plain'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setBodyTab(t)}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${
                      bodyTab === t
                        ? 'text-accent border-b-2 border-accent -mb-px'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {t === 'html' ? 'HTML' : 'Düz Metin'}
                  </button>
                ))}
              </div>

              {bodyTab === 'html' ? (
                <textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  rows={showPreview ? 18 : 14}
                  className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="<p>HTML içerik...</p>"
                  spellCheck={false}
                />
              ) : (
                <textarea
                  value={bodyPlain}
                  onChange={e => setBodyPlain(e.target.value)}
                  rows={showPreview ? 18 : 14}
                  className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="Düz metin içerik..."
                />
              )}
            </div>
          </div>

          {/* Live preview panel */}
          {showPreview && (
            <div className="w-1/2 overflow-auto p-5">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-1.5">Canlı Önizleme</p>
              <div className="mb-3 pb-3 border-b border-[#1e1e2e]">
                <p className="text-xs text-gray-500">Konu:</p>
                <p className="text-sm font-semibold text-white">{subject || '—'}</p>
              </div>
              <iframe
                srcDoc={bodyHtml || '<p style="color:#999">HTML içerik giriniz...</p>'}
                title="Canlı önizleme"
                className="w-full rounded-xl border border-[#1e1e2e] bg-white"
                style={{ minHeight: 360 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-950/30 border-t border-red-900/30">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1e1e2e]">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
          </button>
        </div>

      </div>
    </div>
  )
}
