import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

export function requireClient() {
  if (!supabase) {
    throw new Error('Supabase 설정이 없습니다. .env 파일(또는 Vercel 환경변수)을 확인하세요.');
  }
  return supabase;
}

/** 이모지 등도 1글자로 세기 (Postgres char_length와 동일하게) */
export const charLength = (s) => [...s].length;

export function validateNickname(raw) {
  const nickname = (raw ?? '').trim();
  const len = charLength(nickname);
  if (len < 1) return { ok: false, message: '닉네임을 입력해 주세요.' };
  if (len > 12) return { ok: false, message: '닉네임은 12자 이하로 입력해 주세요.' };
  return { ok: true, value: nickname };
}
