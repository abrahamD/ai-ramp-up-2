import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { retrieveChunks } from '@/lib/retriever';
import type { RetrievedChunk } from '@/lib/retriever';

const client = new Anthropic();

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const excerpts = chunks
    .map(
      (c, i) =>
        `[EXCERPT ${i + 1} — similarity: ${c.similarity.toFixed(2)}]\n${c.content}`
    )
    .join('\n\n');

  return `You are answering questions about a document. Use ONLY the following excerpts to answer.
If the answer is not in the excerpts, say "I couldn't find that in the document."

---
${excerpts}
---`;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const lastUserMessage =
    [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'user')?.content ?? '';

  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieveChunks(lastUserMessage);
  } catch (err) {
    console.error('Retrieval failed:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }

  if (chunks.length === 0) {
    return NextResponse.json({
      content:
        "I couldn't find relevant information in the document for that question. Try rephrasing, or upload a document if you haven't already.",
      retrievedChunks: [],
    });
  }

  const systemPrompt = buildSystemPrompt(chunks);

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return NextResponse.json(
    { content, retrievedChunks: chunks },
    {
      headers: {
        'X-Retrieved-Chunks': chunks.map((c) => c.id).join(','),
      },
    }
  );
}
