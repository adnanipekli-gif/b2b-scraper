import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sent_emails')
    .select(`
      *,
      companies(id, name, segment),
      email_tracking(opened, open_count, clicked, click_count, reply_received, last_activity)
    `)
    .order('sent_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sent_emails: data ?? [] })
}
