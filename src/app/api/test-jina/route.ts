import { NextResponse } from 'next/server';
import { updateTabEmbedding, hybridSearch, updateMissingEmbeddings, getEmbeddingStats, testJinaConnection } from '@/services/jinaEmbeddingService';
import { logger } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const userId = 'user_001'; // hardcoded for testing

    switch (action) {
      case 'stats':
        const stats = await getEmbeddingStats(userId);
        return NextResponse.json(stats);

      case 'test-embedding':
        const testText = url.searchParams.get('text') || 'Test embedding generation with Jina v3';
        const testId = 'test-' + Date.now();
        await updateTabEmbedding(testId, testText, 'text-matching');
        return NextResponse.json({ 
          success: true, 
          message: 'Jina v3 embedding generated successfully',
          testId,
          text: testText
        });

      case 'search':
        const query = url.searchParams.get('q') || 'machine learning';
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const vectorWeight = parseFloat(url.searchParams.get('vectorWeight') || '0.7');
        const textWeight = parseFloat(url.searchParams.get('textWeight') || '0.3');

        const results = await hybridSearch(query, userId, {
          limit,
          vectorWeight,
          textWeight,
          vectorTask: 'retrieval.query'
        });

        return NextResponse.json({
          query,
          resultsCount: results.length,
          results: results.slice(0, 5), // Return first 5 for API response
          searchConfig: { limit, vectorWeight, textWeight }
        });

      case 'update-embeddings':
        const batchSize = parseInt(url.searchParams.get('batchSize') || '20');
        const updatedCount = await updateMissingEmbeddings(userId, batchSize);
        return NextResponse.json({
          success: true,
          updatedCount,
          message: `Updated ${updatedCount} embeddings using Jina v3`
        });

      case 'test-connection':
        const connectionTest = await testJinaConnection();
        return NextResponse.json(connectionTest);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['stats', 'test-embedding', 'search', 'update-embeddings', 'test-connection'],
          examples: [
            '/api/test-jina?action=stats',
            '/api/test-jina?action=test-embedding&text=Your test text here',
            '/api/test-jina?action=search&q=your search query',
            '/api/test-jina?action=update-embeddings&batchSize=10'
          ]
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in Jina test API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, ...data } = await request.json();
    const userId = 'user_001';

    switch (action) {
      case 'bulk-search':
        const queries = data.queries || [];
        const searchResults = await Promise.all(
          queries.map(async (query: string) => {
            const results = await hybridSearch(query, userId, { limit: 5 });
            return { query, results: results.length, topResult: results[0] };
          })
        );
        return NextResponse.json({ searchResults });

      case 'embedding-benchmark':
        const testTexts = data.texts || [
          'Machine learning and artificial intelligence',
          'Web development with React and Next.js',
          'Database optimization and performance tuning',
          'Cloud computing and serverless architecture'
        ];

        const benchmarkResults = await Promise.all(
          testTexts.map(async (text: string, index: number) => {
            const startTime = Date.now();
            const testId = `benchmark-${Date.now()}-${index}`;
            await updateTabEmbedding(testId, text, 'classification');
            const endTime = Date.now();
            return {
              text,
              testId,
              processingTime: endTime - startTime,
              task: 'classification'
            };
          })
        );

        return NextResponse.json({ benchmarkResults });

      default:
        return NextResponse.json({
          error: 'Invalid POST action',
          availableActions: ['bulk-search', 'embedding-benchmark']
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in Jina test POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}