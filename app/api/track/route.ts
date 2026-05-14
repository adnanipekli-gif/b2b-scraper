import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 1×1 transparent GIF — standard tracking pixel
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sentEmailId = Number(searchParams.get('id'))

  if (sentEmailId) {
    // Fire-and-forget — never delay the pixel response for DB
    void (async () => {
      try {
        const { data } = await supabaseAdmin
          .from('email_tracking')
          .select('id, open_count, opened')
          .eq('sent_email_id', sentEmailId)
          .single()

        if (!data) return
        const now = new Date().toISOString()
        const updates: Record<string, unknown> = {
          open_count: (data.open_count ?? 0) + 1,
          last_activity: now,
        }
        if (!data.opened) {
          updates.opened = true
          updates.opened_at = now
        }
        await supabaseAdmin
          .from('email_tracking')
          .update(updates)
          .eq('id', data.id)
      } catch {
        // Silently ignore — tracking failures must never affect email delivery
      }
    })()
  }

  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  })
}
