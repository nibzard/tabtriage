'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserMenu } from '@/components/auth/UserMenu'
import { SettingsDropdown } from '@/components/ui/SettingsDropdown'
import { useAuth } from '@/context/AuthContext'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">TabTriage</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/dashboard" className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Dashboard
            </Link>
            <Link href="/import" className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Import
            </Link>
            <Link href="/workspace" className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Workspace
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <UserMenu user={user} />
            <SettingsDropdown />

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                className="text-gray-600 dark:text-gray-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4"
          >
            <div className="flex flex-col space-y-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
              <Link
                href="/dashboard"
                className="px-4 py-3 rounded-md text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/import"
                className="px-4 py-3 rounded-md text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Import
              </Link>
              <Link
                href="/workspace"
                className="px-4 py-3 rounded-md text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Workspace
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}