import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scrapeGoogleMaps, scrapeInstagram, scrapeWebsite, RawCompany } from '@/lib/scraper'

const SEGMENT_KEYWORDS: Record<string, string> = {
  yerel_zincir: 'yerel market zinciri süpermarket',
  soguk_depo: 'soğuk depo soğuk hava deposu',
}

// ─── Background pipeline ──────────────────────────────────────────────────────
// Runs fire-and-forget after POST returns job_id. Works in local next dev
// because Node.js event loop keeps running after the response is sent.
// For production, replace with a proper job queue (BullMQ, Vercel Cron, etc.)

async function runPipeline(jobId: number, city: string, keyword: string, segment: string) {
  let count = 0

  try {
    await scrapeGoogleMaps(city, keyword, segment, async (raw: RawCompany) => {
      let c = { ...raw }

      // Enrich with website data
      if (c.website) {
        try {
          const web = await scrapeWebsite(c.website)
          c = {
            ...c,
            email: c.email ?? web.email,
            phone: c.phone ?? web.phone,
            instagram_handle: c.instagram_handle ?? web.instagram_handle,
          }
        } catch {}
      }

      // Enrich with Instagram followers
      if (c.instagram_handle) {
        try {
          const ig = await scrapeInstagram(c.instagram_handle)
          c = { ...c, instagram_followers: ig.instagram_followers }
        } catch {}
      }

      if (!c.name?.trim()) return

      // Skip duplicates (same name + city already in DB)
      const { data: existing } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('name', c.name.trim())
        .eq('city', c.city)
        .maybeSingle()

      if (existing) return

      await supabaseAdmin.from('companies').insert({
        name: c.name.trim(),
        city: c.city,
        segment: c.segment,
        phone: c.phone?.replace(/\s+/g, ' ').trim() ?? null,
        email: c.email?.toLowerCase().trim() ?? null,
        website: c.website?.replace(/[?#].*$/, '') ?? null,
        google_maps_rating: c.google_maps_rating ?? null,
        google_maps_reviews: c.google_maps_reviews ?? null,
        instagram_handle: c.instagram_handle ?? null,
        instagram_followers: c.instagram_followers ?? null,
        notes: c.address ?? null,
      })

      count++

      await supabaseAdmin
        .from('scraping_jobs')
        .update({ companies_found: count })
        .eq('id', jobId)
    })

    await supabaseAdmin
      .from('scraping_jobs')
      .update({ status: 'completed', companies_found: count, completed_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch (err) {
    await supabaseAdmin
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Bilinmeyen hata',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

// ─── POST /api/scrape ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { city, segment, keyword: customKeyword } = body

  if (!city || !segment) {
    return NextResponse.json({ error: 'city ve segment gerekli' }, { status: 400 })
  }

  const keyword = customKeyword ?? SEGMENT_KEYWORDS[segment] ?? segment

  const { data: job, error: jobError } = await supabaseAdmin
    .from('scraping_jobs')
    .insert({ city, segment, status: 'running', companies_found: 0 })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  // Start pipeline in background — do NOT await
  runPipeline(job.id, city, keyword, segment).catch(err =>
    console.error('[scraper] Unhandled pipeline error:', err)
  )

  return NextResponse.json({ job_id: job.id, status: 'running' })
}

// ─── GET /api/scrape ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')

  if (jobId) {
    const { data: job, error } = await supabaseAdmin
      .from('scraping_jobs')
      .select('*')
      .eq('id', parseInt(jobId))
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ job })
  }

  const { data: jobs, error } = await supabaseAdmin
    .from('scraping_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs })
}
