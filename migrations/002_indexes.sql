-- Sprint 7: Performance indexes on frequently-queried columns
-- Run this in the Supabase SQL editor or via supabase db push

-- companies: filter by city and segment in scraping/search flows
CREATE INDEX IF NOT EXISTS idx_companies_city
  ON companies (city);

CREATE INDEX IF NOT EXISTS idx_companies_segment
  ON companies (segment);

CREATE INDEX IF NOT EXISTS idx_companies_city_segment
  ON companies (city, segment);

-- sent_emails: filter by status and sort by sent_at in history page
CREATE INDEX IF NOT EXISTS idx_sent_emails_status
  ON sent_emails (status);

CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at
  ON sent_emails (sent_at DESC);

-- email_tracking: filter by opened/clicked in analytics aggregations
CREATE INDEX IF NOT EXISTS idx_email_tracking_opened
  ON email_tracking (opened);

CREATE INDEX IF NOT EXISTS idx_email_tracking_clicked
  ON email_tracking (clicked);

CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_email_id
  ON email_tracking (sent_email_id);

-- email_drafts: look up drafts by company and status
CREATE INDEX IF NOT EXISTS idx_email_drafts_company_id
  ON email_drafts (company_id);

CREATE INDEX IF NOT EXISTS idx_email_drafts_status
  ON email_drafts (status);

-- scraping_jobs: check running jobs quickly
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status
  ON scraping_jobs (status);
