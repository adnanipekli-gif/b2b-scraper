import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { company_id, tone = 'profesyonel' } = body

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Firma bulunamadı' }, { status: 404 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${tone} bir B2B soğuk email yaz. Şirket bilgileri:
Firma: ${company.name}
Şehir: ${company.city ?? 'Bilinmiyor'}
Segment: ${company.segment ?? 'Bilinmiyor'}
Şube sayısı: ${company.branches ?? 'Bilinmiyor'}
Instagram takipçi: ${company.instagram_followers ?? 'Bilinmiyor'}
Google puan: ${company.google_maps_rating ?? 'Bilinmiyor'}
Büyüme sinyali: ${company.growth_signal ?? 'Bilinmiyor'}
Notlar: ${company.notes ?? ''}

Kısa, kişiselleştirilmiş bir email yaz. JSON formatında döndür: { "subject": "...", "body_html": "...", "body_plain": "..." }`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'AI yanıtı beklenmedik formatta' }, { status: 500 })
  }

  let parsed: { subject: string; body_html: string; body_plain: string }
  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? content.text)
  } catch {
    return NextResponse.json({ error: 'AI yanıtı parse edilemedi' }, { status: 500 })
  }

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('email_drafts')
    .insert({
      company_id,
      subject: parsed.subject,
      body_html: parsed.body_html,
      body_plain: parsed.body_plain,
      status: 'draft',
    })
    .select()
    .single()

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 })
  }

  return NextResponse.json({ draft }, { status: 201 })
}
