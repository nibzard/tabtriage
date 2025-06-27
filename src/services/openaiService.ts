import { logger } from '@/utils/logger'

// Function to generate a summary using OpenAI GPT-4o-mini
export async function generateSummaryWithAI(url: string, pageContent: string): Promise<{
  summary: string;
  tags: string[];
}> {
  try {
    logger.debug(`Generating AI summary for: ${url}`)

    // Default fallback values
    let summary = 'No summary available.'
    let tags: string[] = []

    // If we have page content, we can generate a better summary
    if (pageContent && pageContent.length > 0) {
      // Use OpenAI API in production, fallback to simulation in development
      if (process.env.OPENAI_API_KEY) {
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
                  content: 'You are a helpful assistant that summarizes web pages. Provide a concise summary (30-50 words) and 2-4 relevant tags. Format your response as JSON with fields "summary" and "tags" (array).'
                },
                {
                  role: 'user',
                  content: `URL: ${url}\n\nPage Content: ${pageContent.substring(0, 4000)}`
                }
              ],
              temperature: 0.3,
              max_tokens: 250
            })
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          const aiResponseText = data.choices[0].message.content

          try {
            // Try to parse as JSON
            const aiResponse = JSON.parse(aiResponseText)
            summary = aiResponse.summary || summary
            tags = aiResponse.tags || tags

            logger.debug(`Successfully parsed AI response as JSON for ${url}`)
          } catch (parseError) {
            // If not valid JSON, try to extract information from text
            logger.warn(`Failed to parse AI response as JSON for ${url}, extracting manually`)

            // Extract summary (assume it's the first paragraph)
            const summaryMatch = aiResponseText.match(/summary.*?:.*?["']?(.*?)["']?[,\n]/i)
            if (summaryMatch && summaryMatch[1]) {
              summary = summaryMatch[1].trim()
            }

            // Extract tags
            const tagsMatch = aiResponseText.match(/tags.*?:.*?\[(.*?)\]/i)
            if (tagsMatch && tagsMatch[1]) {
              tags = tagsMatch[1].split(',').map((tag: string) =>
                tag.trim().replace(/["']/g, '')
              ).filter(Boolean)
            }
          }

          logger.debug(`Generated AI summary for ${url}: ${summary.substring(0, 50)}...`)
          return { summary, tags }
        } catch (apiError) {
          logger.error(`Error calling OpenAI API for ${url}:`, apiError)
          // Fall back to simulation if API call fails
        }
      }

      // For now, generate a simulated response based on the URL and content
      const simulatedResponse = simulateAIResponse(url, pageContent)
      summary = simulatedResponse.summary
      tags = simulatedResponse.tags
    } else {
      // If no content, generate based on URL only
      const urlParts = url.split('/')
      const domain = urlParts[2] || ''

      // Generate a simple summary based on the domain
      summary = `This is a page from ${domain}.`

      // Generate tags from domain and URL path
      const potentialTags = [...domain.split('.'), ...urlParts.slice(3)]
        .filter(part => part.length > 3 && !['com', 'org', 'net', 'www', 'http', 'https'].includes(part))
        .slice(0, 3)

      tags = potentialTags.length > 0 ? potentialTags : ['webpage']
    }

    logger.debug(`Generated summary for ${url}: ${summary.substring(0, 50)}...`)

    return {
      summary,
      tags
    }
  } catch (error) {
    logger.error(`Error generating AI summary for ${url}:`, error)

    // Return default values on error
    return {
      summary: 'Failed to generate summary.',
      tags: ['error']
    }
  }
}

// Function to simulate AI response for development
function simulateAIResponse(url: string, content: string): {
  summary: string;
  tags: string[];
} {
  // Extract domain from URL
  const domain = url.split('/')[2] || ''

  // Generate a random summary based on content length
  let summary = ''
  if (content.length > 1000) {
    // Use some content words for the summary
    const words = content
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 200)

    const randomStart = Math.floor(Math.random() * Math.max(1, words.length - 20))
    summary = words.slice(randomStart, randomStart + 15).join(' ') + '...'
  } else {
    summary = `This page from ${domain} contains information that might be relevant to your interests.`
  }

  // Generate tags from content
  const potentialTags = [
    'article', 'blog', 'news', 'shopping', 'product', 'review', 'guide', 'tutorial',
    'reference', 'social', 'media', 'video', 'entertainment', 'technology', 'health',
    'travel', 'finance', 'education', 'science', 'sports', 'food', 'recipe', 'fitness'
  ]

  const tags = potentialTags
    .filter(tag => content.toLowerCase().includes(tag) || url.toLowerCase().includes(tag))
    .slice(0, 3)

  // Add at least one tag if none were found
  if (tags.length === 0) {
    tags.push('general')
  }

  return {
    summary,
    tags
  }
}