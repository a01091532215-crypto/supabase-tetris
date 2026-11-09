# PRD: Supabase Tetris (웹 기반 블록 퍼즐 게임)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-09 |
| 저장소 | https://github.com/a01091532215-crypto/supabase-tetris.git |
| 배포 | Vercel (GitHub 연동 자동 배포) |
| 백엔드 | Supabase (PostgreSQL + REST API) |

---

## 1. 개요

### 1.1 목적
브라우저에서 바로 플레이할 수 있는 테트리스형 블록 퍼즐 게임을 만든다. 게임 점수는 Supabase에 저장되어 랭킹(리더보드)으로 공유되고, 사용자는 게임에 대한 피드백을 남길 수 있다. 배경음과 효과음으로 플레이 경험을 강화한다.

### 1.2 원본 요구사항
| # | 요구사항 | 해석 |
|---|---|---|
| R1 | 웹 기반 테트리스 | 설치 없이 데스크톱/모바일 브라우저에서 동작하는 블록 퍼즐 게임 |
| R2 | 점수는 Supabase에 저장 | 게임 종료 시 닉네임 + 점수를 DB에 저장하고 리더보드로 조회 |
| R3 | 사용자 피드백 작성 | 누구나 피드백(의견, 별점)을 작성·조회할 수 있는 게시판 형태 기능 |
| R4 | 배경음 + 효과음 | 플레이 중 BGM 반복 재생, 회전·이동·줄 삭제 등 이벤트별 효과음 |
| R5 | 그림자 효과 없음 | 고스트 피스(블록 낙하 예상 위치 표시)는 구현하지 않음 |
| R6 | Vercel 배포 | 정적 빌드 결과물을 Vercel에 배포, 환경변수로 Supabase 키 주입 |
| R7 | GitHub 저장소 사용 | 위 저장소를 원격 저장소로 사용, main 브랜치 push 시 자동 배포 |

### 1.3 범위 밖 (Non-Goals)
- 회원가입/로그인 (닉네임만 입력하는 익명 방식)
- 고스트 피스(그림자) 표시
- 멀티플레이 / 실시간 대전
- 홀드(Hold) 기능 — v1에서는 제외, 추후 고려
- 관리자 페이지 (피드백 관리는 Supabase 대시보드에서 직접 수행)

---

## 2. 대상 사용자 및 시나리오

- **대상**: 가볍게 퍼즐 게임을 즐기려는 일반 웹 사용자, 지인 간 점수 경쟁을 원하는 사용자
- **시나리오 1 (플레이)**: 사용자가 URL에 접속 → 시작 버튼 클릭 → BGM과 함께 게임 플레이 → 게임 오버 시 닉네임 입력 후 점수 등록 → 리더보드에서 내 순위 확인
- **시나리오 2 (피드백)**: 사용자가 피드백 탭으로 이동 → 닉네임·별점·내용 작성 → 등록 → 최신 피드백 목록에서 확인

---

## 3. 기능 요구사항

### 3.1 게임 플레이 (P0)

| ID | 기능 | 상세 |
|---|---|---|
| G-01 | 보드 | 가로 10칸 × 세로 20칸 (상단 숨김 영역 2줄 별도) |
| G-02 | 블록 | 7종 테트로미노 (I, O, T, S, Z, J, L), 블록별 고유 색상 |
| G-03 | 블록 생성 | 7-bag 랜덤 방식 (7개 블록을 한 묶음으로 섞어 순서대로 출현) |
| G-04 | 조작 | 좌/우 이동, 시계 방향 회전, 소프트 드롭, 하드 드롭, 일시정지 |
| G-05 | 회전 보정 | 벽/바닥에 막히면 좌우 1칸 이동 후 회전 시도 (간단한 wall kick) |
| G-06 | 줄 삭제 | 가로 한 줄이 가득 차면 삭제하고 위 블록을 아래로 내림 |
| G-07 | 다음 블록 미리보기 | 다음에 나올 블록 1개 이상 표시 |
| G-08 | 레벨/속도 | 10줄 삭제마다 레벨 +1, 레벨이 오를수록 낙하 속도 증가 |
| G-09 | 게임 오버 | 새 블록이 생성 위치에 놓일 수 없으면 종료 |
| G-10 | 상태 표시 | 현재 점수, 레벨, 삭제한 줄 수 표시 |
| G-11 | 그림자 없음 | 고스트 피스는 렌더링하지 않음 (R5) |

