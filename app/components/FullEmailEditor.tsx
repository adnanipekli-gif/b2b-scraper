'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { EmailDraft, DraftEntry } from '@/lib/types'
import { wrapEmailWithBranding } from '@/lib/email-template'

interface Props {
  entry: DraftEntry
  onClose: () => void
  onSave: (draft: EmailDraft) => void
}

export default function FullEmailEditor({ entry, onClose, onSave }: Props) {
  const [subject, setSubject] = useState(entry.draft.subject ?? '')
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState(entry.draft.body_html ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const editorRef = useRef<HTMLDivElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = entry.draft.body_html ?? ''
    }
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(async () => {
    const html = editorRef.current?.innerHTML ?? ''
    const plain = editorRef.current?.innerText ?? ''
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/generate-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: entry.draft.id, subject, body_html: html, body_plain: plain }),
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
  }, [entry.draft.id, subject])

  const scheduleAutosave = useCallback(() => {
    setDirty(true)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => save(), 3000)
  }, [save])

  const handleEditorInput = () => {
    scheduleAutosave()
    if (showPreview && editorRef.current) setPreviewHtml(editorRef.current.innerHTML)
  }

  const format = (cmd: string) => {
    document.execCommand(cmd, false)
    editorRef.current?.focus()
    scheduleAutosave()
  }

  const handleSaveAndReturn = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    const draft = await save()
    if (draft) { onSave(draft); onClose() }
  }

  const handleDiscard = () => {
    if (dirty && !confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) return
    onClose()
  }

  const handlePreviewToggle = () => {
    if (!showPreview && editorRef.current) setPreviewHtml(editorRef.current.innerHTML)
    setShowPreview(p => !p)
  }

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div>
            <h3 className="font-bold text-white text-sm">Email Düzenle</h3>
            <p className="text-xs text-gray-600 mt-0.5">{entry.company.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px]">
              {saving && <span className="text-yellow-500">Kaydediliyor...</span>}
              {!saving && dirty && <span className="text-gray-500">Kaydedilmemiş değişiklikler</span>}
              {!saving && !dirty && lastSaved && (
                <span className="text-green-600">✓ {fmtTime(lastSaved)}&apos;de kaydedildi</span>
              )}
            </div>
            <button
              onClick={handlePreviewToggle}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showPreview ? 'border-accent text-accent bg-accent/10' : 'border-[#2a2a3e] text-gray-400 hover:text-white'
              }`}
            >
              {showPreview ? '← Editör' : 'Önizleme →'}
            </button>
            <button onClick={handleDiscard} className="text-gray-600 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 flex overflow-hidden ${showPreview ? 'divide-x divide-[#1e1e2e]' : 'flex-col'}`}>

          {/* Editor column */}
          <div className={`${showPreview ? 'w-1/2' : 'flex-1'} flex flex-col min-h-0`}>

            {/* Subject field */}
            <div className="px-5 pt-4 pb-3 border-b border-[#1e1e2e]">
              <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-wide font-medium">
                Konu Satırı
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => { setSubject(e.target.value); scheduleAutosave() }}
                className="w-full bg-[#0f0f16] border border-[#2a2a3e] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder-gray-700"
                placeholder="Email konusu..."
              />
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[#1e1e2e] bg-[#0c0c10]">
              <span className="text-[10px] text-gray-600 uppercase tracking-wide mr-2 select-none">Biçim</span>
              <button
                onMouseDown={e => { e.preventDefault(); format('bold') }}
                title="Kalın (Ctrl+B)"
                className="w-7 h-7 flex items-center justify-center rounded font-bold text-gray-400 hover:text-white hover:bg-[#1e1e2e] transition-colors text-sm"
              >B</button>
              <button
                onMouseDown={e => { e.preventDefault(); format('italic') }}
                title="İtalik (Ctrl+I)"
                className="w-7 h-7 flex items-center justify-center rounded italic text-gray-400 hover:text-white hover:bg-[#1e1e2e] transition-colors text-sm"
              >İ</button>
              <button
                onMouseDown={e => { e.preventDefault(); format('underline') }}
                title="Altı Çizili (Ctrl+U)"
                className="w-7 h-7 flex items-center justify-center rounded underline text-gray-400 hover:text-white hover:bg-[#1e1e2e] transition-colors text-sm"
              >A</button>
              <div className="w-px h-4 bg-[#2a2a3e] mx-1.5" />
              <button
                onMouseDown={e => { e.preventDefault(); document.execCommand('undo'); editorRef.current?.focus() }}
                title="Geri Al (Ctrl+Z)"
                className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#1e1e2e] transition-colors text-base"
              >↩</button>
            </div>

            {/* WYSIWYG editable area */}
            <div
              className="flex-1 overflow-auto px-5 py-4 cursor-text"
              onClick={() => editorRef.current?.focus()}
            >
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                className="min-h-56 text-sm text-gray-200 leading-relaxed focus:outline-none [&>p]:mb-3 [&>p:last-child]:mb-0 [&>div]:mb-3"
              />
            </div>
          </div>

          {/* Preview column */}
          {showPreview && (
            <div className="w-1/2 overflow-auto p-5">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">Önizleme</p>
              <div className="mb-3 pb-3 border-b border-[#1e1e2e]">
                <p className="text-[11px] text-gray-600 mb-0.5">Konu</p>
                <p className="text-sm font-semibold text-white">{subject || '—'}</p>
              </div>
              <iframe
                srcDoc={previewHtml
                  ? wrapEmailWithBranding(previewHtml)
                  : '<p style="color:#999;font-family:sans-serif;padding:24px">İçerik giriniz...</p>'}
                title="Email önizleme"
                className="w-full rounded-xl border border-[#1e1e2e]"
                style={{ minHeight: 420 }}
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
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e1e2e]">
          <p className="text-xs text-gray-700">Değişiklikler otomatik kaydedilir</p>
          <div className="flex items-center gap-2">
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
              {saving ? 'Kaydediliyor...' : 'Kaydet & Kapat'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
