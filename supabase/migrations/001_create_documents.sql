-- Enable the pgvector extension
create extension if not exists vector;

-- Documents table: one row per chunk
create table documents (
  id          bigserial primary key,
  content     text        not null,
  embedding   vector(1536) not null,
  source      text        not null,  -- original filename
  chunk_index integer     not null,
  created_at  timestamptz default now()
);

-- IVFFlat index for fast approximate nearest-neighbour search
create index on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function used by the retriever
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count     int
)
returns table (
  id          bigint,
  content     text,
  source      text,
  chunk_index integer,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    source,
    chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
