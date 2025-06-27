'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Upload, Layers, User } from 'lucide-react'
import { motion } from 'framer-motion'

export function MobileNavigation() {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      description: 'Dashboard'
    },
    {
      name: 'Import',
      href: '/import',
      icon: Upload,
      description: 'Add tabs'
    },
    {
      name: 'Workspace',
      href: '/workspace',
      icon: Layers,
      description: 'Triage & Organize'
    },
    {
      name: 'Profile',
      href: '/auth/sign-in',
      icon: User,
      description: 'Account'
    }
  ]

  return (
    <nav className="mobile-nav lg:hidden">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center"
            >
              <item.icon className="mobile-nav-icon" />
              <span className="text-xs font-medium">
                {item.name}
              </span>
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.div>
          </Link>
        )
      })}
    </nav>
  )
}