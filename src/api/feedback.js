import { requireClient, charLength, validateNickname } from './supabase.js';

export const MESSAGE_MAX = 500;

export function validateFeedback({ nickname, rating, message }) {
  const nick = validateNickname(nickname);
  if (!nick.ok) return nick;
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return { ok: false, message: '별점을 선택해 주세요.' };
  const msg = (message ?? '').trim();
  if (charLength(msg) < 1) return { ok: false, message: '내용을 입력해 주세요.' };
  if (charLength(msg) > MESSAGE_MAX) return { ok: false, message: `내용은 ${MESSAGE_MAX}자 이하로 입력해 주세요.` };
  return { ok: true, value: { nickname: nick.value, rating: r, message: msg } };
}

export async function fetchFeedback(limit = 20) {
  const { data, error } = await requireClient()
    .from('feedback')
    .select('id, nickname, rating, message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function submitFeedback({ nickname, rating, message }) {
  const { error } = await requireClient().from('feedback').insert({ nickname, rating, message });
  if (error) throw error;
}
