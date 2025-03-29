import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Create GTE-Small embedding session
const session = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  try {
    // Extract input string from JSON body
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input. Please provide a text string.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate the embedding from the input text
    const embedding = await session.run(text, {
      mean_pool: true,
      normalize: true,
    });
    
    // Return the embedding
    return new Response(
      JSON.stringify({ embedding }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate embedding' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});