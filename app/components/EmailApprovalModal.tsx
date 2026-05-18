'use client'

import { useState } from 'react'
import { DraftEntry } from '@/lib/types'
import { SendResult } from '@/app/hooks/useEmailDraft'
import { wrapEmailWithBranding } from '@/lib/email-template'
import SendEmailConfirm from './SendEmailConfirm'
import SendingStatus from './SendingStatus'

interface Props {
  entry: DraftEntry
  currentIndex: number
  totalCount: number
  onClose: () => void
  onEdit: (entry: DraftEntry) => void
  onApprove: (draftId: number) => Promise<void>
  onReject: (draftId: number) => Promise<void>
  onSend: (draftId: number, toEmail?: string) => Promise<SendResult>
  onNext: () => void
  onPrevious: () => void
}

const GROWTH_LABELS: Record<string, { label: string; cls: string }> = {
  expanding: { label: 'Büyüyor', cls: 'bg-green-900/40 text-green-400' },
  stable:    { label: 'Stabil',  cls: 'bg-yellow-900/40 text-yellow-400' },
  unknown:   { label: 'Belirsiz', cls: 'bg-gray-800 text-gray-500' },
}

function fmtFollowers(n?: number): string {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

type SendStage = 'none' | 'confirm' | 'sending' | 'success' | 'error'

export default function EmailApprovalModal({
  entry,
  currentIndex,
  totalCount,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onSend,
  onNext,
  onPrevious,
}: Props) {
  const [tab, setTab] = useState<'html' | 'plain'>('html')
  const [actioning, setActioning] = useState<'approve' | 'reject' | null>(null)
  const [actionError, setActionError] = useState('')
  const [sendStage, setSendStage] = useState<SendStage>('none')
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState('')

  // entry may update as parent refreshes it
  const { draft, company } = entry

  const handleApprove = async () => {
    setActioning('approve')
    setActionError('')
    try {
      await onApprove(draft.id)
      if (currentIndex < totalCount - 1) onNext()
      else onClose()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setActioning(null)
    }
  }

  const handleReject = async () => {
    setActioning('reject')
    setActionError('')
    try {
      await onReject(draft.id)
      if (currentIndex < totalCount - 1) onNext()
      else onClose()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setActioning(null)
    }
  }

  const handleApproveAndSend = async () => {
    // Approve first if not already approved
    if (draft.status === 'draft') {
      setActioning('approve')
      setActionError('')
      try {
        await onApprove(draft.id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Onaylama hatası')
        setActioning(null)
        return
      }
      setActioning(null)
    }
    setSendStage('confirm')
  }

  const handleSendConfirmed = async (toEmail: string) => {
    setSendStage('sending')
    setSendError('')
    try {
      const result = await onSend(draft.id, toEmail)
      setSendResult(result)
      setSendStage('success')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Gönderme hatası')
      setSendStage('error')
    }
  }

  const handleAfterSend = () => {
    setSendStage('none')
    setSendResult(null)
    if (currentIndex < totalCount - 1) onNext()
    else onClose()
  }

  const growth = company.growth_signal ? GROWTH_LABELS[company.growth_signal] : null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">

          {/* Header — navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
            <h3 className="font-bold text-white text-sm">Email İnceleme</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2a3e] text-gray-400 hover:text-white disabled:opacity-25 transition-colors text-xs"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-500 px-2 tabular-nums">
                  {currentIndex + 1} / {totalCount}
                </span>
                <button
                  onClick={onNext}
                  disabled={currentIndex === totalCount - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2a3e] text-gray-400 hover:text-white disabled:opacity-25 transition-colors text-xs"
                >
                  ›
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body — split panel */}
          <div className="flex-1 min-h-0 flex divide-x divide-[#1e1e2e] overflow-hidden">

            {/* Left — company info */}
            <div className="w-64 flex-shrink-0 overflow-auto p-5 space-y-4">
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-1">Firma</p>
                <p className="font-semibold text-white text-sm">{company.name}</p>
                {company.segment && (
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {company.segment === 'yerel_zincir' ? 'Yerel Zincir' : 'Soğuk Depo'}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                {company.city && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-px">📍</span>
                    <span className="text-xs text-gray-400">{company.city}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-px">📱</span>
                    <span className="text-xs text-gray-400 break-all">{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-px">✉️</span>
                    <span className="text-xs text-accent break-all">{company.email}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-px">🌐</span>
                    <span className="text-xs text-gray-400 break-all">{company.website}</span>
                  </div>
                )}
                {company.instagram_handle && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-px">📷</span>
                    <div>
                      <span className="text-xs text-gray-400">@{company.instagram_handle}</span>
                      {company.instagram_followers && (
                        <span className="text-[11px] text-gray-600 ml-1">
                          {fmtFollowers(company.instagram_followers)} takipçi
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {(company.design_score || company.branches || growth || company.google_maps_rating) && (
                <div className="space-y-2 pt-3 border-t border-[#1e1e2e]">
                  {company.branches && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🏪</span>
                      <span className="text-xs text-gray-400">{company.branches} şube</span>
                    </div>
                  )}
                  {company.design_score && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎯</span>
                      <span className="text-xs text-gray-400">Tasarım {company.design_score}/5</span>
                    </div>
                  )}
                  {growth && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📈</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${growth.cls}`}>
                        {growth.label}
                      </span>
                    </div>
                  )}
                  {company.google_maps_rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⭐</span>
                      <span className="text-xs text-gray-400">
                        {company.google_maps_rating}/5
                        {company.google_maps_reviews
                          ? ` (${company.google_maps_reviews} yorum)`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right — email content */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

              {/* Subject */}
              <div className="px-5 py-3 bg-[#0f0f16] border-b border-[#1e1e2e]">
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-0.5">Konu</p>
                <p className="text-sm font-semibold text-white">{draft.subject}</p>
              </div>

              {/* Status badge */}
              {draft.status !== 'draft' && (
                <div className="px-5 py-2 border-b border-[#1e1e2e]">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    draft.status === 'approved'
                      ? 'bg-green-900/40 text-green-400'
                      : draft.status === 'sent'
                      ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}>
                    {draft.status === 'approved' ? '✓ Onaylandı'
                      : draft.status === 'sent' ? '✉ Gönderildi'
                      : '✕ Reddedildi'}
                  </span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-[#1e1e2e] px-5">
                {(['html', 'plain'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`py-2.5 mr-4 text-xs font-medium transition-colors ${
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
              <div className="flex-1 overflow-auto p-5">
                {tab === 'html' ? (
                  <iframe
                    srcDoc={wrapEmailWithBranding(draft.body_html ?? '')}
                    title="Email önizleme"
                    className="w-full rounded-xl border border-[#1e1e2e]"
                    style={{ minHeight: 320 }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {draft.body_plain ?? 'İçerik yok'}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {actionError && (
            <div className="px-5 py-2 bg-red-950/30 border-t border-red-900/30">
              <p className="text-xs text-red-400">{actionError}</p>
            </div>
          )}

          {/* Footer — actions */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e1e2e]">
            <button
              onClick={handleReject}
              disabled={!!actioning || draft.status === 'rejected' || draft.status === 'sent'}
              className="text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
            >
              {actioning === 'reject' ? 'Reddediliyor...' : '✕ Reddet'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(entry)}
                disabled={!!actioning}
                className="text-sm text-gray-300 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={handleApprove}
                disabled={!!actioning || draft.status === 'approved' || draft.status === 'sent'}
                className="text-sm text-gray-300 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              >
                {actioning === 'approve'
                  ? 'Onaylanıyor...'
                  : draft.status === 'approved'
                  ? '✓ Onaylandı'
                  : '✓ Onayla'}
              </button>
              {draft.status !== 'sent' && company.email && (
                <button
                  onClick={handleApproveAndSend}
                  disabled={!!actioning}
                  className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  ✉️ Onayla & Gönder
                </button>
              )}
              {draft.status === 'sent' && (
                <span className="text-sm text-blue-400 border border-blue-900/40 px-4 py-2 rounded-lg">
                  ✉ Gönderildi
                </span>
              )}
              {!company.email && draft.status !== 'sent' && (
                <span className="text-xs text-gray-700 px-3 py-2">Email adresi yok</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Send confirmation overlay */}
      {sendStage === 'confirm' && (
        <SendEmailConfirm
          entry={entry}
          onConfirm={(email) => handleSendConfirmed(email)}
          onCancel={() => setSendStage('none')}
        />
      )}

      {/* Sending status overlay */}
      {(sendStage === 'sending' || sendStage === 'success' || sendStage === 'error') && (
        <SendingStatus
          company={company}
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
