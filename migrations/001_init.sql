-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Companies
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text not null,
  industry text,
  employee_count integer,
  location text,
  description text,
  linkedin_url text,
  contact_email text,
  contact_name text,
  contact_title text,
  scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_industry_idx on companies(industry);
create index if not exists companies_contact_email_idx on companies(contact_email);

-- Email drafts
create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subject text not null,
  body text not null,
  tone text default 'professional',
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'sent')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_drafts_company_id_idx on email_drafts(company_id);
create index if not exists email_drafts_status_idx on email_drafts(status);

-- Sent emails
create table if not exists sent_emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email_draft_id uuid not null references email_drafts(id) on delete cascade,
  to_email text not null,
  to_name text,
  subject text not null,
  body text not null,
  gmail_message_id text,
  thread_id text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sent_emails_company_id_idx on sent_emails(company_id);
create index if not exists sent_emails_thread_id_idx on sent_emails(thread_id);

-- Email tracking
create table if not exists email_tracking (
  id uuid primary key default gen_random_uuid(),
  sent_email_id uuid not null references sent_emails(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'clicked', 'replied', 'bounced', 'unsubscribed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_tracking_sent_email_id_idx on email_tracking(sent_email_id);
create index if not exists email_tracking_event_type_idx on email_tracking(event_type);

-- Scraping jobs
create table if not exists scraping_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  source_url text,
  target_industry text,
  target_location text,
  companies_found integer not null default 0,
  companies_processed integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scraping_jobs_status_idx on scraping_jobs(status);

-- Auto-update updated_at via trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();

create trigger email_drafts_updated_at before update on email_drafts
  for each row execute function update_updated_at();

create trigger scraping_jobs_updated_at before update on scraping_jobs
  for each row execute function update_updated_at();
