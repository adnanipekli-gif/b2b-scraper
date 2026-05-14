# B2B Scraper

Automated B2B lead generation tool: scrapes company data, generates personalized cold emails with Claude AI, and sends them via Gmail.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** — Postgres database
- **Puppeteer** — web scraping
- **Anthropic Claude** — AI email generation
- **Gmail API** — email delivery

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in each value:

```bash
# Supabase — from https://supabase.com/dashboard → your project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret-key>

# Anthropic — from https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...

# Gmail OAuth2 — see "Gmail OAuth Setup" below
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

### 3. Run database migrations

In Supabase dashboard → **SQL Editor**, paste and run the contents of:

```
migrations/001_init.sql
```

Or using the Supabase CLI:

```bash
npx supabase db push --db-url postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres < migrations/001_init.sql
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. Enable the **Gmail API**.
3. Create **OAuth 2.0 credentials** (type: Web application).
4. Add `http://localhost` as an authorized redirect URI.
5. Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) to generate a refresh token:
   - Scope: `https://www.googleapis.com/auth/gmail.send`
   - Exchange the auth code for tokens and copy the `refresh_token`.
6. Fill in `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` in `.env.local`.

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/scrape` | Start a scraping job |
| `GET`  | `/api/scrape` | List all scraping jobs |
| `POST` | `/api/generate-email` | Generate an email draft for a company |
| `POST` | `/api/send-email` | Send an approved email draft via Gmail |

---

## Project Structure

```
app/
├─ api/
│  ├─ scrape/route.ts          # Scraping job management
│  ├─ generate-email/route.ts  # AI email generation (Claude)
│  └─ send-email/route.ts      # Gmail send
├─ page.tsx
├─ layout.tsx
└─ globals.css
lib/
├─ supabase.ts                 # Browser/client Supabase instance
├─ supabase-admin.ts           # Server-side Supabase admin instance
└─ types.ts                    # Shared TypeScript interfaces
migrations/
└─ 001_init.sql                # Initial database schema
```
