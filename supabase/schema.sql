-- Supabase SQL Editor에서 한 번 실행하세요 (PRD 6.3)

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  score integer not null check (score between 0 and 99999999),
  level integer not null check (level between 1 and 999),
  lines integer not null check (lines between 0 and 99999),
  created_at timestamptz not null default now()
);
create index if not exists scores_score_idx on public.scores (score desc);

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  rating smallint not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.scores enable row level security;
alter table public.feedback enable row level security;

-- 누구나 조회/등록 가능, 수정/삭제 정책은 만들지 않음 → 클라이언트에서 수정·삭제 불가
drop policy if exists "scores read" on public.scores;
drop policy if exists "scores insert" on public.scores;
drop policy if exists "feedback read" on public.feedback;
drop policy if exists "feedback insert" on public.feedback;

create policy "scores read"     on public.scores   for select to anon, authenticated using (true);
create policy "scores insert"   on public.scores   for insert to anon, authenticated with check (true);
create policy "feedback read"   on public.feedback for select to anon, authenticated using (true);
create policy "feedback insert" on public.feedback for insert to anon, authenticated with check (true);
