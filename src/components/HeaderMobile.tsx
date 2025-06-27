'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Upload, Grid3X3, FolderOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUI } from '@/hooks/useUI'

export function HeaderMobile() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUI()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Import', href: '/import', icon: Upload },
    { name: 'Gallery', href: '/gallery', icon: Grid3X3 },
    { name: 'Folders', href: '/folders', icon: FolderOpen },
  ]

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border safe-area-inset-top">
        <div className="flex items-center justify-between h-14 mobile-padding-x">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo/Title */}
          <Link href="/" className="text-lg font-semibold text-foreground">
            TabTriage
          </Link>

          {/* Search Button */}
          <Button variant="ghost" size="icon" className="touch-target">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="safe-area-inset-top">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-14 mobile-padding-x border-b border-border">
            <span className="text-lg font-semibold">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg touch-target transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border safe-area-inset-bottom">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-accent/50">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">U</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">User</p>
                <p className="text-xs text-muted-foreground">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden lg:block bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 mobile-padding-x">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-foreground">
            TabTriage
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}