**조작키**

| 동작 | 키보드 | 모바일(터치 버튼) |
|---|---|---|
| 좌/우 이동 | ← / → | ◀ / ▶ 버튼 |
| 회전 | ↑ 또는 X | ⟳ 버튼 |
| 소프트 드롭 | ↓ | ▼ 버튼 |
| 하드 드롭 | Space | ⤓ 버튼 |
| 일시정지 | P 또는 Esc | ❚❚ 버튼 |
| 음소거 토글 | M | 🔊 버튼 |

**점수 규칙**

| 이벤트 | 점수 |
|---|---|
| 1줄 삭제 | 100 × 레벨 |
| 2줄 삭제 | 300 × 레벨 |
| 3줄 삭제 | 500 × 레벨 |
| 4줄 삭제 | 800 × 레벨 |
| 소프트 드롭 | 1칸당 1점 |
| 하드 드롭 | 1칸당 2점 |

### 3.2 점수 저장 및 리더보드 (P0)

| ID | 기능 | 상세 |
|---|---|---|
| S-01 | 닉네임 입력 | 게임 오버 시 모달에서 닉네임 입력 (1~12자, 마지막 입력값은 localStorage에 기억) |
| S-02 | 점수 저장 | 닉네임, 점수, 레벨, 삭제 줄 수를 Supabase `scores` 테이블에 insert |
| S-03 | 리더보드 | 상위 10개 점수를 점수 내림차순으로 표시 (순위, 닉네임, 점수, 레벨, 날짜) |
| S-04 | 내 순위 강조 | 방금 등록한 기록이 리더보드에 있으면 하이라이트 |
| S-05 | 실패 처리 | 네트워크/DB 오류 시 오류 메시지 + 재시도 버튼, 게임 자체는 정상 동작 |
| S-06 | 0점 처리 | 0점 기록은 저장 버튼 비활성화 |

### 3.3 사용자 피드백 (P0)

| ID | 기능 | 상세 |
|---|---|---|
| F-01 | 피드백 작성 | 닉네임(1~12자), 별점(1~5), 내용(1~500자) 입력 후 등록 |
| F-02 | 피드백 목록 | 최신순 20개 표시 (닉네임, 별점, 내용, 작성일) |
| F-03 | 입력 검증 | 빈 값/길이 초과 시 등록 불가, 안내 문구 표시 |
| F-04 | 중복 제출 방지 | 등록 중 버튼 비활성화, 등록 후 30초간 재작성 제한 (클라이언트) |
| F-05 | XSS 방지 | 피드백 내용은 textContent로만 렌더링 (HTML 해석 금지) |
| F-06 | 접근 위치 | 메인 화면의 탭 또는 버튼으로 피드백 영역 진입, 게임 오버 모달에서도 링크 제공 |

### 3.4 사운드 (P0)

| ID | 기능 | 상세 |
|---|---|---|
| A-01 | 배경음(BGM) | 게임 플레이 중 루프 재생, 일시정지 시 멈춤, 게임 오버 시 정지 |
| A-02 | 효과음 | 이동, 회전, 하드 드롭(착지), 줄 삭제, 4줄 삭제(테트리스), 레벨업, 게임 오버 |
| A-03 | 음소거 | BGM/효과음 각각 on/off 토글, 설정은 localStorage에 저장 |
| A-04 | 볼륨 | BGM·효과음 볼륨 슬라이더 (P1) |
| A-05 | 자동재생 정책 대응 | 브라우저 정책상 사용자의 첫 클릭(시작 버튼) 이후에 오디오 시작 |
| A-06 | 음원 출처 | Web Audio API로 직접 합성한 오리지널 사운드 사용 → 외부 파일·저작권 문제 없음. 기존 게임의 음악(예: 원작 BGM)은 사용하지 않음 |

### 3.5 화면 구성 (P0)

```
┌──────────────────────────────────────────────┐
│  SUPABASE TETRIS           [🔊 BGM] [🔔 SFX]  │
├───────────┬──────────────────┬───────────────┤
│  NEXT     │                  │  LEADERBOARD  │
│  [블록]   │                  │  1. aaa 12000 │
│           │    게임 보드      │  2. bbb  9800 │
│  SCORE    │    (10 × 20)     │  ...          │
│  LEVEL    │                  │               │
│  LINES    │                  │  [피드백 탭]   │
├───────────┴──────────────────┴───────────────┤
│  (모바일) ◀  ▶  ⟳  ▼  ⤓  ❚❚                  │
└──────────────────────────────────────────────┘
```

