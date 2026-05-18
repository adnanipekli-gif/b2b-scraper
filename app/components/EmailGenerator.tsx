'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Company, EmailDraft, DraftEntry } from '@/lib/types'
import { useEmailDraft, SendResult } from '@/app/hooks/useEmailDraft'
import EmailDraftsList from './EmailDraftsList'
import EmailApprovalModal from './EmailApprovalModal'
import FullEmailEditor from './FullEmailEditor'
import SendEmailConfirm from './SendEmailConfirm'
import SendingStatus from './SendingStatus'

interface Props {
  companyIds: number[]
  companies: Company[]
  onClose: () => void
  onEmailSent?: (companyId: number) => void
}

type SendStage = 'confirm' | 'sending' | 'success' | 'error'

export default function EmailGenerator({ companyIds, companies, onClose, onEmailSent }: Props) {
  const [generating, setGenerating] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [genErrors, setGenErrors] = useState<Record<number, string>>({})
  const [approvalEntry, setApprovalEntry] = useState<DraftEntry | null>(null)
  const [approvalIndex, setApprovalIndex] = useState(0)
  const [editingEntry, setEditingEntry] = useState<DraftEntry | null>(null)

  // Inline send flow
  const [sendingEntry, setSendingEntry] = useState<DraftEntry | null>(null)
  const [sendStage, setSendStage] = useState<SendStage>('confirm')
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState('')

  const {
    drafts,
    loading: draftsLoading,
    addDraft,
    clearDrafts,
    updateDraft,
    approveDraft,
    rejectDraft,
    deleteDraft,
    sendDraft,
    loadDrafts,
    sentCount,
  } = useEmailDraft()

  const selected = companyIds
    .map(id => companies.find(c => c.id === id))
    .filter(Boolean) as Company[]

  useEffect(() => {
    if (companyIds.length > 0 && companies.length > 0) {
      loadDrafts(companyIds, companies)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const writeManually = async () => {
    const existingIds = new Set(drafts.map(e => e.company.id))
    const targets = selected.filter(c => !existingIds.has(c.id))

    if (targets.length === 0) {
      setEditingEntry(drafts[0])
      return
    }

    setGenerating(true)
    setGenErrors({})

    const created: Array<{ draft: EmailDraft; company: Company }> = []

    for (let i = 0; i < targets.length; i++) {
      const company = targets[i]
      setCurrentIdx(i)
      try {
        const res = await fetch('/api/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: company.id, manual: true }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Taslak oluşturulamadı')
        const entry = { draft: data.draft as EmailDraft, company }
        addDraft(entry)
        created.push(entry)
      } catch (err) {
        setGenErrors(prev => ({ ...prev, [company.id]: err instanceof Error ? err.message : 'Hata' }))
      }
    }

    setGenerating(false)
    setCurrentIdx(-1)

    if (created.length === 1) setEditingEntry(created[0])
  }

  const generate = async () => {
    if (drafts.length > 0 && !confirm('Mevcut taslaklar silinecek. Devam edilsin mi?')) return
    clearDrafts()
    setGenerating(true)
    setGenErrors({})

    for (let i = 0; i < selected.length; i++) {
      const company = selected[i]
      setCurrentIdx(i)

      try {
        const res = await fetch('/api/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: company.id }),
          signal: AbortSignal.timeout(35_000),
        })
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After') ?? '60'
          throw new Error(`Hız limiti aşıldı. ${retryAfter}sn bekleyin.`)
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Email oluşturulamadı')
        addDraft({ draft: data.draft as EmailDraft, company })
      } catch (err) {
        let msg = 'Bilinmeyen hata'
        if (err instanceof DOMException && err.name === 'TimeoutError') {
          msg = 'Zaman aşımı — AI 35sn içinde yanıt vermedi'
        } else if (err instanceof TypeError && err.message.includes('fetch')) {
          msg = 'Bağlantı hatası — internet bağlantınızı kontrol edin'
        } else if (err instanceof Error) {
          msg = err.message
        }
        setGenErrors(prev => ({ ...prev, [company.id]: msg }))
      }
    }

    setGenerating(false)
    setCurrentIdx(-1)
  }

  const handleSend = useCallback(async (draftId: number, toEmail?: string) => {
    const result = await sendDraft(draftId, toEmail)
    const entry = drafts.find(e => e.draft.id === draftId)
    if (entry) onEmailSent?.(entry.company.id)
    return result
  }, [drafts, sendDraft, onEmailSent])

  // Inline send from drafts list
  const handleDirectSend = (entry: DraftEntry) => {
    setSendingEntry(entry)
    setSendStage('confirm')
    setSendResult(null)
    setSendError('')
  }

  const handleSendConfirmed = async (toEmail: string) => {
    if (!sendingEntry) return
    setSendStage('sending')
    setSendError('')
    try {
      if (sendingEntry.draft.status === 'draft') {
        await approveDraft(sendingEntry.draft.id)
      }
      const result = await handleSend(sendingEntry.draft.id, toEmail)
      setSendResult(result)
      setSendStage('success')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Gönderme hatası')
      setSendStage('error')
    }
  }

  const handleAfterSend = () => {
    setSendingEntry(null)
    setSendResult(null)
    setSendError('')
  }

  const handleReview = (entry: DraftEntry, index: number) => {
    setApprovalEntry(entry)
    setApprovalIndex(index)
  }

  const handleApprovalNext = () => {
    const next = approvalIndex + 1
    if (next < drafts.length) {
      setApprovalEntry(drafts[next])
      setApprovalIndex(next)
    } else {
      setApprovalEntry(null)
    }
  }

  const handleApprovalPrev = () => {
    const prev = approvalIndex - 1
    if (prev >= 0) {
      setApprovalEntry(drafts[prev])
      setApprovalIndex(prev)
    }
  }

  const handleApprove = async (draftId: number) => {
    await approveDraft(draftId)
    const updated = drafts.find(e => e.draft.id === draftId)
    if (updated) setApprovalEntry({ ...updated, draft: { ...updated.draft, status: 'approved' } })
  }

  const handleReject = async (draftId: number) => {
    await rejectDraft(draftId)
  }

  const handleDelete = async (draftId: number) => {
    if (!confirm('Bu taslağı silmek istediğinize emin misiniz?')) return
    await deleteDraft(draftId)
    if (approvalEntry?.draft.id === draftId) setApprovalEntry(null)
  }

  const handleEditorSave = (updated: EmailDraft) => {
    updateDraft(updated.id, {
      subject: updated.subject,
      body_html: updated.body_html,
      body_plain: updated.body_plain,
    })
    if (approvalEntry?.draft.id === updated.id) {
      setApprovalEntry(prev => prev ? { ...prev, draft: updated } : null)
    }
  }

  const doneCount = drafts.length + Object.keys(genErrors).length
  const progress = selected.length > 0 ? (doneCount / selected.length) * 100 : 0
  const currentCompany = currentIdx >= 0 ? selected[currentIdx] : null

  return (
    <>
      <div className="bg-surface border border-[#1e1e2e] rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-[#1a1a2e]"
            >
              ← Firmalara Dön
            </button>
            <div className="h-4 w-px bg-[#2a2a3e]" />
            <div>
              <h2 className="font-bold text-white text-sm">Email Oluşturucu</h2>
              <p className="text-xs text-gray-600 mt-0.5">{selected.length} firma seçildi</p>
            </div>
          </div>
          {!generating && !draftsLoading && (
            <div className="flex items-center gap-2">
              <button
                onClick={writeManually}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] px-3 py-1.5 rounded-lg transition-colors"
              >
                ✏️ Kendin Yaz
              </button>
              <button
                onClick={generate}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] px-3 py-1.5 rounded-lg transition-colors"
              >
                ✨ AI ile Oluştur
              </button>
            </div>
          )}
        </div>

        {/* Loading existing drafts */}
        {draftsLoading && (
          <div className="flex items-center justify-center gap-3 px-5 py-8">
            <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Taslaklar yükleniyor...</span>
          </div>
        )}

        {/* Generation progress */}
        {generating && (
          <div className="px-5 py-4 border-b border-[#1e1e2e] bg-[#0f0f16]">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm text-white">
                  {currentCompany
                    ? `${currentCompany.name} için email yazılıyor...`
                    : 'Hazırlanıyor...'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {doneCount} / {selected.length} tamamlandı
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700"
                style={{ width: `${Math.max(progress, 3)}%` }}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!draftsLoading && !generating && drafts.length === 0 && Object.keys(genErrors).length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-3xl mb-3">✉️</p>
            <p className="text-sm text-gray-500 mb-6">
              {selected.length} firma için email hazırlayın
            </p>
            <div className="flex items-stretch justify-center gap-3 max-w-sm mx-auto">
              <button
                onClick={generate}
                className="flex-1 flex flex-col items-center gap-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/60 text-accent rounded-xl px-4 py-5 transition-colors"
              >
                <span className="text-2xl">✨</span>
                <span className="text-sm font-semibold">AI ile Oluştur</span>
                <span className="text-xs text-accent/60 leading-snug">Claude AI firma bilgilerine göre kişiselleştirilmiş email yazar</span>
              </button>
              <button
                onClick={writeManually}
                className="flex-1 flex flex-col items-center gap-2 bg-[#1a1a2e] hover:bg-[#1e1e38] border border-[#2a2a3e] hover:border-[#3a3a5e] text-gray-300 hover:text-white rounded-xl px-4 py-5 transition-colors"
              >
                <span className="text-2xl">✏️</span>
                <span className="text-sm font-semibold">Kendin Yaz</span>
                <span className="text-xs text-gray-600 leading-snug">Boş taslak oluşturulur, emaili kendiniz yazarsınız</span>
              </button>
            </div>
          </div>
        )}

        {/* Drafts list */}
        {!draftsLoading && (drafts.length > 0 || Object.keys(genErrors).length > 0) && (
          <EmailDraftsList
            entries={drafts}
            errors={genErrors}
            onReview={handleReview}
            onEdit={entry => setEditingEntry(entry)}
            onDelete={handleDelete}
            onSend={handleDirectSend}
          />
        )}

        {/* Footer counter */}
        {!generating && drafts.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600 flex gap-4">
            <span>{drafts.length} taslak</span>
            {sentCount > 0 && <span className="text-blue-400">{sentCount} gönderildi</span>}
            {Object.keys(genErrors).length > 0 && (
              <span className="text-red-500">{Object.keys(genErrors).length} hata</span>
            )}
          </div>
        )}
      </div>

      {/* Approval modal */}
      {approvalEntry && (
        <EmailApprovalModal
          entry={approvalEntry}
          currentIndex={approvalIndex}
          totalCount={drafts.length}
          onClose={() => setApprovalEntry(null)}
          onEdit={entry => { setEditingEntry(entry); setApprovalEntry(null) }}
          onApprove={handleApprove}
          onReject={handleReject}
          onSend={handleSend}
          onNext={handleApprovalNext}
          onPrevious={handleApprovalPrev}
        />
      )}

      {/* Full editor */}
      {editingEntry && (
        <FullEmailEditor
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={updated => { handleEditorSave(updated); setEditingEntry(null) }}
        />
      )}

      {/* Inline send — confirm */}
      {sendingEntry && sendStage === 'confirm' && (
        <SendEmailConfirm
          entry={sendingEntry}
          onConfirm={handleSendConfirmed}
          onCancel={() => setSendingEntry(null)}
        />
      )}

      {/* Inline send — sending / success / error */}
      {sendingEntry && (sendStage === 'sending' || sendStage === 'success' || sendStage === 'error') && (
        <SendingStatus
          company={sendingEntry.company}
          status={sendStage}
          messageId={sendResult?.messageId}
          error={sendError}
          onNext={handleAfterSend}
          onRetry={sendStage === 'error' ? () => setSendStage('confirm') : undefined}
        />
      )}
    </>
  )
}
