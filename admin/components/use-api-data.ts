'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { asApiError } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'

export function useApiData<T>(key: string, load: () => Promise<T>) {
  const router = useRouter()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loadRef.current()
      .then((next) => {
        if (!active) return
        setData(next)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        const apiError = asApiError(reason)
        if (apiError.status === 401) {
          router.replace('/login')
          return
        }
        setError(apiError)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [key, tick, router])

  return { data, error, loading, reload: () => setTick((value) => value + 1), setData }
}
