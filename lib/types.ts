export interface Company {
  id: number
  name: string
  city?: string
  segment?: 'yerel_zincir' | 'soguk_depo'
  branches?: number
  phone?: string
  email?: string
  website?: string
  instagram_handle?: string
  instagram_followers?: number
  google_maps_rating?: number
  google_maps_reviews?: number
  design_score?: number
  growth_signal?: 'expanding' | 'stable' | 'unknown'
  notes?: string
  created_at: string
  updated_at: string
}

export interface EmailDraft {
  id: number
  company_id: number
  subject?: string
  body_html?: string
  body_plain?: string
  status: 'draft' | 'approved' | 'sent' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface SentEmail {
  id: number
  company_id: number
  draft_id?: number
  gmail_message_id?: string
  recipient_email?: string
  recipient_name?: string
  subject?: string
  sent_at: string
  status?: 'sent' | 'bounced' | 'spam'
  created_at: string
}

export interface EmailTracking {
  id: number
  sent_email_id: number
  opened: boolean
  opened_at?: string
  open_count: number
  clicked: boolean
  clicked_at?: string
  click_count: number
  links_clicked?: string[]
  reply_received: boolean
  replied_at?: string
  last_activity?: string
  created_at: string
  updated_at: string
}

export interface ScrapingJob {
  id: number
  city?: string
  segment?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  companies_found?: number
  started_at: string
  completed_at?: string
  error_message?: string
  created_at: string
}
