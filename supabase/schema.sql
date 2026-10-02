-- =====================================================================
-- Kalyo Télécom (fictif) – Base vectorielle de l'assistant conseiller
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run.
-- =====================================================================

-- 1. Extension pgvector
create extension if not exists vector;

-- 2. Table des passages
-- Dimension 3072 = sortie par défaut du modèle gemini-embedding-001.
-- Si la première ingestion échoue avec "expected 3072 dimensions, not N",
-- remplacer 3072 par N ici et dans la fonction ci-dessous, puis relancer ce script.
drop table if exists public.documents;
create table public.documents (
  id        bigserial primary key,
  content   text,         -- texte du passage (avec son en-tête de contexte)
  metadata  jsonb,        -- doc_id, titre, domaine, section, regles, version
  embedding vector(3072)
);

-- Pas d'index vectoriel : environ 200 passages, une recherche exacte
-- prend quelques millisecondes. (Un index HNSW est de toute façon limité
-- à 2 000 dimensions sur le type vector.)

-- 3. Sécurité : RLS activé, aucune politique.
-- Seule la clé service_role (stockée dans les credentials n8n) peut lire
-- et écrire. Les clés publiques (anon) n'ont accès à rien.
alter table public.documents enable row level security;

-- 4. Fonction de recherche appelée par le nœud "Supabase Vector Store" de n8n
create or replace function public.match_documents (
  query_embedding vector(3072),
  match_count     int   default null,
  filter          jsonb default '{}'
) returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Vérification rapide après ingestion (à lancer à la main) :
-- select metadata->>'doc_id' as doc, count(*) from public.documents group by 1 order by 1;
