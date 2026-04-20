import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { embedText } from '@/lib/embeddings';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? 'what is this document about';

  // How many chunks are stored?
  const { count, error: countError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (!count || count === 0) {
    return NextResponse.json({ documentCount: 0, message: 'No documents in DB — upload failed silently or wrong Supabase project.' });
  }

  // Embed the query and run match with threshold=0 so we see ALL scores
  let topResults: unknown[] = [];
  let rpcError: string | null = null;
  try {
    const queryEmbedding = await embedText(query);
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0,
      match_count: 5,
    });
    topResults = data ?? [];
    rpcError = error?.message ?? null;
  } catch (err) {
    rpcError = String(err);
  }

  return NextResponse.json({
    documentCount: count,
    query,
    topResults,
    rpcError,
    suggestion:
      topResults.length > 0
        ? `Highest similarity: ${(topResults as { similarity: number }[])[0]?.similarity?.toFixed(4)}. If this is below 0.5, lower RAG_SIMILARITY_THRESHOLD in .env.local.`
        : 'No results even at threshold=0. The vectors may be stored in the wrong format.',
  });
}
