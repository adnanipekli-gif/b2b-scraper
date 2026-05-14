'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import SearchForm from './components/SearchForm'
import CompaniesTable from './components/CompaniesTable'
import EmailGenerator from './components/EmailGenerator'
import { Company } from '@/lib/types'

const ESTIMATED_TOTAL = 20

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Home() {
  const [jobId, setJobId] = useState<number | null>(null)
  const [jobStartedAt, setJobStartedAt] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showEmailGen, setShowEmailGen] = useState(false)

  // ── Poll job status ──────────────────────────────────────────────────────
  const { data: jobData, mutate: refetchJob } = useSWR(
    jobId ? `/api/scrape?jobId=${jobId}` : null,
    fetcher,
    {
      refreshInterval: data =>
        data?.job?.status === 'running' ? 2000 : 0,
    }
  )

  const job = jobData?.job
  const isSearching = job?.status === 'running'
  const jobFailed = job?.status === 'failed'
  const companiesFound: number = job?.companies_found ?? 0
  const progress = Math.min((companiesFound / ESTIMATED_TOTAL) * 100, 95)

  // ── Fetch companies when job completes ───────────────────────────────────
  const { data: companiesData } = useSWR(
    job?.status === 'completed' && jobStartedAt
      ? `/api/companies?since=${encodeURIComponent(jobStartedAt)}`
      : null,
    fetcher
  )

  useEffect(() => {
    if (companiesData?.companies) {
      setCompanies(companiesData.companies)
    }
  }, [companiesData])

  const handleJobStart = (id: number, startedAt: string) => {
    setJobId(id)
    setJobStartedAt(startedAt)
    setCompanies([])
  }

  const handleRetry = () => {
    setJobId(null)
    setJobStartedAt(null)
    setCompanies([])
    refetchJob()
  }

  const handleGenerateEmails = (ids: number[]) => {
    setSelectedIds(ids)
    setShowEmailGen(true)
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e2e]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚡</span>
            <span className="font-bold tracking-tight">B2B Scraper</span>
          </div>
          <span className="text-[11px] text-gray-600 bg-[#1a1a28] border border-[#2a2a3e] px-3 py-1 rounded-full">
            Sprint 3
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {/* Search form */}
        <SearchForm
          onJobStart={handleJobStart}
          isSearching={isSearching}
          onRetry={handleRetry}
        />

        {/* Progress panel — shown while running or just finished */}
        {job && (isSearching || job.status === 'completed' || jobFailed) && (
          <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
            {/* Status row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">
                {isSearching && `Taranıyor... ${companiesFound} firma bulundu`}
                {job.status === 'completed' && `✅ ${companiesFound} firma bulundu`}
                {jobFailed && '❌ Scraping başarısız'}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    isSearching
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : job.status === 'completed'
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}
                >
                  {isSearching ? 'Devam ediyor' : job.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                </span>
                {job.city && (
                  <span className="text-[11px] text-gray-600">
                    {job.city} · {job.segment}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {!jobFailed && (
              <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${job.status === 'completed' ? 100 : Math.max(progress, 4)}%` }}
                />
              </div>
            )}

            {/* Counter / error */}
            {isSearching && (
              <p className="text-xs text-gray-600 mt-1.5">
                {companiesFound} / ~{ESTIMATED_TOTAL} tahmini
              </p>
            )}
            {jobFailed && job.error_message && (
              <p className="text-xs text-red-400 mt-2">{job.error_message}</p>
            )}
          </div>
        )}

        {/* Results table */}
        {companies.length > 0 && (
          <CompaniesTable companies={companies} onGenerateEmails={handleGenerateEmails} />
        )}

        {/* Email generator — shown when user clicks "Email Oluştur" */}
        {showEmailGen && companies.length > 0 && (
          <EmailGenerator
            companyIds={selectedIds}
            companies={companies}
            onClose={() => { setShowEmailGen(false); setSelectedIds([]) }}
          />
        )}

        {/* Empty state after completed job */}
        {job?.status === 'completed' && companies.length === 0 && (
          <div className="text-center text-gray-600 py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p>Sonuç bulunamadı.</p>
            <p className="text-sm mt-1">Farklı şehir veya anahtar kelime deneyin.</p>
          </div>
        )}
      </main>
    </div>
  )
}
