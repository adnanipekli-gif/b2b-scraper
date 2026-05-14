import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sentEmailId = Number(searchParams.get('id'))
  const targetUrl = searchParams.get('url') ?? ''

  // Reject non-http/https URLs to prevent open redirect abuse
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return NextResponse.json({ error: 'Geçersiz URL' }, { status: 400 })
  }

  if (sentEmailId) {
    void (async () => {
      try {
        const { data } = await supabaseAdmin
          .from('email_tracking')
          .select('id, click_count, clicked, links_clicked')
          .eq('sent_email_id', sentEmailId)
          .single()

        if (!data) return
        const now = new Date().toISOString()
        const existing: string[] = data.links_clicked ?? []
        const updates: Record<string, unknown> = {
          click_count: (data.click_count ?? 0) + 1,
          links_clicked: [...existing, JSON.stringify({ url: targetUrl, timestamp: now })],
          last_activity: now,
        }
        if (!data.clicked) {
          updates.clicked = true
          updates.clicked_at = now
        }
        await supabaseAdmin
          .from('email_tracking')
          .update(updates)
          .eq('id', data.id)
      } catch {
        // Silently ignore — never block the redirect
      }
    })()
  }

  return NextResponse.redirect(targetUrl, { status: 302 })
}
