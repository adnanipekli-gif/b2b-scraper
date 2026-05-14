import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { company_id, tone = 'professional' } = body

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Write a ${tone} B2B outreach email for the following company:
Company: ${company.name}
Industry: ${company.industry ?? 'Unknown'}
Location: ${company.location ?? 'Unknown'}
Description: ${company.description ?? 'No description available'}
Contact: ${company.contact_name ?? 'Decision maker'}, ${company.contact_title ?? ''}

Write a concise, personalized cold email. Return JSON with keys: subject, body`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 })
  }

  let parsed: { subject: string; body: string }
  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? content.text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('email_drafts')
    .insert({
      company_id,
      subject: parsed.subject,
      body: parsed.body,
      tone,
      status: 'draft',
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 })
  }

  return NextResponse.json({ draft }, { status: 201 })
}
