import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/lib/chunker';
import { embedBatch } from '@/lib/embeddings';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { text?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, source } = body;

  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'text (string) is required' },
      { status: 400 }
    );
  }

  if (!source || typeof source !== 'string') {
    return NextResponse.json(
      { error: 'source (string) is required' },
      { status: 400 }
    );
  }

  const chunks = chunkText(text);

  let embeddings: number[][];
  try {
    embeddings = await embedBatch(chunks.map((c) => c.content));
  } catch (err) {
    console.error('Embedding error:', err);
    return NextResponse.json(
      { error: 'Embedding service unavailable. Please try again.' },
      { status: 502 }
    );
  }

  await supabase.from('documents').delete().eq('source', source);

  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: embeddings[i],
    source,
    chunk_index: chunk.index,
  }));

  const { error } = await supabase.from('documents').insert(rows);

  if (error) {
    console.error('Insert error:', error);
    return NextResponse.json(
      { error: 'Failed to store document chunks', detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, chunkCount: chunks.length, source });
}
