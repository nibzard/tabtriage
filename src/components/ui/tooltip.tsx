'use client'

import { useState, ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ 
  content, 
  children, 
  className = '', 
  position = 'top',
  delay = 300 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft
      const scrollY = window.pageYOffset || document.documentElement.scrollTop
      
      let top = 0
      let left = 0
      
      switch (position) {
        case 'top':
          top = rect.top + scrollY - 8
          left = rect.left + scrollX + rect.width / 2
          break
        case 'bottom':
          top = rect.bottom + scrollY + 8
          left = rect.left + scrollX + rect.width / 2
          break
        case 'left':
          top = rect.top + scrollY + rect.height / 2
          left = rect.left + scrollX - 8
          break
        case 'right':
          top = rect.top + scrollY + rect.height / 2
          left = rect.right + scrollX + 8
          break
      }
      
      setTooltipPosition({ top, left })
    }
    
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  const getTransformClasses = () => {
    switch (position) {
      case 'top':
      case 'bottom':
        return '-translate-x-1/2'
      case 'left':
        return '-translate-x-full -translate-y-1/2'
      case 'right':
        return '-translate-y-1/2'
      default:
        return '-translate-x-1/2'
    }
  }

  const tooltipContent = isVisible && content && isMounted && (
    <div 
      className={`fixed z-[9999] px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg whitespace-nowrap max-w-xs break-words pointer-events-none ${getTransformClasses()} ${className}`}
      style={{
        top: position === 'top' ? tooltipPosition.top : tooltipPosition.top,
        left: tooltipPosition.left,
        transform: getTransformClasses() === '-translate-x-1/2' ? 'translateX(-50%)' :
                  getTransformClasses() === '-translate-y-1/2' ? 'translateY(-50%)' :
                  getTransformClasses() === '-translate-x-full -translate-y-1/2' ? 'translate(-100%, -50%)' : 'none'
      }}
    >
      {content}
    </div>
  )

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isMounted && tooltipContent && createPortal(tooltipContent, document.body)}
    </div>
  )
}