import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')

  let query = supabaseAdmin
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (since) {
    query = query.gte('created_at', since)
  }

  const { data: companies, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companies })
}
