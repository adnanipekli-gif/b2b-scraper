import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function extractJson(text: string): string {
  const block = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (block) return block[1]
  const obj = text.match(/\{[\s\S]*\}/)
  return obj ? obj[0] : text
}

// ─── POST /api/generate-email ─────────────────────────────────────────────────

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

  const segmentLabel =
    company.segment === 'yerel_zincir'
      ? 'Yerel zincir market'
      : company.segment === 'soguk_depo'
      ? 'Soğuk depo / soğuk hava deposu'
      : company.segment ?? 'Bilinmiyor'

  const toneLabel =
    tone === 'teknik'
      ? 'teknik ve profesyonel (B2B tedarik/lojistik odaklı)'
      : 'profesyonel ama samimi (karar vericiyle direkt iletişim)'

  const context = [
    `Firma: ${company.name}`,
    `Şehir: ${company.city ?? 'Belirtilmemiş'}`,
    `Segment: ${segmentLabel}`,
    company.branches ? `Şube sayısı: ~${company.branches}` : null,
    company.instagram_followers
      ? `Instagram: ${fmt(company.instagram_followers)} takipçi`
      : null,
    company.google_maps_rating
      ? `Google puanı: ${company.google_maps_rating}/5 (${company.google_maps_reviews ?? 0} yorum)`
      : null,
    company.growth_signal === 'expanding' ? 'Büyüme durumu: Genişleme sürecinde' : null,
    company.notes ? `Not: ${company.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Sen deneyimli bir Türk B2B satış uzmanısın.

HEDEF FİRMA:
${context}

GÖREV:
Bu firmaya gönderilecek ${toneLabel} tonunda kişiselleştirilmiş bir B2B soğuk email yaz.

KURALLAR:
- Tamamen Türkçe
- Maksimum 160 kelime
- Firmaya özel bir ağrı noktasına değin (çok şube → operasyon; büyüme → kapasite; vs.)
- Biz kim olduğumuzu tek cümleyle açıkla; değer önerisini net yaz
- Kısa bir CTA ekle: 15 dakikalık görüşme veya demo talebi
- Spam gibi görünmesin

HTML emailde basit yapı kullan (<p> etiketleri yeterli, karmaşık layout gerekmez).

Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir şey ekleme:
{"subject":"...","body_html":"<p>...</p>","body_plain":"..."}`

  let parsed: { subject: string; body_html: string; body_plain: string }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Beklenmedik AI yanıt tipi')

    parsed = JSON.parse(extractJson(content.text))

    if (!parsed.subject || !parsed.body_plain) {
      throw new Error('AI yanıtında subject veya body_plain eksik')
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI hatası' },
      { status: 500 }
    )
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

// ─── PATCH /api/generate-email ────────────────────────────────────────────────
// Updates subject, body, or status of an existing draft

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { draft_id, subject, body_html, body_plain, status } = body

  if (!draft_id) {
    return NextResponse.json({ error: 'draft_id gerekli' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (subject !== undefined) update.subject = subject
  if (body_html !== undefined) update.body_html = body_html
  if (body_plain !== undefined) update.body_plain = body_plain
  if (status !== undefined) update.status = status

  const { data: draft, error } = await supabaseAdmin
    .from('email_drafts')
    .update(update)
    .eq('id', draft_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft })
}
