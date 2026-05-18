import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function toTitleCase(str: string): string {
  return str.replace(/\S+/g, word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
}

function extractJson(text: string): string {
  const block = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (block) return block[1]
  const obj = text.match(/\{[\s\S]*\}/)
  return obj ? obj[0] : text
}

// ─── GET /api/generate-email?companyIds=1,2,3 ────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('companyIds')
  if (!raw) return NextResponse.json({ error: 'companyIds gerekli' }, { status: 400 })

  const ids = raw.split(',').map(Number).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ drafts: [] })

  const { data: drafts, error } = await supabaseAdmin
    .from('email_drafts')
    .select('*')
    .in('company_id', ids)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts })
}

// ─── DELETE /api/generate-email?draftId=X ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const draftId = Number(searchParams.get('draftId'))
  if (!draftId) return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('email_drafts')
    .delete()
    .eq('id', draftId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ─── POST /api/generate-email ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = rateLimit(ip, 'generate-email', { windowMs: 60_000, max: 20 })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    )
  }

  const body = await request.json()
  const { company_id, manual } = body

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Firma bulunamadı' }, { status: 404 })
  }

  // ── Manuel mod: AI çağrısı olmadan boş taslak oluştur ────────────────────
  if (manual) {
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('email_drafts')
      .insert({ company_id, subject: '', body_html: '<p></p>', body_plain: '', status: 'draft' })
      .select()
      .single()
    if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 })
    return NextResponse.json({ draft }, { status: 201 })
  }

  // ── Segment'e göre hangi ND Group hizmetini öne çıkaracağımızı belirle ──
  const segmentContext =
    company.segment === 'soguk_depo'
      ? {
          label: 'Soğuk depo / soğuk hava deposu',
          hizmet: `Ecocold Cooling Systems (ND Group bünyesi): monoblok, split ve merkezi soğutma sistemleri,
soğuk oda panelleri ve nemlendirme teknolojileri. Kendi mühendislik ekibimizle hesaplama ve anahtar
teslim kurulum yapıyoruz.`,
          agriNokta:
            company.growth_signal === 'expanding'
              ? 'artan kapasite ihtiyacı ve yeni depo projelerinde doğru sistem seçimi'
              : 'enerji maliyeti, sistem verimi ve bakım sürekliliği',
        }
      : {
          label: 'Yerel zincir market',
          hizmet: `ND Group olarak üç alanda hizmet veriyoruz:
1. Pasifik Raf & Logoraf — gondol raflar, duvar üniteleri, manav stantları, ağır yük raf sistemleri
2. Ecocold Cooling Systems — market soğutma grupları, soğuk oda çözümleri
3. Nokta Dizayn — mağaza iç konsept tasarımı, 3D render ve anahtar teslim proje`,
          agriNokta:
            company.branches && company.branches > 5
              ? 'çok şubeli operasyonda standart görünüm ve tedarik yönetimi'
              : 'mağaza dizaynı ve donanımında maliyet/verimlilik dengesi',
        }

  const companyContext = [
    `Firma adı: ${company.name}`,
    `Şehir: ${company.city ?? 'Belirtilmemiş'}`,
    `Sektör: ${segmentContext.label}`,
    company.branches ? `Şube sayısı: ~${company.branches}` : null,
    company.instagram_followers
      ? `Instagram takipçisi: ${fmt(company.instagram_followers)}`
      : null,
    company.google_maps_rating
      ? `Google puanı: ${company.google_maps_rating}/5 (${company.google_maps_reviews ?? 0} yorum)`
      : null,
    company.growth_signal === 'expanding' ? 'Büyüme sinyali: genişleme sürecinde' : null,
    company.notes ? `Ek not: ${company.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Sen ND Group adına yazan deneyimli bir Türk B2B satış temsilcisisin.

ND GROUP HAKKINDA:
ND Group; endüstriyel soğutma sistemleri (Ecocold, Ecocold Cooling Systems), mağaza raf & depolama ekipmanları (Pasifik Raf /
Logoraf) ve mimari mağaza tasarımı (Nokta Dizayn) alanlarında faaliyet gösteren, mühendislik ve
çözüm odaklı bir firmadır. Sadece ürün satmıyor; müşteriye vizyon çiziyor, anahtar teslim projeler
sunuyor.

HEDEF FİRMA:
${companyContext}

BU FİRMAYA SUNACAĞIMIZ DEĞER:
${segmentContext.hizmet}

ÖNE ÇIKARILACAK AĞRI NOKTASI:
${segmentContext.agriNokta}

GÖREV:
Yukarıdaki firmaya gönderilecek kısa, samimi ve insan eli değmiş gibi hissettiren Türkçe bir soğuk
satış emaili yaz. Kurumsal şablona benzemesin; gerçekten o firmayla ilgileniyormuşsun gibi konuş.

KURALLAR:
- Türkçe, sade, günlük iş dili — resmi ama robotik değil
- Cümlelerde "—" veya "..." gibi yapay duraklamalar kullanma
- En fazla 200 kelime (subject hariç)
- Firmaya özel ağrı noktasından gir; hemen ürün saymaya başlama
- ND Group'u en fazla iki-üç cümleyle tanıt, gerisini değer önerisine ayır
- CTA: 15-20 dakikalık kısa bir görüşme veya yerinde keşif talebi
- Konu satırı merak uyandırmalı ama clickbait olmamalı
- Hiç emoji kullanma
- HTML için sadece <p> etiketleri kullan, karmaşık yapıdan kaçın
- Emailin sonuna imza, isim, telefon veya "Saygılarımla" gibi kapanış ifadesi EKLEME; imza şablona ayrıca ekleniyor

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

    parsed.subject = toTitleCase(parsed.subject)
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
  if (status !== undefined) {
    update.status = status
    if (status === 'approved') {
      update.approved_by = 'adnan'
      update.approved_at = new Date().toISOString()
    }
  }

  const { data: draft, error } = await supabaseAdmin
    .from('email_drafts')
    .update(update)
    .eq('id', draft_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft })
}
