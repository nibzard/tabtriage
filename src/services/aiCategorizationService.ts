import { logger } from '@/utils/logger'
import { GlobalRateLimitManager, RateLimitConfigs } from './rateLimitService'

const CATEGORIES = [
  'news', 'shopping', 'reference', 'social', 'entertainment', 
  'productivity', 'technology', 'health', 'travel', 'finance', 
  'education', 'other'
]

export async function categorizeTabWithAI(url: string, pageContent: string): Promise<string> {
  try {
    logger.debug(`Categorizing tab with AI: ${url}`)

    if (process.env.GEMINI_API_KEY && pageContent) {
      try {
        const prompt = `You are an expert at categorizing web pages. Assign one of the following categories to the given page content: ${CATEGORIES.join(', ')}.

URL: ${url}

Page Content: ${pageContent.substring(0, 4000)}

Respond with only the category name (one word).`

        // Use rate-limited Gemini API call
        const rateLimitManager = GlobalRateLimitManager.getInstance()
        const geminiService = rateLimitManager.getService('gemini', RateLimitConfigs.GEMINI)
        
        const response = await geminiService.enqueue(async () => {
          logger.debug(`Making rate-limited Gemini categorization call for: ${url}`)
          const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17'
          return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.1,
                topK: 10,
                topP: 0.8,
                maxOutputTokens: 10,
                responseMimeType: "text/plain"
              }
            })
          })
        }, 0) // Priority 0 for categorization (lower than summary)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('Invalid response structure from Gemini API')
        }

        const category = data.candidates[0].content.parts[0].text.trim().toLowerCase()

        if (CATEGORIES.includes(category)) {
          logger.debug(`Successfully categorized ${url} as: ${category}`)
          return category
        } else {
          logger.warn(`Gemini returned invalid category '${category}' for ${url}, falling back to simulation`)
        }
      } catch (apiError) {
        logger.error(`Error calling Gemini API for categorization of ${url}:`, apiError)
      }
    }

    // Fallback to simulation if API call fails or is not available
    return simulateCategorization(url, pageContent)
  } catch (error) {
    logger.error(`Error categorizing tab ${url}:`, error)
    return 'uncategorized'
  }
}

function simulateCategorization(url: string, content: string): string {
  const domain = url.split('/')[2] || ''
  const contentLower = content.toLowerCase()
  const urlLower = url.toLowerCase()

  if (contentLower.includes('news') || contentLower.includes('article') || domain.includes('news')) return 'news'
  if (contentLower.includes('buy') || contentLower.includes('price') || contentLower.includes('shop')) return 'shopping'
  if (contentLower.includes('learn') || contentLower.includes('guide') || contentLower.includes('documentation')) return 'reference'
  if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('instagram')) return 'social'
  if (domain.includes('youtube') || domain.includes('netflix') || urlLower.includes('game')) return 'entertainment'
  if (contentLower.includes('code') || contentLower.includes('programming') || domain.includes('github')) return 'technology'
  if (contentLower.includes('travel') || contentLower.includes('vacation') || contentLower.includes('hotel')) return 'travel'
  
  return 'uncategorized'
}