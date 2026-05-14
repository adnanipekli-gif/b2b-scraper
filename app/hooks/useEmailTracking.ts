'use client'

import useSWR from 'swr'

interface TrackingRow {
  opened: boolean
  opened_at?: string
  open_count: number
  clicked: boolean
  clicked_at?: string
  click_count: number
  reply_received: boolean
  replied_at?: string
  links_clicked?: string[]
  last_activity?: string
}

export interface SentEmailRow {
  id: number
  company_id: number
  draft_id?: number
  gmail_message_id?: string
  recipient_email?: string
  recipient_name?: string
  subject?: string
  sent_at: string
  status?: 'sent' | 'bounced' | 'spam'
  created_at: string
  companies?: { id: number; name: string; segment?: string }
  email_tracking?: TrackingRow
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useEmailTracking() {
  const { data, isLoading, error, mutate } = useSWR('/api/sent-emails', fetcher, {
    refreshInterval: 30_000,
  })

  const emails: SentEmailRow[] = data?.sent_emails ?? []
  const total = emails.length
  const opened = emails.filter(e => e.email_tracking?.opened).length
  const clicked = emails.filter(e => e.email_tracking?.clicked).length
  const replied = emails.filter(e => e.email_tracking?.reply_received).length

  const getOpenRate = () => (total > 0 ? Math.round((opened / total) * 100) : 0)
  const getClickRate = () => (total > 0 ? Math.round((clicked / total) * 100) : 0)
  const getResponseRate = () => (total > 0 ? Math.round((replied / total) * 100) : 0)

  // Sends per day for line chart — last 30 days
  const sendsPerDay = (() => {
    const map: Record<string, number> = {}
    emails.forEach(e => {
      const day = e.sent_at.slice(0, 10) // YYYY-MM-DD
      map[day] = (map[day] ?? 0) + 1
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  })()

  const markReplied = async (sentEmailId: number) => {
    await fetch('/api/sent-emails', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sent_email_id: sentEmailId }),
    })
    mutate()
  }

  const exportCSV = () => {
    const header = [
      'Firma',
      'Email',
      'Gönderilen Tarihi',
      'Durumu',
      'Açılma Tarihi',
      'Açılma Sayısı',
      'Tıklama Sayısı',
      'Cevaplandı mı',
    ]

    const escape = (v: string | number | boolean | undefined | null) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const fmt = (iso?: string) =>
      iso
        ? new Date(iso).toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : ''

    const rows = emails.map(e => [
      escape(e.companies?.name ?? e.recipient_name),
      escape(e.recipient_email),
      escape(fmt(e.sent_at)),
      escape(e.status ?? 'sent'),
      escape(fmt(e.email_tracking?.opened_at)),
      escape(e.email_tracking?.open_count ?? 0),
      escape(e.email_tracking?.click_count ?? 0),
      escape(e.email_tracking?.reply_received ? 'Evet' : 'Hayır'),
    ])

    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `b2b-scraper-history-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    emails,
    total,
    opened,
    clicked,
    replied,
    sendsPerDay,
    isLoading,
    error,
    getOpenRate,
    getClickRate,
    getResponseRate,
    markReplied,
    exportCSV,
    refresh: mutate,
  }
}
