'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'

export function Providers({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Hidratar o store do Zustand no cliente
    useAuthStore.persist.rehydrate()
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
