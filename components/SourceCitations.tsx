'use client';

import { useState } from 'react';
import type { RetrievedChunk } from '@/lib/retriever';

interface SourceCitationsProps {
  chunks: RetrievedChunk[];
}

function ChunkCard({ chunk }: { chunk: RetrievedChunk }) {
  const [expanded, setExpanded] = useState(false);
  const excerpt = chunk.content.slice(0, 150);
  const hasMore = chunk.content.length > 150;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="text-left w-full p-3 bg-gray-50 rounded-lg border border-gray-200
        hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">
          Chunk #{chunk.chunk_index + 1}
        </span>
        <span className="text-xs font-semibold text-blue-600 shrink-0">
          {(chunk.similarity * 100).toFixed(0)}% match
        </span>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed">
        {expanded ? chunk.content : `${excerpt}${hasMore ? '…' : ''}`}
      </p>
      {hasMore && (
        <p className="text-xs text-blue-500 mt-1.5">
          {expanded ? 'Show less' : 'Show more'}
        </p>
      )}
    </button>
  );
}

export default function SourceCitations({ chunks }: SourceCitationsProps) {
  const [open, setOpen] = useState(false);
  const displayChunks = chunks.slice(0, 3);

  if (displayChunks.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        Sources ({displayChunks.length})
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {displayChunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}
