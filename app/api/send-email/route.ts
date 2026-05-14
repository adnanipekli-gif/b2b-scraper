import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
  })

  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to obtain Gmail access token')
  return data.access_token
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email_draft_id } = body

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('email_drafts')
    .select('*, companies(*)')
    .eq('id', email_draft_id)
    .single()

  if (draftError || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  if (draft.status !== 'approved') {
    return NextResponse.json({ error: 'Draft must be approved before sending' }, { status: 400 })
  }

  const toEmail = draft.companies?.contact_email
  if (!toEmail) {
    return NextResponse.json({ error: 'No contact email for this company' }, { status: 400 })
  }

  const accessToken = await getGmailAccessToken()

  const emailContent = [
    `To: ${toEmail}`,
    `Subject: ${draft.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    draft.body,
  ].join('\r\n')

  const encoded = Buffer.from(emailContent).toString('base64url')

  const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  })

  const gmailData = await gmailRes.json()
  if (!gmailRes.ok) {
    return NextResponse.json({ error: gmailData.error?.message ?? 'Gmail send failed' }, { status: 500 })
  }

  const { data: sentEmail, error: sentError } = await supabaseAdmin
    .from('sent_emails')
    .insert({
      company_id: draft.company_id,
      email_draft_id,
      to_email: toEmail,
      to_name: draft.companies?.contact_name,
      subject: draft.subject,
      body: draft.body,
      gmail_message_id: gmailData.id,
      thread_id: gmailData.threadId,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (sentError) {
    return NextResponse.json({ error: sentError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('email_drafts')
    .update({ status: 'sent' })
    .eq('id', email_draft_id)

  return NextResponse.json({ sent_email: sentEmail }, { status: 201 })
}