- 데스크톱: 3단 레이아웃 (정보 / 보드 / 리더보드·피드백)
- 모바일(768px 이하): 보드 중심 세로 배치 + 하단 터치 버튼, 리더보드·피드백은 보드 아래로 이동
- 모달: 시작 화면, 일시정지, 게임 오버(점수 + 닉네임 입력 + 저장)

---

## 4. 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 60fps 렌더링 (requestAnimationFrame + Canvas), 초기 로딩 2초 이내 |
| 호환성 | 최신 Chrome, Edge, Safari, Firefox / iOS Safari, Android Chrome |
| 반응형 | 360px 폭 모바일부터 데스크톱까지 |
| 보안 | Supabase anon key만 클라이언트에 노출, RLS로 insert/select만 허용 |
| 접근성 | 버튼에 aria-label 제공, 키보드만으로 전체 조작 가능 |
| 유지보수 | 게임 로직 / 렌더링 / 사운드 / API 모듈 분리 |

---

## 5. 기술 스택 및 아키텍처

### 5.1 스택
| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드 | Vite | 빠른 개발 서버, Vercel에서 설정 없이 인식 |
| 언어 | Vanilla JavaScript (ES Modules) | 게임 로직에 프레임워크 불필요, 번들 작음 |
| 렌더링 | HTML5 Canvas | 블록 그리기에 적합, 성능 우수 |
| 사운드 | Web Audio API | 음원 파일 없이 합성, 지연 없는 효과음 |
| DB | Supabase (`@supabase/supabase-js`) | 점수·피드백 저장 |
| 호스팅 | Vercel | GitHub 연동 자동 배포 |

### 5.2 구조
```
브라우저 (Vite 빌드 정적 파일, Vercel 호스팅)
   │  supabase-js (anon key)
   ▼
Supabase PostgreSQL  ── RLS 정책: scores / feedback 에 select + insert 만 허용
```

### 5.3 디렉터리 구조 (예정)
```
supabase-tetris/
├── index.html
├── package.json
├── vite.config.js
├── .env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── supabase/
│   └── schema.sql          # 테이블 + RLS 정책
├── src/
│   ├── main.js             # 진입점, UI 연결
│   ├── game/
│   │   ├── board.js        # 보드 상태, 충돌, 줄 삭제
│   │   ├── pieces.js       # 테트로미노 정의, 7-bag
│   │   ├── game.js         # 게임 루프, 점수, 레벨
│   │   └── input.js        # 키보드/터치 입력
│   ├── render/
│   │   └── renderer.js     # Canvas 렌더링
│   ├── audio/
│   │   └── sound.js        # BGM, 효과음 (Web Audio)
│   ├── api/
│   │   ├── supabase.js     # 클라이언트 생성
│   │   ├── scores.js       # 점수 저장/조회
│   │   └── feedback.js     # 피드백 저장/조회
│   └── styles.css
└── PRD.md
```

---

## 6. 데이터베이스 설계 (Supabase)

### 6.1 `scores` 테이블
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigint (identity) | PK |
| nickname | text | not null, 길이 1~12 |
| score | integer | not null, 0 이상 |
| level | integer | not null, 1 이상 |
| lines | integer | not null, 0 이상 |
| created_at | timestamptz | default now() |

인덱스: `score desc`

### 6.2 `feedback` 테이블
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigint (identity) | PK |
| nickname | text | not null, 길이 1~12 |
| rating | smallint | not null, 1~5 |
| message | text | not null, 길이 1~500 |
| created_at | timestamptz | default now() |

인덱스: `created_at desc`

### 6.3 SQL 및 RLS
```sql
create table public.scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  score integer not null check (score >= 0),
  level integer not null check (level >= 1),
  lines integer not null check (lines >= 0),
  created_at timestamptz not null default now()
);
create index scores_score_idx on public.scores (score desc);

create table public.feedback (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  rating smallint not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.scores enable row level security;
alter table public.feedback enable row level security;

create policy "scores read"   on public.scores   for select to anon using (true);
create policy "scores insert" on public.scores   for insert to anon with check (true);
create policy "feedback read"   on public.feedback for select to anon using (true);
create policy "feedback insert" on public.feedback for insert to anon with check (true);
-- update / delete 정책은 만들지 않음 → 클라이언트에서 수정·삭제 불가
```

