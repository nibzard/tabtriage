import { NextRequest, NextResponse } from 'next/server'
import { exportTabs, ExportOptions, ExportFormat } from '@/services/exportService'
import { logger } from '@/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate export format
    const validFormats: ExportFormat[] = ['txt', 'csv', 'json', 'html']
    if (!body.format || !validFormats.includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid export format. Must be one of: txt, csv, json, html' },
        { status: 400 }
      )
    }

    // Build export options
    const options: ExportOptions = {
      format: body.format,
      includeMetadata: body.includeMetadata ?? true,
      filterByFolder: body.filterByFolder,
      filterByStatus: body.filterByStatus,
      filterByDateRange: body.filterByDateRange
    }

    // Validate date range if provided
    if (options.filterByDateRange) {
      const { start, end } = options.filterByDateRange
      if (!start || !end || new Date(start) > new Date(end)) {
        return NextResponse.json(
          { error: 'Invalid date range. Start date must be before end date.' },
          { status: 400 }
        )
      }
    }

    // Perform export
    const exportResult = await exportTabs(options)
    
    // Set appropriate headers for file download
    const headers = new Headers({
      'Content-Type': exportResult.mimeType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'X-Export-Count': exportResult.count.toString(),
      'X-Export-Format': options.format
    })

    // For JSON responses, return structured data
    if (options.format === 'json') {
      return NextResponse.json(
        {
          success: true,
          data: JSON.parse(exportResult.content),
          filename: exportResult.filename,
          count: exportResult.count
        },
        { status: 200, headers }
      )
    }

    // For other formats, return raw content
    return new NextResponse(exportResult.content, {
      status: 200,
      headers
    })
    
  } catch (error) {
    logger.error('Export API error:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('No tabs match')) {
        return NextResponse.json(
          { error: 'No tabs found matching the export criteria' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Unsupported export format')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as ExportFormat
    
    // Validate format
    const validFormats: ExportFormat[] = ['txt', 'csv', 'json', 'html']
    if (!format || !validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Format parameter is required. Must be one of: txt, csv, json, html' },
        { status: 400 }
      )
    }

    // Build export options from query parameters
    const options: ExportOptions = {
      format,
      includeMetadata: searchParams.get('includeMetadata') !== 'false',
      filterByFolder: searchParams.get('folder') || undefined,
      filterByStatus: searchParams.get('status') as any || undefined
    }

    // Handle date range filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      options.filterByDateRange = { start: startDate, end: endDate }
    }

    // Perform export
    const exportResult = await exportTabs(options)
    
    // Set headers for download
    const headers = new Headers({
      'Content-Type': exportResult.mimeType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'X-Export-Count': exportResult.count.toString(),
      'X-Export-Format': format
    })

    return new NextResponse(exportResult.content, {
      status: 200,
      headers
    })
    
  } catch (error) {
    logger.error('Export API GET error:', error)
    
    if (error instanceof Error && error.message.includes('No tabs match')) {
      return NextResponse.json(
        { error: 'No tabs found matching the export criteria' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}