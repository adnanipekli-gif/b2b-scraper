import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getGmailAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    client_secret: process.env.GMAIL_CLIENT_SECRET!,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(10_000),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error('Gmail erişim tokenı alınamadı')
  return data.access_token
}

function buildMimeMessage(opts: {
  from: string
  to: string
  subject: string
  html: string
  plain?: string
}): string {
  const boundary = `b${Date.now()}x${Math.random().toString(36).slice(2, 8)}`
  const enc = (s: string) =>
    Buffer.from(s).toString('base64').match(/.{1,76}/g)!.join('\r\n')

  const lines = [
    `From: ${opts.from}`,
    `Reply-To: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
  ]

  if (opts.plain) {
    lines.push(
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      enc(opts.plain),
      '',
    )
  }

  lines.push(
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enc(opts.html),
    '',
    `--${boundary}--`,
  )

  return lines.join('\r\n')
}

async function sendGmailWithRetry(
  accessToken: string,
  raw: string,
  maxRetries = 3,
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 2_000 * attempt))
    }

    try {
      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
          signal: AbortSignal.timeout(10_000),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 60_000))
          lastError = new Error('Gmail rate limit — tekrar deneniyor')
          continue
        }
        throw new Error(data.error?.message ?? `Gmail API hatası (${res.status})`)
      }

      return data.id as string
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Bilinmeyen Gmail hatası')
    }
  }

  throw lastError ?? new Error('3 denemede gönderilemedi')
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { draft_id } = body

  if (!draft_id) {
    return NextResponse.json({ error: 'draft_id gerekli' }, { status: 400 })
  }

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('email_drafts')
    .select('*, companies(*)')
    .eq('id', draft_id)
    .single()

  if (draftError || !draft) {
    return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })
  }

  if (draft.status !== 'approved') {
    return NextResponse.json(
      { error: 'Göndermeden önce taslak onaylanmalı' },
      { status: 400 },
    )
  }

  const toEmail = draft.companies?.email
  if (!toEmail) {
    return NextResponse.json(
      { error: 'Bu firma için email adresi yok' },
      { status: 400 },
    )
  }

  if (!isValidEmail(toEmail)) {
    return NextResponse.json({ error: 'Geçersiz email adresi' }, { status: 400 })
  }

  const fromAddress = process.env.GMAIL_FROM_ADDRESS ?? 'adnan@ndgrouptr.com'

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gmail auth hatası' },
      { status: 503 },
    )
  }

  const mimeMessage = buildMimeMessage({
    from: fromAddress,
    to: toEmail,
    subject: draft.subject ?? '(Konu yok)',
    html: draft.body_html ?? draft.body_plain ?? '',
    plain: draft.body_plain ?? undefined,
  })

  const raw = Buffer.from(mimeMessage).toString('base64url')

  let gmailMessageId: string
  try {
    gmailMessageId = await sendGmailWithRetry(accessToken, raw)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gmail gönderilemedi' },
      { status: 500 },
    )
  }

  const sentAt = new Date().toISOString()

  const { data: sentEmail, error: sentError } = await supabaseAdmin
    .from('sent_emails')
    .insert({
      company_id: draft.company_id,
      draft_id,
      recipient_email: toEmail,
      recipient_name: draft.companies?.name,
      subject: draft.subject,
      gmail_message_id: gmailMessageId,
      status: 'sent',
      sent_at: sentAt,
    })
    .select()
    .single()

  if (sentError) {
    return NextResponse.json({ error: sentError.message }, { status: 500 })
  }

  // Create tracking entry — fire and forget errors
  await supabaseAdmin.from('email_tracking').insert({
    sent_email_id: sentEmail.id,
    opened: false,
    open_count: 0,
    clicked: false,
    click_count: 0,
    reply_received: false,
  })

  // Mark draft as sent
  await supabaseAdmin
    .from('email_drafts')
    .update({ status: 'sent' })
    .eq('id', draft_id)

  return NextResponse.json(
    {
      message_id: gmailMessageId,
      status: 'sent',
      sent_at: sentAt,
      recipient_email: toEmail,
    },
    { status: 201 },
  )
}
