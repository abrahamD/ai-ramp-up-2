'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import UploadZone from '@/components/UploadZone';
import DocumentStatus from '@/components/DocumentStatus';
import SourceCitations from '@/components/SourceCitations';
import type { RetrievedChunk } from '@/lib/retriever';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  retrievedChunks?: RetrievedChunk[];
}

interface ExistingDocument {
  source: string;
  chunkCount: number;
}

export default function Home() {
  const [documentSource, setDocumentSource] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingDocs, setExistingDocs] = useState<ExistingDocument[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => setExistingDocs(data.documents ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUploadSuccess = (source: string, chunks: number) => {
    setDocumentSource(source);
    setChunkCount(chunks);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `Error: ${data.error ?? 'Something went wrong. Check the server logs for details.'}`,
          },
        ]);
        return;
      }

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.content,
          retrievedChunks: data.retrievedChunks ?? [],
        },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!documentSource) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Chat</h1>
            <p className="text-gray-500">Upload a PDF to start asking questions about it</p>
          </div>

          {existingDocs.length > 0 && (
            <div className="mb-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Continue with an existing document</h2>
              <ul className="space-y-2">
                {existingDocs.map((doc) => (
                  <li key={doc.source}>
                    <button
                      onClick={() => {
                        setDocumentSource(doc.source);
                        setChunkCount(doc.chunkCount);
                        setMessages([]);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl
                        border border-gray-200 hover:border-blue-400 hover:bg-blue-50
                        transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 truncate">{doc.source}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2 group-hover:text-blue-500">
                        {doc.chunkCount} chunks
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 text-center">— or upload a new document —</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <UploadZone onSuccess={handleUploadSuccess} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <DocumentStatus
        source={documentSource}
        chunkCount={chunkCount}
        onReset={() => setDocumentSource(null)}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">
                Ask a question about{' '}
                <span className="font-medium text-gray-600">{documentSource}</span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-2xl w-full ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none max-w-prose'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-500 italic my-2">{children}</blockquote>,
                          code: ({ children }) => <code className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 font-mono text-xs">{children}</code>,
                          hr: () => <hr className="my-3 border-gray-200" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.role === 'assistant' && message.retrievedChunks && (
                    <SourceCitations chunks={message.retrievedChunks} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your document..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </main>
  );
}
