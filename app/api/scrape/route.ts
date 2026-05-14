import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ScrapingJob } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { source_url, target_industry, target_location } = body

  const { data: job, error } = await supabaseAdmin
    .from('scraping_jobs')
    .insert({
      status: 'pending',
      source_url,
      target_industry,
      target_location,
      companies_found: 0,
      companies_processed: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: trigger scraping logic with puppeteer
  return NextResponse.json({ job } as { job: ScrapingJob }, { status: 201 })
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
