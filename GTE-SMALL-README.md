# GTE-Small Embedding Setup Guide

This guide explains how to set up and use the GTE-Small embedding model with Supabase Edge Functions for TabTriage.

## What is GTE-Small?

GTE-Small (General Text Embeddings) is a compact but powerful embedding model developed by Alibaba DAMO Academy, fine-tuned for text embedding tasks. It generates 384-dimensional embeddings that work well for semantic search and text similarity.

Benefits:
- Runs efficiently in Edge Functions (smaller than other embedding models)
- 384-dimensional embeddings (good balance of size and quality)
- Built specifically for text embedding tasks
- Compatible with pgvector for vector search

## Setup Instructions

### 1. Start the Local Supabase Stack

First, make sure your local Supabase stack is running:

```bash
supabase start
```

### 2. Run the Edge Function

Start the GTE-Small embedding edge function:

```bash
# Use the provided script
./deploy-edge-function.sh

# Or run directly
supabase functions serve generate-embeddings --no-verify-jwt
```

The function will be available at:
http://127.0.0.1:54321/functions/v1/generate-embeddings

### 3. Test the Function

Use the "GTE-Small Edge Function Test" UI in the `/test-supabase` page to test the function directly.

## Usage in Code

The Edge Function can be invoked in two ways:

### 1. Using the Supabase Client

```typescript
import { supabase } from '@/utils/supabase';

// Generate embedding
const { data, error } = await supabase.functions.invoke('generate-embeddings', {
  body: { text: "The text to generate embedding for" }
});

if (error) {
  console.error('Error generating embedding:', error);
  return;
}

const embedding = data.embedding;
console.log(`Generated ${embedding.length}-dimensional embedding`);
```

### 2. Using Direct Fetch (more reliable)

```typescript
// Generate embedding using fetch
const response = await fetch('http://127.0.0.1:54321/functions/v1/generate-embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text: "The text to generate embedding for" }),
});

if (!response.ok) {
  console.error('Error generating embedding:', response.statusText);
  return;
}

const data = await response.json();
const embedding = data.embedding;
console.log(`Generated ${embedding.length}-dimensional embedding`);
```

## Troubleshooting

### Function Not Responding

If the function isn't responding, make sure:
1. The local Supabase stack is running (`supabase start`)
2. The edge function is running (`supabase functions serve generate-embeddings --no-verify-jwt`)
3. Your browser is allowing requests to local endpoints (CORS)

### CORS Issues

If you see CORS errors, you may need to:
1. Add your origin to the allowed origins in the Edge Function
2. Use the Supabase client instead of direct fetch

### Model Loading Errors

The first request may take longer as the model needs to download. Subsequent requests will be faster.

## Production Deployment

For production, deploy the edge function to your Supabase project:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy generate-embeddings

# Verify deployment
supabase functions list
```

## Reference

For more information on the GTE-Small model, visit:
https://huggingface.co/Supabase/gte-small