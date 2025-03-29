'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-primary-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <motion.div
            className="md:w-1/2 mb-10 md:mb-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Tame Your Safari Tab Chaos
            </h1>
            <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
              TabTriage helps you organize your overwhelming Safari tabs with AI-powered categorization,
              summaries, and a visual triage interface.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/import" className="btn-primary text-center">
                Import Your Tabs
              </Link>
              <Link href="#features" className="btn-secondary text-center">
                Learn More
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="md:w-1/2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative h-[400px] w-full rounded-lg shadow-xl overflow-hidden">
              {/* Placeholder for hero image - replace with actual screenshot */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-secondary-200 dark:from-primary-800 dark:to-secondary-800 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-800 dark:text-white">
                  TabTriage Interface
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}