import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { city, segment } = body

  const { data: job, error } = await supabaseAdmin
    .from('scraping_jobs')
    .insert({
      city,
      segment,
      status: 'pending',
      companies_found: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: puppeteer scraping logic
  return NextResponse.json({ job }, { status: 201 })
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
