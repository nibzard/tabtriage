'use client'

import Link from 'next/link'
import { Header } from '@/components/Header'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Simplified Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-primary-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center max-w-5xl mx-auto">
            <motion.div
              className="md:w-1/2 mb-10 md:mb-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                End Tab Chaos Now
              </h1>
              <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
                Import, sort, and organize your tab mess in minutes.
              </p>
              <Link href="/import" className="btn-primary text-center text-lg px-8 py-4 rounded-lg inline-block">
                Import Your Tabs
              </Link>
            </motion.div>

            <motion.div
              className="md:w-1/2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative h-[350px] w-full rounded-lg shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-secondary-200 dark:from-primary-800 dark:to-secondary-800 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Tab Management Made Easy
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Value Proposition Steps */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="text-primary-600 dark:text-primary-400 mb-4 flex justify-center">
                  <span className="text-3xl font-bold bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 w-12 h-12 rounded-full flex items-center justify-center">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Import</h3>
                <p className="text-gray-600 dark:text-gray-300">Paste your tabs from Safari or upload from a file</p>
              </motion.div>
              
              <motion.div 
                className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-primary-600 dark:text-primary-400 mb-4 flex justify-center">
                  <span className="text-3xl font-bold bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 w-12 h-12 rounded-full flex items-center justify-center">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Triage</h3>
                <p className="text-gray-600 dark:text-gray-300">Quickly swipe to keep or discard tabs</p>
              </motion.div>
              
              <motion.div 
                className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="text-primary-600 dark:text-primary-400 mb-4 flex justify-center">
                  <span className="text-3xl font-bold bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 w-12 h-12 rounded-full flex items-center justify-center">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Organize</h3>
                <p className="text-gray-600 dark:text-gray-300">Sort tabs into folders with AI-assisted categorization</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-12 bg-primary-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">Reclaim your browser today</h2>
          <Link
            href="/import"
            className="btn-primary text-lg px-8 py-3"
          >
            Import Tabs
          </Link>
        </div>
      </section>
    </main>
  )
}