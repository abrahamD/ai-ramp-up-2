interface DocumentStatusProps {
  source: string;
  chunkCount: number;
  onReset: () => void;
}

export default function DocumentStatus({
  source,
  chunkCount,
  onReset,
}: DocumentStatusProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-green-50 border-b border-green-200">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium text-green-800 truncate">{source}</span>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
          {chunkCount} chunks
        </span>
      </div>
      <button
        onClick={onReset}
        className="text-xs text-green-700 hover:text-green-900 underline shrink-0 ml-4"
      >
        Upload new document
      </button>
    </div>
  );
}
