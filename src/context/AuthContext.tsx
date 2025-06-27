'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
    const fetchUser = async () => {
      try {
        const userId = await getCurrentUserId()
        setUser({
          id: userId,
          isAnonymous: true
        })
      } catch (error) {
        logger.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}