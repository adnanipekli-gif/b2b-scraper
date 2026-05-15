import { NextRequest, NextResponse } from 'next/server'

// Gmail Push Notifications via Google Cloud Pub/Sub
// Setup guide: https://developers.google.com/gmail/api/guides/push
//
// 1. Create a Pub/Sub topic in Google Cloud Console
// 2. Grant gmail-api-push@system.gserviceaccount.com publisher role on the topic
// 3. Create a Pub/Sub subscription pointing to this endpoint
// 4. Call Gmail API: POST /gmail/v1/users/me/watch { topicName, labelIds: ['INBOX'] }
// 5. Set GMAIL_WEBHOOK_TOKEN env var (any secret string)
//
// The webhook fires when new messages arrive (replies to our sent emails).

export async function POST(request: NextRequest) {
  // Validate token to ensure this is from our Pub/Sub subscription
  const token = new URL(request.url).searchParams.get('token')
  if (!process.env.GMAIL_WEBHOOK_TOKEN || token !== process.env.GMAIL_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: { data?: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true }) // Always ack to prevent Pub/Sub retries
  }

  try {
    const rawData = body.message?.data
    if (!rawData) return NextResponse.json({ ok: true })

    const messageData = JSON.parse(Buffer.from(rawData, 'base64').toString())
    const { emailAddress, historyId } = messageData as {
      emailAddress?: string
      historyId?: string
    }

    if (!emailAddress || !historyId) return NextResponse.json({ ok: true })

    // TODO: Use Gmail API to list history changes and detect replies:
    // GET /gmail/v1/users/me/history?startHistoryId={historyId}&historyTypes=messageAdded
    // For each new message: check if it's in a thread we sent to → mark as replied
    //
    // Quick implementation:
    // 1. GET history since lastHistoryId
    // 2. For each messagesAdded: get message threadId
    // 3. Find sent_emails where the thread contains our gmail_message_id
    // 4. Update email_tracking.reply_received = true, replied_at = now

    console.log('[gmail-webhook] historyId:', historyId, 'email:', emailAddress)
  } catch (err) {
    console.error('[gmail-webhook] Error:', err)
  }

  // Always return 200 — Pub/Sub will retry on non-2xx responses
  return NextResponse.json({ ok: true })
}
