# Supabase Tetris

브라우저에서 플레이하는 블록 퍼즐 게임입니다. 점수 리더보드와 사용자 피드백은 Supabase에 저장됩니다.
요구사항과 설계는 [PRD.md](PRD.md)를 참고하세요.

## 로컬 실행

```bash
npm install
cp .env.example .env   # Supabase URL / 키 입력
npm run dev            # http://localhost:5173
```

`.env`가 없어도 게임은 플레이할 수 있고, 리더보드·피드백 영역에만 설정 안내가 표시됩니다.

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 [supabase/schema.sql](supabase/schema.sql) 실행 (테이블 + RLS 정책)
3. Project Settings > API에서 Project URL과 anon(또는 publishable) 키를 `.env`에 입력

## Vercel 배포

1. 이 저장소를 Vercel에서 Import (Framework Preset: Vite)
2. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록
3. Deploy. 이후 `main` 브랜치에 push하면 자동으로 재배포됩니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | 게임 로직 단위 테스트 |

## 조작법

| 동작 | 키보드 | 모바일 |
|---|---|---|
| 이동 | ← → | ◀ ▶ |
| 회전 | ↑ / X | ⟳ |
| 소프트 드롭 | ↓ | ▼ |
| 하드 드롭 | Space | ⤓ |
| 일시정지 | P / Esc | ❚❚ |
| 음소거 | M | 상단 BGM / SFX 버튼 |
