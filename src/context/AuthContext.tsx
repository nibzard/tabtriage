'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { User } from '@/components/auth/UserMenu'
import { logger } from '@/utils/logger'
import { getCurrentUserId } from '@/utils/auth-helper'

type AuthContextType = {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Function to fetch and set the current user
    const fetchUser = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Logged-in user with email
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            isAnonymous: false
          })
        } else {
          // No session, create or get anonymous user
          const userId = await getCurrentUserId()
          setUser({
            id: userId,
            isAnonymous: true
          })
        }
      } catch (error) {
        logger.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            isAnonymous: false
          })
        }
      } else if (event === 'SIGNED_OUT') {
        // Revert to anonymous user
        getCurrentUserId().then(userId => {
          setUser({
            id: userId,
            isAnonymous: true
          })
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}