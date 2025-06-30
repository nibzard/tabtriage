import { NextRequest, NextResponse } from 'next/server'
import { bulkImportQueue } from '@/services/bulkImportService'
import { logger } from '@/utils/logger'

/**
 * GET /api/tabs/bulk-import-queue - Get queue status and user jobs
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const jobId = url.searchParams.get('jobId')

    // Get specific job status
    if (jobId) {
      const jobStatus = bulkImportQueue.getJobStatus(jobId)
      if (!jobStatus) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ job: jobStatus })
    }

    // Get user jobs
    if (userId) {
      const userJobs = bulkImportQueue.getUserJobs(userId)
      return NextResponse.json({ jobs: userJobs })
    }

    // Get global queue status
    const queueStatus = bulkImportQueue.getQueueStatus()
    return NextResponse.json(queueStatus)

  } catch (error) {
    logger.error('Error getting bulk import queue status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tabs/bulk-import-queue - Queue a new bulk import job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tabs, userId } = body

    if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tabs array' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // For very large imports, use the queue manager
    if (tabs.length > 50) {
      const jobId = await bulkImportQueue.queueBulkImport(userId, tabs)
      
      return NextResponse.json({
        queued: true,
        jobId,
        message: `Queued bulk import job for ${tabs.length} tabs`
      })
    }

    // For smaller imports, process immediately using existing batch API
    const response = await fetch(`${request.nextUrl.origin}/api/tabs/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs, userId })
    })

    if (!response.ok) {
      throw new Error('Failed to process immediate import')
    }

    const result = await response.json()
    
    return NextResponse.json({
      queued: false,
      ...result
    })

  } catch (error) {
    logger.error('Error queuing bulk import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tabs/bulk-import-queue - Cancel a job
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const cancelled = bulkImportQueue.cancelJob(jobId)
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      message: `Job ${jobId} cancelled successfully` 
    })

  } catch (error) {
    logger.error('Error cancelling bulk import job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}