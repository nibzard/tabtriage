import { logger } from '@/utils/logger'
import { GlobalRateLimitManager, RateLimitConfigs } from './rateLimitService'

// Function to generate a summary using Google Gemini
export async function generateSummaryWithAI(url: string, pageContent: string): Promise<{
  summary: string;
  tags: string[];
}> {
  try {
    logger.debug(`Generating AI summary with Gemini for: ${url}`)

    // Default fallback values
    let summary = 'No summary available.'
    let tags: string[] = []

    // If we have page content, we can generate a better summary
    if (pageContent && pageContent.length > 0) {
      // Use Gemini API if available, fallback to simulation in development
      if (process.env.GEMINI_API_KEY) {
        try {
          const prompt = `Please analyze the following web page content and provide:
1. A concise summary in 30-50 words
2. 2-4 relevant tags

URL: ${url}

Page Content: ${pageContent.substring(0, 6000)}

Please format your response as JSON with exactly these fields:
{
  "summary": "your summary here",
  "tags": ["tag1", "tag2", "tag3"]
}`

          // Use rate-limited Gemini API call
          const rateLimitManager = GlobalRateLimitManager.getInstance()
          const geminiService = rateLimitManager.getService('gemini', RateLimitConfigs.GEMINI)
          
          const response = await geminiService.enqueue(async () => {
            logger.debug(`Making rate-limited Gemini API call for: ${url}`)
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
                  temperature: 0.3,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 300,
                  responseMimeType: "text/plain"
                }
              })
            })
          }, 1) // Priority 1 for summary generation

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
          }

          const data = await response.json()
          
          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response structure from Gemini API')
          }

          const aiResponseText = data.candidates[0].content.parts[0].text

          try {
            // Try to parse as JSON
            const cleanedResponse = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const aiResponse = JSON.parse(cleanedResponse)
            
            if (aiResponse.summary && typeof aiResponse.summary === 'string') {
              summary = aiResponse.summary.trim()
            }
            
            if (aiResponse.tags && Array.isArray(aiResponse.tags)) {
              tags = aiResponse.tags.filter(tag => typeof tag === 'string' && tag.length > 0).slice(0, 4)
            }

            logger.debug(`Successfully parsed Gemini response as JSON for ${url}`)
          } catch (parseError) {
            // If not valid JSON, try to extract information from text
            logger.warn(`Failed to parse Gemini response as JSON for ${url}, extracting manually`)

            // Extract summary (look for summary field or take first paragraph)
            const summaryMatch = aiResponseText.match(/["']?summary["']?\s*:\s*["']([^"']+)["']/i) ||
                                 aiResponseText.match(/summary:\s*([^\n]+)/i) ||
                                 aiResponseText.match(/^([^.!?]*[.!?])/m)
            
            if (summaryMatch && summaryMatch[1]) {
              summary = summaryMatch[1].trim().replace(/^["']|["']$/g, '')
            }

            // Extract tags
            const tagsMatch = aiResponseText.match(/["']?tags["']?\s*:\s*\[([^\]]+)\]/i)
            if (tagsMatch && tagsMatch[1]) {
              tags = tagsMatch[1]
                .split(',')
                .map(tag => tag.trim().replace(/["']/g, ''))
                .filter(tag => tag.length > 0)
                .slice(0, 4)
            } else {
              // Try to extract tags from text
              const tagWords = aiResponseText.match(/\b\w{3,12}\b/g) || []
              tags = [...new Set(tagWords)]
                .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word.toLowerCase()))
                .slice(0, 3)
            }
          }

          logger.debug(`Generated Gemini summary for ${url}: ${summary.substring(0, 50)}...`)
          return { summary, tags }

        } catch (apiError) {
          logger.error(`Error calling Gemini API for ${url}:`, apiError)
          // Fall back to simulation if API call fails
        }
      } else {
        logger.info('GEMINI_API_KEY not found, falling back to simulation')
      }

      // Fall back to simulation if Gemini API is not available or fails
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

// Function to simulate AI response for development/fallback
function simulateAIResponse(url: string, content: string): {
  summary: string;
  tags: string[];
} {
  try {
    // Extract domain from URL
    const domain = url.split('/')[2] || ''

    // Generate a more intelligent summary based on content
    let summary = ''
    if (content.length > 500) {
      // Extract meaningful sentences from the content
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200)
        .filter(s => !s.toLowerCase().includes('cookie') && !s.toLowerCase().includes('privacy'))

      if (sentences.length > 0) {
        // Pick the first meaningful sentence or combine a few short ones
        const firstSentence = sentences[0]
        if (firstSentence.length > 80) {
          summary = firstSentence.substring(0, 100) + '...'
        } else if (sentences.length > 1) {
          const combined = sentences.slice(0, 2).join('. ')
          summary = combined.length > 120 ? combined.substring(0, 120) + '...' : combined
        } else {
          summary = firstSentence
        }
      } else {
        summary = `This page from ${domain} contains information that might be relevant to your interests.`
      }
    } else {
      summary = `This page from ${domain} contains information that might be relevant to your interests.`
    }

    // Generate more intelligent tags from content and URL
    const contentLower = content.toLowerCase()
    const urlLower = url.toLowerCase()
    
    const techKeywords = ['github', 'api', 'code', 'programming', 'development', 'software', 'tech', 'tutorial', 'documentation']
    const blogKeywords = ['blog', 'article', 'post', 'news', 'story', 'guide', 'review']
    const productKeywords = ['product', 'shop', 'buy', 'price', 'store', 'commerce']
    
    let tags: string[] = []
    
    // Check for technical content
    if (techKeywords.some(keyword => contentLower.includes(keyword) || urlLower.includes(keyword))) {
      tags.push('technology')
    }
    
    // Check for blog/article content
    if (blogKeywords.some(keyword => contentLower.includes(keyword) || urlLower.includes(keyword))) {
      tags.push('article')
    }
    
    // Check for product/commercial content
    if (productKeywords.some(keyword => contentLower.includes(keyword) || urlLower.includes(keyword))) {
      tags.push('product')
    }
    
    // Add domain-based tags
    if (domain.includes('github')) tags.push('github')
    else if (domain.includes('stackoverflow')) tags.push('programming')
    else if (domain.includes('medium') || domain.includes('blog')) tags.push('blog')
    else if (domain.includes('youtube')) tags.push('video')
    else if (domain.includes('linkedin')) tags.push('professional')
    
    // Ensure we have at least one tag
    if (tags.length === 0) {
      tags.push('general')
    }
    
    // Limit to 4 tags and remove duplicates
    tags = [...new Set(tags)].slice(0, 4)

    return {
      summary: summary.trim(),
      tags
    }
  } catch (error) {
    logger.error('Error in simulateAIResponse:', error)
    return {
      summary: 'Content summary not available.',
      tags: ['general']
    }
  }
}