export interface Chunk {
  content: string;
  index: number;
}

const CHUNK_SIZE_CHARS = 500 * 4; // ~500 tokens at 4 chars/token
const OVERLAP_CHARS = 50 * 4;     // ~50 tokens overlap
const MIN_CHUNK_LENGTH = 50;

export function chunkText(text: string): Chunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, cleaned.length);
    const content = cleaned.slice(start, end).trim();

    if (content.length >= MIN_CHUNK_LENGTH) {
      chunks.push({ content, index });
      index++;
    }

    if (end >= cleaned.length) break;
    start = end - OVERLAP_CHARS;
  }

  return chunks;
}
