'use client'

import { useState } from 'react'

interface Props {
  onExport: () => void
}

export default function ExportToCSV({ onExport }: Props) {
  const [clicked, setClicked] = useState(false)

  const handle = () => {
    onExport()
    setClicked(true)
    setTimeout(() => setClicked(false), 2000)
  }

  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a3e] hover:border-[#3a3a5e] px-3 py-2 rounded-lg transition-colors"
    >
      {clicked ? '✓ İndirildi' : '⬇ CSV İndir'}
    </button>
  )
}
