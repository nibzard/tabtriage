'use client';

import { useState } from 'react';
import { updateTabEmbedding, hybridSearch, updateMissingEmbeddings, getEmbeddingStats } from '@/services/jinaEmbeddingService';

export default function TestJinaEmbeddings() {
  const [testText, setTestText] = useState('Machine learning is transforming modern web development');
  const [searchQuery, setSearchQuery] = useState('web development AI');
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const testEmbeddingGeneration = async () => {
    setLoading(true);
    setStatus('Testing Jina v3 embedding generation...');
    
    try {
      // Generate a test embedding
      const testTabId = 'test-' + Date.now();
      await updateTabEmbedding(testTabId, testText, 'text-matching');
      setStatus(`✅ Successfully generated Jina v3 embedding for test text`);
    } catch (error) {
      setStatus(`❌ Error generating embedding: ${error}`);
      console.error('Embedding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testHybridSearch = async () => {
    setLoading(true);
    setStatus('Testing Jina v3 hybrid search...');
    
    try {
      const searchResults = await hybridSearch(searchQuery, 'user_001', {
        limit: 10,
        vectorWeight: 0.7,
        textWeight: 0.3,
        vectorTask: 'retrieval.query'
      });
      
      setResults(searchResults);
      setStatus(`✅ Found ${searchResults.length} results using Jina v3 hybrid search`);
    } catch (error) {
      setStatus(`❌ Error in hybrid search: ${error}`);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllEmbeddings = async () => {
    setLoading(true);
    setStatus('Updating missing embeddings with Jina v3...');
    
    try {
      const updatedCount = await updateMissingEmbeddings('user_001', 20);
      setStatus(`✅ Updated ${updatedCount} embeddings using Jina v3`);
      
      // Refresh stats
      await loadEmbeddingStats();
    } catch (error) {
      setStatus(`❌ Error updating embeddings: ${error}`);
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmbeddingStats = async () => {
    try {
      const embeddingStats = await getEmbeddingStats('user_001');
      setStats(embeddingStats);
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  // Load stats on component mount
  useState(() => {
    loadEmbeddingStats();
  });

  return (
    <div className=\"max-w-4xl mx-auto p-6 space-y-6\">
      <div className=\"bg-white rounded-lg shadow-lg p-6\">
        <h1 className=\"text-2xl font-bold text-gray-900 mb-4\">
          🤖 Jina Embeddings v3 Test Suite
        </h1>
        <p className=\"text-gray-600 mb-6\">
          Test the integration of Jina Embeddings v3 with 1024-dimensional vectors and task-specific LoRA adapters.
        </p>

        {/* Embedding Stats */}
        {stats && (
          <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6\">
            <h3 className=\"text-lg font-semibold text-blue-900 mb-2\">📊 Embedding Statistics</h3>
            <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm\">
              <div>
                <span className=\"text-blue-600 font-medium\">Total Tabs:</span>
                <div className=\"text-2xl font-bold text-blue-900\">{stats.total}</div>
              </div>
              <div>
                <span className=\"text-green-600 font-medium\">With Embeddings:</span>
                <div className=\"text-2xl font-bold text-green-900\">{stats.withEmbeddings}</div>
              </div>
              <div>
                <span className=\"text-orange-600 font-medium\">Missing Embeddings:</span>
                <div className=\"text-2xl font-bold text-orange-900\">{stats.withoutEmbeddings}</div>
              </div>
              <div>
                <span className=\"text-purple-600 font-medium\">Coverage:</span>
                <div className=\"text-2xl font-bold text-purple-900\">{stats.percentage}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6\">
          <div>
            <label className=\"block text-sm font-medium text-gray-700 mb-2\">
              Test Text for Embedding:
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className=\"w-full p-3 border border-gray-300 rounded-lg\"
              rows={3}
              placeholder=\"Enter text to generate embedding...\"
            />
            <button
              onClick={testEmbeddingGeneration}
              disabled={loading}
              className=\"mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50\"
            >
              {loading ? 'Generating...' : '🧠 Test Jina v3 Embedding'}
            </button>
          </div>

          <div>
            <label className=\"block text-sm font-medium text-gray-700 mb-2\">
              Search Query:
            </label>
            <input
              type=\"text\"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className=\"w-full p-3 border border-gray-300 rounded-lg\"
              placeholder=\"Enter search query...\"
            />
            <button
              onClick={testHybridSearch}
              disabled={loading}
              className=\"mt-2 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50\"
            >
              {loading ? 'Searching...' : '🔍 Test Hybrid Search'}
            </button>
          </div>
        </div>

        {/* Batch Update */}
        <div className=\"mb-6\">
          <button
            onClick={updateAllEmbeddings}
            disabled={loading}
            className=\"w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50\"
          >
            {loading ? 'Updating...' : '⚡ Update All Missing Embeddings'}
          </button>
        </div>

        {/* Status */}
        {status && (
          <div className={`p-3 rounded-lg mb-4 ${
            status.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
            status.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {status}
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className=\"bg-gray-50 rounded-lg p-4\">
            <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">
              🔍 Search Results ({results.length})
            </h3>
            <div className=\"space-y-3\">
              {results.map((result, index) => (
                <div key={result.id} className=\"bg-white p-4 rounded-lg border border-gray-200\">
                  <div className=\"flex items-start justify-between mb-2\">
                    <h4 className=\"font-medium text-gray-900 truncate\">
                      {result.title || 'Untitled'}
                    </h4>
                    <div className=\"flex gap-2 text-xs\">
                      {result.score && (
                        <span className=\"bg-blue-100 text-blue-800 px-2 py-1 rounded\">
                          Score: {result.score.toFixed(3)}
                        </span>
                      )}
                      {result.vectorRank && (
                        <span className=\"bg-green-100 text-green-800 px-2 py-1 rounded\">
                          Vector: #{result.vectorRank}
                        </span>
                      )}
                      {result.textRank && (
                        <span className=\"bg-orange-100 text-orange-800 px-2 py-1 rounded\">
                          Text: #{result.textRank}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className=\"text-sm text-gray-600 mb-2\">
                    <a href={result.url} target=\"_blank\" rel=\"noopener noreferrer\" 
                       className=\"text-blue-600 hover:underline\">
                      {result.domain || result.url}
                    </a>
                  </div>
                  {result.summary && (
                    <p className=\"text-sm text-gray-700\">{result.summary}</p>
                  )}
                  {result.distance && (
                    <div className=\"text-xs text-gray-500 mt-2\">
                      Vector Distance: {result.distance.toFixed(4)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className=\"bg-gray-50 rounded-lg p-4 mt-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">🔧 Technical Details</h3>
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm\">
            <div>
              <h4 className=\"font-medium text-gray-700 mb-2\">Jina v3 Features:</h4>
              <ul className=\"text-gray-600 space-y-1\">
                <li>• 1024-dimensional embeddings (Matryoshka)</li>
                <li>• Task-specific LoRA adapters</li>
                <li>• Multilingual support (30+ languages)</li>
                <li>• Up to 8192 token sequences</li>
              </ul>
            </div>
            <div>
              <h4 className=\"font-medium text-gray-700 mb-2\">Search Implementation:</h4>
              <ul className=\"text-gray-600 space-y-1\">
                <li>• Hybrid vector + text search</li>
                <li>• Turso native F32_BLOB vectors</li>
                <li>• SQLite FTS5 with BM25 scoring</li>
                <li>• Configurable search weights</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}