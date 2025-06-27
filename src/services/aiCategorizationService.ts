import { logger } from '@/utils/logger'

const CATEGORIES = [
  'news', 'shopping', 'reference', 'social', 'entertainment', 
  'productivity', 'technology', 'health', 'travel', 'finance', 
  'education', 'other'
]

export async function categorizeTabWithAI(url: string, pageContent: string): Promise<string> {
  try {
    logger.debug(`Categorizing tab with AI: ${url}`)

    if (process.env.OPENAI_API_KEY && pageContent) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert at categorizing web pages. Assign one of the following categories to the given page content: ${CATEGORIES.join(', ')}. Respond with only the category name.`
              },
              {
                role: 'user',
                content: `URL: ${url}\n\nPage Content: ${pageContent.substring(0, 4000)}`
              }
            ],
            temperature: 0.1,
            max_tokens: 10
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const category = data.choices[0].message.content.trim().toLowerCase()

        if (CATEGORIES.includes(category)) {
          logger.debug(`Successfully categorized ${url} as: ${category}`)
          return category
        }
      } catch (apiError) {
        logger.error(`Error calling OpenAI API for categorization of ${url}:`, apiError)
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