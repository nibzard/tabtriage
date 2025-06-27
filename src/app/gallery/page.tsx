'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function GalleryRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const query = searchParams?.get('q')
    const url = query 
      ? `/workspace?mode=triage&q=${encodeURIComponent(query)}`
      : '/workspace?mode=triage'
    
    router.replace(url)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to workspace...</p>
      </div>
    </div>
  )
}