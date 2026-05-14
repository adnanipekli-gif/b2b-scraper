import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scrapeGoogleMaps, scrapeInstagram, scrapeWebsite, cleanData, RawCompany } from '@/lib/scraper'

const SEGMENT_KEYWORDS: Record<string, string> = {
  yerel_zincir: 'yerel market zinciri süpermarket',
  soguk_depo: 'soğuk depo soğuk hava deposu',
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { city, segment, keyword: customKeyword } = body

  if (!city || !segment) {
    return NextResponse.json({ error: 'city ve segment gerekli' }, { status: 400 })
  }

  const keyword = customKeyword ?? SEGMENT_KEYWORDS[segment] ?? segment

  // Create scraping job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('scraping_jobs')
    .insert({ city, segment, status: 'running', companies_found: 0 })
    .select()
    .single()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  try {
    // 1. Scrape Google Maps for the city + keyword
    const rawCompanies = await scrapeGoogleMaps(city, keyword, segment)

    // 2. Enrich each company with website and Instagram data
    const enriched: RawCompany[] = []

    for (const company of rawCompanies) {
      let c = { ...company }

      if (c.website) {
        try {
          const webData = await scrapeWebsite(c.website)
          c = {
            ...c,
            email: c.email ?? webData.email,
            phone: c.phone ?? webData.phone,
            instagram_handle: c.instagram_handle ?? webData.instagram_handle,
          }
        } catch (err) {
          console.error(`[scraper] Website scrape failed for ${c.website}:`, (err as Error).message)
        }
      }

      if (c.instagram_handle) {
        try {
          const igData = await scrapeInstagram(c.instagram_handle)
          c = { ...c, instagram_followers: igData.instagram_followers }
        } catch (err) {
          console.error(`[scraper] Instagram scrape failed for @${c.instagram_handle}:`, (err as Error).message)
        }
      }

      enriched.push(c)
    }

    // 3. Deduplicate and validate
    const companies = cleanData(enriched)

    // 4. Batch insert into Supabase
    if (companies.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('companies').insert(
        companies.map(c => ({
          name: c.name,
          city: c.city,
          segment: c.segment,
          phone: c.phone ?? null,
          email: c.email ?? null,
          website: c.website ?? null,
          google_maps_rating: c.google_maps_rating ?? null,
          google_maps_reviews: c.google_maps_reviews ?? null,
          instagram_handle: c.instagram_handle ?? null,
          instagram_followers: c.instagram_followers ?? null,
          notes: c.address ?? null,  // address stored in notes column
        }))
      )
      if (insertError) throw new Error(insertError.message)
    }

    // 5. Mark job completed
    await supabaseAdmin
      .from('scraping_jobs')
      .update({
        status: 'completed',
        companies_found: companies.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return NextResponse.json({
      companies,
      total: companies.length,
      status: 'completed',
      job_id: job.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata'

    await supabaseAdmin
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return NextResponse.json({ error: message, job_id: job.id }, { status: 500 })
  }
}

export async function GET() {
  const { data: jobs, error } = await supabaseAdmin
    .from('scraping_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}
