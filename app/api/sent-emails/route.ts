import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sent_emails')
    .select(`
      *,
      companies(id, name, segment),
      email_tracking(opened, opened_at, open_count, clicked, clicked_at, click_count, reply_received, replied_at, links_clicked, last_activity)
    `)
    .order('sent_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sent_emails: data ?? [] })
}

// PATCH /api/sent-emails — mark as replied
export async function PATCH(request: NextRequest) {
  const { sent_email_id, reply_received } = await request.json()
  if (!sent_email_id) {
    return NextResponse.json({ error: 'sent_email_id gerekli' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('email_tracking')
    .update({
      reply_received: reply_received ?? true,
      replied_at: reply_received !== false ? now : null,
      last_activity: now,
    })
    .eq('sent_email_id', sent_email_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
