import { supabase } from './supabase';
import { embedText } from './embeddings';

export interface RetrievedChunk {
  id: number;
  content: string;
  source: string;
  chunk_index: number;
  similarity: number;
}

const MATCH_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD ?? '0.5');

export async function retrieveChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Supabase retrieval failed: ${error.message}`);
  }

  return (data ?? []) as RetrievedChunk[];
}