### 6.4 API 사용 예
- 점수 저장: `supabase.from('scores').insert({ nickname, score, level, lines })`
- 리더보드: `supabase.from('scores').select('*').order('score', { ascending: false }).limit(10)`
- 피드백 저장: `supabase.from('feedback').insert({ nickname, rating, message })`
- 피드백 목록: `supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(20)`

---

## 7. 배포 (Vercel + GitHub)

1. 로컬 프로젝트를 `https://github.com/a01091532215-crypto/supabase-tetris.git` 에 push
2. Supabase 프로젝트 생성 → SQL Editor에서 `supabase/schema.sql` 실행
3. Supabase 대시보드 > Project Settings > API 에서 Project URL, anon public key 확인
4. Vercel에서 GitHub 저장소 Import
   - Framework Preset: **Vite**
   - Build Command: `npm run build` / Output Directory: `dist`
5. Vercel 환경변수 등록
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy → 이후 main 브랜치 push 시 자동 재배포
7. `.env`는 `.gitignore`에 포함, 저장소에는 `.env.example`만 커밋

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 점수 조작 (클라이언트에서 임의 점수 insert) | 리더보드 신뢰도 저하 | v1: DB 제약(범위 체크)으로 최소 방어. 필요 시 v2에서 Supabase Edge Function으로 검증 이전 |
| 스팸 피드백 | 목록 오염 | 길이 제약 + 클라이언트 쿨다운, 문제 발생 시 대시보드에서 삭제 |
| 부적절한 닉네임/내용 | 이미지 저하 | v1은 대시보드 수동 삭제, 필요 시 금칙어 필터 추가 |
| 브라우저 자동재생 차단 | 소리 안 남 | 첫 사용자 클릭 후 AudioContext 생성/resume |
| anon key 노출 | — | anon key는 공개 전제 키. RLS로 허용 동작을 select/insert로 제한 |
| "Tetris" 상표 | 공개 서비스 시 상표 이슈 가능 | 개인/학습용 프로젝트로 운영. 공개 확대 시 게임명 변경 고려, 원작 음악·그래픽은 사용하지 않음 |

---

## 9. 우선순위 및 마일스톤

| 단계 | 내용 | 우선순위 |
|---|---|---|
| M1 | Vite 프로젝트 세팅, 게임 코어 (G-01 ~ G-11), 키보드 조작 | P0 |
| M2 | Supabase 테이블/RLS, 점수 저장 + 리더보드 (S-01 ~ S-06) | P0 |
| M3 | 피드백 작성/목록 (F-01 ~ F-06) | P0 |
| M4 | BGM/효과음, 음소거 (A-01 ~ A-03, A-05, A-06) | P0 |
| M5 | 반응형 + 모바일 터치 버튼 | P0 |
| M6 | GitHub push, Vercel 배포, 환경변수 설정 | P0 |
| M7 | 볼륨 슬라이더, 홀드 기능 등 개선 | P1 |

---

## 10. 수용 기준 (Acceptance Criteria)

- [ ] 7종 블록이 정상적으로 이동·회전·낙하하고, 가득 찬 줄이 삭제된다
- [ ] 고스트 피스(그림자)는 표시되지 않는다
- [ ] 점수·레벨·줄 수가 규칙대로 계산되어 화면에 표시된다
- [ ] 게임 오버 후 닉네임을 입력하면 Supabase `scores` 테이블에 행이 추가된다
- [ ] 리더보드에 상위 10개 점수가 내림차순으로 표시된다
- [ ] 피드백을 작성하면 `feedback` 테이블에 저장되고 목록에 바로 나타난다
- [ ] 클라이언트에서 다른 사람의 점수·피드백을 수정/삭제할 수 없다 (RLS 확인)
- [ ] 시작 버튼 클릭 후 BGM이 재생되고, 이동/회전/줄 삭제/게임 오버 시 효과음이 난다
- [ ] 음소거 설정이 새로고침 후에도 유지된다
- [ ] 모바일 브라우저에서 터치 버튼으로 끝까지 플레이할 수 있다
- [ ] Vercel 배포 URL에서 위 기능이 모두 동작한다
