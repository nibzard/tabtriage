// Simple test script to verify rate limiting functionality
const { GlobalRateLimitManager, RateLimitConfigs } = require('./src/services/rateLimitService.ts')

async function testRateLimit() {
  console.log('Testing rate limiting service...')
  
  // Create a test service with very low rate limit for testing
  const manager = GlobalRateLimitManager.getInstance()
  const testService = manager.getService('test', { requestsPerMinute: 3 })
  
  console.log('Initial status:', testService.getStatus())
  
  // Queue 10 requests
  const requests = []
  for (let i = 0; i < 10; i++) {
    const promise = testService.enqueue(async () => {
      console.log(`Request ${i + 1} executing at ${new Date().toISOString()}`)
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
      return `Result ${i + 1}`
    })
    requests.push(promise)
  }
  
  console.log('Queued 10 requests, waiting for results...')
  
  try {
    const results = await Promise.all(requests)
    console.log('All requests completed:', results)
  } catch (error) {
    console.error('Error:', error)
  }
  
  console.log('Final status:', testService.getStatus())
  console.log('Test completed!')
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  testRateLimit().catch(console.error)
}

module.exports = { testRateLimit }