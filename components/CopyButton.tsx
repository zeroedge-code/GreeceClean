'use client'

import { useState } from 'react'
import { useLocale } from './LocaleProvider'

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const { t } = useLocale()

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      {copied ? t.copy.copied : t.copy.copy}
    </button>
  )
}
