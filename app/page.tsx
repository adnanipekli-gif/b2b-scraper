'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import AppNav from './components/AppNav'
import SearchForm from './components/SearchForm'
import CompaniesTable from './components/CompaniesTable'
import EmailGenerator from './components/EmailGenerator'
import { Company } from '@/lib/types'

const ESTIMATED_TOTAL = 20
const fetcher = (url: string) => fetch(url).then(r => r.json())

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch {}
}
function lsDel(...keys: string[]) {
  try { keys.forEach(k => localStorage.removeItem(k)) } catch {}
}

export default function Home() {
  const [jobId, setJobId] = useState<number | null>(() => {
    const s = lsGet('b2b_job_id'); return s ? parseInt(s) : null
  })
  const [jobStartedAt, setJobStartedAt] = useState<string | null>(() =>
    lsGet('b2b_job_started_at')
  )
  const [sentCompanyIds, setSentCompanyIds] = useState<Set<number>>(() => {
    const s = lsGet('b2b_sent_ids')
    try { return s ? new Set(JSON.parse(s) as number[]) : new Set() } catch { return new Set() }
  })

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showEmailGen, setShowEmailGen] = useState(false)

  // Accumulated companies across all searches — deduped by ID
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const mergedKey = useRef<string | null>(null)

  const { data: jobData, mutate: refetchJob } = useSWR(
    jobId ? `/api/scrape?jobId=${jobId}` : null,
    fetcher,
    { refreshInterval: data => data?.job?.status === 'running' ? 2000 : 0 }
  )

  const job = jobData?.job
  const isSearching = job?.status === 'running'
  const jobFailed = job?.status === 'failed'
  const companiesFound: number = job?.companies_found ?? 0
  const progress = Math.min((companiesFound / ESTIMATED_TOTAL) * 100, 95)

  const { data: companiesData } = useSWR(
    job?.status === 'completed' && jobStartedAt
      ? `/api/companies?since=${encodeURIComponent(jobStartedAt)}`
      : null,
    fetcher
  )

  // Merge new job's companies into accumulated list (no duplicates)
  useEffect(() => {
    if (job?.status !== 'completed' || !companiesData?.companies || !jobStartedAt) return
    if (mergedKey.current === jobStartedAt) return
    mergedKey.current = jobStartedAt
    const incoming: Company[] = companiesData.companies
    setAllCompanies(prev => {
      const existingIds = new Set(prev.map(c => c.id))
      const newOnes = incoming.filter(c => !existingIds.has(c.id))
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev
    })
  }, [job?.status, companiesData, jobStartedAt])

  const handleJobStart = (id: number, startedAt: string) => {
    setJobId(id)
    setJobStartedAt(startedAt)
    setShowEmailGen(false)
    setSelectedIds([])
    lsSet('b2b_job_id', String(id))
    lsSet('b2b_job_started_at', startedAt)
  }

  const handleRetry = () => {
    setJobId(null)
    setJobStartedAt(null)
    setSentCompanyIds(new Set())
    setShowEmailGen(false)
    setSelectedIds([])
    setAllCompanies([])
    mergedKey.current = null
    refetchJob()
    lsDel('b2b_job_id', 'b2b_job_started_at', 'b2b_sent_ids')
  }

  const handleEmailSent = (companyId: number) => {
    setSentCompanyIds(prev => {
      const next = new Set([...prev, companyId])
      lsSet('b2b_sent_ids', JSON.stringify([...next]))
      return next
    })
  }

  const handleGenerateEmails = (ids: number[]) => {
    setSelectedIds(ids)
    setShowEmailGen(true)
  }

  const handleEmailGenClose = () => {
    setShowEmailGen(false)
    setSelectedIds([])
  }

  const handleDeleteCompany = (id: number) => {
    setAllCompanies(prev => prev.filter(c => c.id !== id))
    setSelectedIds(prev => prev.filter(sid => sid !== id))
  }

  const handleResetAll = () => {
    setAllCompanies([])
    setSelectedIds([])
    setSentCompanyIds(new Set())
    mergedKey.current = null
    lsDel('b2b_sent_ids')
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <AppNav />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {!showEmailGen && (
          <SearchForm onJobStart={handleJobStart} isSearching={isSearching} onRetry={handleRetry} />
        )}

        {/* Progress panel */}
        {!showEmailGen && job && (isSearching || job.status === 'completed' || jobFailed) && (
          <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">
                {isSearching && `Taranıyor... ${companiesFound} firma bulundu`}
                {job.status === 'completed' && `✅ ${companiesFound} firma bulundu`}
                {jobFailed && '❌ Scraping başarısız'}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                  isSearching ? 'bg-yellow-900/40 text-yellow-400'
                  : job.status === 'completed' ? 'bg-green-900/40 text-green-400'
                  : 'bg-red-900/40 text-red-400'
                }`}>
                  {isSearching ? 'Devam ediyor' : job.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                </span>
                {job.city && (
                  <span className="text-[11px] text-gray-600">{job.city} · {job.segment}</span>
                )}
              </div>
            </div>
            {!jobFailed && (
              <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${job.status === 'completed' ? 100 : Math.max(progress, 4)}%` }}
                />
              </div>
            )}
            {isSearching && (
              <p className="text-xs text-gray-600 mt-1.5">{companiesFound} / ~{ESTIMATED_TOTAL} tahmini</p>
            )}
            {jobFailed && job.error_message && (
              <p className="text-xs text-red-400 mt-2">{job.error_message}</p>
            )}
          </div>
        )}

        {allCompanies.length > 0 && !showEmailGen && (
          <CompaniesTable
            companies={allCompanies}
            onGenerateEmails={handleGenerateEmails}
            sentCompanyIds={sentCompanyIds}
            onEmailSent={handleEmailSent}
            onDeleteCompany={handleDeleteCompany}
            onResetAll={handleResetAll}
          />
        )}

        {showEmailGen && allCompanies.length > 0 && (
          <EmailGenerator
            companyIds={selectedIds}
            companies={allCompanies}
            onClose={handleEmailGenClose}
            onEmailSent={handleEmailSent}
          />
        )}

        {!showEmailGen && job?.status === 'completed' && allCompanies.length === 0 && (
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
