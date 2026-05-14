'use client'

import { useState } from 'react'
import { Company, EmailDraft, DraftEntry } from '@/lib/types'
import { useEmailDraft } from '@/app/hooks/useEmailDraft'
import EmailDraftsList from './EmailDraftsList'
import EmailApprovalModal from './EmailApprovalModal'
import FullEmailEditor from './FullEmailEditor'

interface Props {
  companyIds: number[]
  companies: Company[]
  onClose: () => void
}

export default function EmailGenerator({ companyIds, companies, onClose }: Props) {
  const [generating, setGenerating] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [genErrors, setGenErrors] = useState<Record<number, string>>({})
  const [approvalEntry, setApprovalEntry] = useState<DraftEntry | null>(null)
  const [approvalIndex, setApprovalIndex] = useState(0)
  const [editingEntry, setEditingEntry] = useState<DraftEntry | null>(null)

  const {
    drafts,
    addDraft,
    updateDraft,
    approveDraft,
    rejectDraft,
    deleteDraft,
  } = useEmailDraft()

  const selected = companyIds
    .map(id => companies.find(c => c.id === id))
    .filter(Boolean) as Company[]

  const generate = async () => {
    setGenerating(true)
    setGenErrors({})

    for (let i = 0; i < selected.length; i++) {
      const company = selected[i]
      setCurrentIdx(i)
      const tone = company.segment === 'soguk_depo' ? 'teknik' : 'profesyonel'

      try {
        const res = await fetch('/api/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: company.id, tone }),
          signal: AbortSignal.timeout(30_000),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Email oluşturulamadı')
        addDraft({ draft: data.draft as EmailDraft, company })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
        setGenErrors(prev => ({ ...prev, [company.id]: msg }))
      }
    }

    setGenerating(false)
    setCurrentIdx(-1)
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
    // Keep modal open with refreshed entry
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
    // If approval modal is open for this draft, refresh it
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
          <div>
            <h2 className="font-bold text-white text-sm">Email Oluşturucu</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {selected.length} firma · Claude AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!generating && drafts.length === 0 && (
              <button
                onClick={generate}
                className="inline-flex items-center gap-2 bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                ✉️ Email Oluştur
              </button>
            )}
            {!generating && drafts.length > 0 && (
              <button
                onClick={generate}
                className="text-xs text-gray-400 hover:text-white border border-[#2a2a3e] px-3 py-1.5 rounded-lg transition-colors"
              >
                ↺ Yeniden Oluştur
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

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
        {!generating && drafts.length === 0 && Object.keys(genErrors).length === 0 && (
          <div className="px-5 py-12 text-center text-gray-600">
            <p className="text-3xl mb-3">✉️</p>
            <p className="text-sm">
              {selected.length} firma için kişiselleştirilmiş email üretmek üzere butona tıklayın.
            </p>
            <p className="text-xs text-gray-700 mt-1">
              Her email için Claude AI yaklaşık 5-10 saniye çalışır.
            </p>
          </div>
        )}

        {/* Drafts table */}
        {(drafts.length > 0 || Object.keys(genErrors).length > 0) && (
          <EmailDraftsList
            entries={drafts}
            errors={genErrors}
            onReview={handleReview}
            onEdit={entry => setEditingEntry(entry)}
            onDelete={handleDelete}
          />
        )}

        {/* Footer counter */}
        {!generating && drafts.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1e1e2e] text-xs text-gray-600">
            {drafts.length} taslak oluşturuldu
            {Object.keys(genErrors).length > 0 &&
              ` · ${Object.keys(genErrors).length} hata`}
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
    </>
  )
}
