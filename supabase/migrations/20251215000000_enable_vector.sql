-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add embedding column to transactions table
-- 1536 is the dimension for text-embedding-3-small
alter table transactions 
add column if not exists embedding vector(1536);

-- Create an HNSW index for faster similarity search
-- This requires reasonable amount of data to be effective, but good to have
create index if not exists transactions_embedding_idx 
on transactions 
using hnsw (embedding vector_cosine_ops);

-- Create a function to search transactions by similarity
create or replace function match_transactions (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
returns table (
  id uuid,
  description text,
  amount_base_minor bigint,
  date date,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    t.id,
    t.description,
    t.amount_base_minor,
    t.date,
    1 - (t.embedding <=> query_embedding) as similarity
  from transactions t
  join accounts a on t.account_id = a.id
  where 1 - (t.embedding <=> query_embedding) > match_threshold
  and a.user_id = filter_user_id
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;
