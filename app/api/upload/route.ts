import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { chunkText } from '@/lib/chunker';
import { embedBatch } from '@/lib/embeddings';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'File must be a PDF (application/pdf)' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10 MB.' },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let pdfText: string;
  try {
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text?.trim() ?? '';
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse PDF file' },
      { status: 422 }
    );
  }

  if (!pdfText || pdfText.length === 0) {
    return NextResponse.json(
      {
        error:
          'This PDF appears to be a scanned image. Text extraction is not supported yet.',
      },
      { status: 422 }
    );
  }

  const chunks = chunkText(pdfText);

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

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('source', file.name);

  if (deleteError) {
    console.error('Delete error:', deleteError);
  }

  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: embeddings[i],
    source: file.name,
    chunk_index: chunk.index,
  }));

  const { error: insertError } = await supabase.from('documents').insert(rows);

  if (insertError) {
    console.error('Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to store document chunks', detail: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    chunkCount: chunks.length,
    source: file.name,
  });
}
