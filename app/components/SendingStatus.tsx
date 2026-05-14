'use client'

import { Company } from '@/lib/types'

interface Props {
  company: Company
  status: 'sending' | 'success' | 'error'
  messageId?: string
  error?: string
  onNext?: () => void
  onRetry?: () => void
}

export default function SendingStatus({
  company,
  status,
  messageId,
  error,
  onNext,
  onRetry,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85">
      <div className="bg-[#0f0f13] border border-[#2a2a3e] rounded-2xl w-full max-w-md shadow-2xl p-8 text-center">

        {status === 'sending' && (
          <>
            <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-white font-semibold text-sm">
              {company.name} için email gönderiliyor...
            </p>
            <p className="text-xs text-gray-600 mt-2">Tahmini süre: 2-3 saniye</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-white font-semibold text-sm mb-1">Email gönderildi!</p>
            <p className="text-sm text-accent mb-4">{company.email}</p>
            {messageId && (
              <p className="text-[11px] text-gray-700 font-mono bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-1.5 mb-5 break-all">
                Message-ID: {messageId}
              </p>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Sonraki Taslak →
              </button>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-white font-semibold text-sm mb-1">Gönderilemedi</p>
            <p className="text-sm text-gray-400 mb-3">{company.email}</p>
            {error && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 mb-5">
                {error}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm bg-accent hover:bg-[#00a8ae] text-[#0f0f13] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  ↺ Tekrar Dene
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="text-sm text-gray-400 hover:text-white border border-[#2a2a3e] px-4 py-2 rounded-lg transition-colors"
                >
                  Atla →
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
