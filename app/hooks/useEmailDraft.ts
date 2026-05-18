'use client'

import { useState, useCallback } from 'react'
import { EmailDraft, Company, DraftEntry } from '@/lib/types'

export type SendingStatus = 'idle' | 'sending' | 'success' | 'error'

export interface SendResult {
  messageId: string
  sentAt: string
  recipientEmail: string
}

export function useEmailDraft() {
  const [drafts, setDrafts] = useState<DraftEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sendingStatus, setSendingStatus] = useState<SendingStatus>('idle')
  const [sentCount, setSentCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  const currentDraft = drafts[currentIndex] ?? null

  const loadDrafts = useCallback(async (companyIds: number[], companies: Company[]) => {
    if (companyIds.length === 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/generate-email?companyIds=${companyIds.join(',')}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Taslaklar yüklenemedi')

      const emailDrafts: EmailDraft[] = data.drafts ?? []
      const entries: DraftEntry[] = emailDrafts
        .map(draft => {
          const company = companies.find(c => c.id === draft.company_id)
          return company ? { draft, company } : null
        })
        .filter(Boolean) as DraftEntry[]

      setDrafts(entries)
      setCurrentIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setLoading(false)
    }
  }, [])

  const patchDraft = useCallback(async (
    draft_id: number,
    fields: Partial<Pick<EmailDraft, 'subject' | 'body_html' | 'body_plain' | 'status'>>
  ) => {
    const res = await fetch('/api/generate-email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id, ...fields }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Güncelleme hatası')
    const updated: EmailDraft = data.draft
    setDrafts(prev =>
      prev.map(e => e.draft.id === updated.id ? { ...e, draft: updated } : e)
    )
    return updated
  }, [])

  const updateDraft = useCallback(async (
    draft_id: number,
    fields: Partial<Pick<EmailDraft, 'subject' | 'body_html' | 'body_plain'>>
  ) => patchDraft(draft_id, fields), [patchDraft])

  const approveDraft = useCallback(async (draft_id: number) =>
    patchDraft(draft_id, { status: 'approved' }), [patchDraft])

  const rejectDraft = useCallback(async (draft_id: number) =>
    patchDraft(draft_id, { status: 'rejected' }), [patchDraft])

  const deleteDraft = useCallback(async (draft_id: number) => {
    const res = await fetch(`/api/generate-email?draftId=${draft_id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Silme hatası')
    setDrafts(prev => prev.filter(e => e.draft.id !== draft_id))
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const sendDraft = useCallback(async (draft_id: number, toEmail?: string): Promise<SendResult> => {
    setSendingStatus('sending')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id, to_email: toEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gönderme hatası')

      // Update local draft status to 'sent'
      setDrafts(prev =>
        prev.map(e =>
          e.draft.id === draft_id
            ? { ...e, draft: { ...e.draft, status: 'sent' as const } }
            : e
        )
      )
      setSentCount(prev => prev + 1)
      setSendingStatus('success')

      return {
        messageId: data.message_id,
        sentAt: data.sent_at,
        recipientEmail: data.recipient_email,
      }
    } catch (err) {
      setFailedCount(prev => prev + 1)
      setSendingStatus('error')
      throw err
    }
  }, [])

  const resetSendingStatus = useCallback(() => setSendingStatus('idle'), [])

  const addDraft = useCallback((entry: DraftEntry) => {
    setDrafts(prev => [...prev, entry])
  }, [])

  const clearDrafts = useCallback(() => setDrafts([]), [])

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, drafts.length - 1))
  }, [drafts.length])

  const goPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, drafts.length - 1)))
  }, [drafts.length])

  return {
    drafts,
    currentDraft,
    currentIndex,
    totalCount: drafts.length,
    loading,
    error,
    sendingStatus,
    sentCount,
    failedCount,
    loadDrafts,
    updateDraft,
    approveDraft,
    rejectDraft,
    deleteDraft,
    sendDraft,
    resetSendingStatus,
    addDraft,
    clearDrafts,
    goToNext,
    goPrevious,
    goTo,
  }
}
