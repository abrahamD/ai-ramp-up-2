import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('documents')
    .select('source, chunk_index')
    .order('source');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by source and count chunks
  const countBySource = new Map<string, number>();
  for (const row of data ?? []) {
    countBySource.set(row.source, (countBySource.get(row.source) ?? 0) + 1);
  }

  const documents = Array.from(countBySource.entries()).map(([source, chunkCount]) => ({
    source,
    chunkCount,
  }));

  return NextResponse.json({ documents });
}
