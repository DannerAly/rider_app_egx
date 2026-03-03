'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export default function SearchBar() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  // Debounce 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) { params.set('q', value.trim()); params.delete('page') }
      else              { params.delete('q') }
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    }, 400)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
        {pending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Search  className="w-4 h-4" />}
      </div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Buscar por # pedido, dirección, rider..."
        className="w-full sm:w-72 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 bg-white transition-colors"
      />
      {value && (
        <button onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
