export interface Company {
  id: string
  name: string
  website: string
  industry?: string
  employee_count?: number
  location?: string
  description?: string
  linkedin_url?: string
  contact_email?: string
  contact_name?: string
  contact_title?: string
  scraped_at?: string
  created_at: string
  updated_at: string
}

export interface EmailDraft {
  id: string
  company_id: string
  subject: string
  body: string
  tone?: string
  status: 'draft' | 'approved' | 'rejected' | 'sent'
  generated_at: string
  created_at: string
  updated_at: string
}

export interface SentEmail {
  id: string
  company_id: string
  email_draft_id: string
  to_email: string
  to_name?: string
  subject: string
  body: string
  gmail_message_id?: string
  thread_id?: string
  sent_at: string
  created_at: string
}

export interface EmailTracking {
  id: string
  sent_email_id: string
  event_type: 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed'
  occurred_at: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ScrapingJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  source_url?: string
  target_industry?: string
  target_location?: string
  companies_found: number
  companies_processed: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}
