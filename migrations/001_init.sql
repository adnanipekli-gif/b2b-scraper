-- TABLE 1: Companies (Firmalar)
CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  segment VARCHAR(50), -- 'yerel_zincir' | 'soguk_depo'
  branches INTEGER,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  instagram_handle VARCHAR(100),
  instagram_followers INTEGER,
  google_maps_rating FLOAT,
  google_maps_reviews INTEGER,
  design_score INTEGER, -- 1-5 (Nokta için)
  growth_signal VARCHAR(255), -- 'expanding' | 'stable' | 'unknown'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: Email Drafts (Email Taslakları)
CREATE TABLE email_drafts (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  subject VARCHAR(500),
  body_html TEXT,
  body_plain TEXT,
  status VARCHAR(50), -- 'draft' | 'approved' | 'sent' | 'rejected'
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 3: Sent Emails (Gönderilen Mailler)
CREATE TABLE sent_emails (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  draft_id BIGINT REFERENCES email_drafts(id),
  gmail_message_id VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  subject VARCHAR(500),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50), -- 'sent' | 'bounced' | 'spam'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 4: Tracking (Açılma ve Tıklama Takibi)
CREATE TABLE email_tracking (
  id BIGSERIAL PRIMARY KEY,
  sent_email_id BIGINT REFERENCES sent_emails(id) ON DELETE CASCADE,
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP,
  open_count INTEGER DEFAULT 0,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  links_clicked TEXT[],
  reply_received BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP,
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 5: Scraping Jobs (Scraping Geçmişi)
CREATE TABLE scraping_jobs (
  id BIGSERIAL PRIMARY KEY,
  city VARCHAR(100),
  segment VARCHAR(50),
  status VARCHAR(50), -- 'pending' | 'running' | 'completed' | 'failed'
  companies_found INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
