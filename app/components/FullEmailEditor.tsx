'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { EmailDraft } from '@/lib/types'
import { DraftEntry } from '@/lib/types'

interface Props {
  entry: DraftEntry
  onClose: () => void
  onSave: (draft: EmailDraft) => void
}

export default function FullEmailEditor({ entry, onClose, onSave }: Props) {
  const [subject, setSubject] = useState(entry.draft.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(entry.draft.body_html ?? '')
  const [bodyPlain, setBodyPlain] = useState(entry.draft.body_plain ?? '')
  const [bodyTab, setBodyTab] = useState<'html' | 'plain'>('html')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (fields?: { subject: string; bodyHtml: string; bodyPlain: string }) => {
    const s = fields?.subject ?? subject
    const h = fields?.bodyHtml ?? bodyHtml
    const p = fields?.bodyPlain ?? bodyPlain
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/generate-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: entry.draft.id,
          subject: s,
          body_html: h,
          body_plain: p,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDirty(false)
      setLastSaved(new Date())
      return data.draft as EmailDraft
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası')
      return null
    } finally {
      setSaving(false)
    }
  }, [entry.draft.id, subject, bodyHtml, bodyPlain])

  // Autosave after 3 seconds of inactivity
  useEffect(() => {
    if (!dirty) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => save(), 3000)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [dirty, subject, bodyHtml, bodyPlain, save])

  const markDirty = () => setDirty(true)

  const handleSaveAndReturn = async () => {
    const draft = await save()
    if (draft) {
      onSave(draft)
      onClose()
    }
  }

  const handleDiscard = () => {
    if (dirty) {
      if (!confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) return
    }
    onClose()
  }

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <h3 className="font-bold text-white text-sm">Email Düzenle</h3>
            <p className="text-xs text-gray-600 mt-0.5">{entry.company.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            <div className="text-[11px] text-gray-600">
              {saving && <span className="text-yellow-500">Kaydediliyor...</span>}
              {!saving && dirty && <span className="text-gray-500">Kaydedilmemiş değişiklikler</span>}
              {!saving && !dirty && lastSaved && (
                <span className="text-green-600">✓ {fmtTime(lastSaved)}&apos;de kaydedildi</span>
              )}
            </div>
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
              onClick={handleDiscard}
              className="text-gray-600 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main area */}
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
                onChange={e => { setSubject(e.target.value); markDirty() }}
                className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Body with tabs */}
            <div>
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
                  onChange={e => { setBodyHtml(e.target.value); markDirty() }}
                  rows={showPreview ? 20 : 16}
                  className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="<p>HTML içerik...</p>"
                  spellCheck={false}
                />
              ) : (
                <textarea
                  value={bodyPlain}
                  onChange={e => { setBodyPlain(e.target.value); markDirty() }}
                  rows={showPreview ? 20 : 16}
                  className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="Düz metin içerik..."
                />
              )}
            </div>
          </div>

          {/* Preview panel */}
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
                style={{ minHeight: 400 }}
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
            onClick={handleDiscard}
            className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSaveAndReturn}
            disabled={saving}
            className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor...' : '💾 Kaydet & Geri Dön'}
          </button>
        </div>

      </div>
    </div>
  )
}
