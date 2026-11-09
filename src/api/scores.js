import { requireClient } from './supabase.js';

export async function fetchTopScores(limit = 10) {
  const { data, error } = await requireClient()
    .from('scores')
    .select('id, nickname, score, level, lines, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** 저장된 행의 id를 반환 (리더보드 하이라이트용) */
export async function submitScore({ nickname, score, level, lines }) {
  const { data, error } = await requireClient()
    .from('scores')
    .insert({ nickname, score, level, lines })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
