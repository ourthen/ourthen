# Ourthen Mobile UX Phase Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `우리그때` 모바일 MVP의 핵심 플로우(가입/모임 생성/초대/참여/기록)를 토스 스타일 UX 원칙에 맞게 빠르고 헷갈리지 않게 만든다.

**Architecture:** 기존 Expo + Supabase direct 구조는 유지하고, 화면 구조/행동 피드백/상태 관리를 단계적으로 정리한다. DB는 필요 최소 RPC만 추가하고, 앱에서는 액션 단위 상태와 메시지 가이드를 도입해 사용자 혼란을 줄인다.

**Tech Stack:** Expo (React Native), TypeScript, Supabase RPC/RLS, React Native Testing Library, Jest

---

## UX 원칙(적용 기준)

- **한 번에 한 가지 핵심 행동**: 화면마다 가장 중요한 CTA를 명확히 둔다.
- **즉시 피드백**: 버튼 누름 후 진행/성공/실패를 즉시 보여준다.
- **쉬운 문장**: 짧고 직관적인 한국어 문장으로 상태와 다음 행동을 안내한다.
- **사용자 보호**: 오해를 부르는 유도 문구, 과장된 긴급성, 숨겨진 조건을 피한다.
- **모바일 우선**: 입력 중 가림, 복잡한 동선, 재시도 어려움을 줄인다.

참고한 공개 가이드:
- Toss Developers 디자인/UX Writing 문서
- Toss 앱 확장용 Consumer UX Guide (다크패턴 방지 원칙)
- Toss 팀 디자인 문서(브랜드 및 인터랙션 철학)

---

## 대상 사용자 플로우

1. OTP 로그인
2. 모임이 없는 경우: `모임 만들기` 또는 `코드로 참여`
3. 모임 진입 후: 초대/참여, 모임 일정 생성, 조각 기록
4. 피드에서 최근 기록 확인

각 플로우에서 사용자가 지금 무엇을 해야 하는지, 다음에 무엇이 일어나는지를 항상 알 수 있어야 한다.

---

## Phase 1: 액션 피드백 정리 (즉시 진행)

### 목적

- 버튼/로딩 상태가 액션별로 명확하게 보이게 한다.
- 성공 메시지를 화면 내에서 짧게 보여줘서 사용자가 결과를 확신하게 한다.

### 변경 범위

- `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/circle/CircleHomeScreen.tsx`
- `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/circle/__tests__/CircleHomeScreen.test.tsx`

### 완료 조건

- 전역 `isSaving` 대신 액션 단위 busy 상태를 사용한다.
- 성공 시 에러 배너와 다른 스타일의 성공 피드백이 표시된다.
- 테스트 통과 + 타입체크 통과.

### 커밋 단위

- `feat(ux): add action-level loading and success feedback in circle home`

---

## Phase 2: 시작 화면 동선 단순화

### 목적

- 모임 없음 상태에서 `만들기`와 `참여` 동선을 더 명확히 분리한다.

### 변경 범위

- `CircleHomeScreen` 카드 구조/문구/버튼 계층
- 관련 테스트

### 완료 조건

- 첫 화면에서 핵심 CTA가 분명하고, 부가 CTA는 보조 스타일로 분리된다.
- 잘못된 입력(빈 문자열/잘못된 코드) 시 즉시 이해 가능한 안내 문구 제공.

### 커밋 단위

- `feat(ux): simplify empty-state create-vs-join flow`

---

## Phase 3: 초대 코드 UX 강화

### 목적

- 초대 코드 생성/복사/공유 경험을 모바일에서 빠르게 만든다.

### 변경 범위

- 코드 복사 버튼(클립보드)
- 공유 문구 정리
- 관리자/멤버 권한별 안내 문구 개선

### 완료 조건

- 생성된 코드의 복사/공유가 1~2탭 안에 완료된다.
- 멤버에게는 “왜 생성이 안 되는지”가 명확히 설명된다.

### 커밋 단위

- `feat(circle): improve invite code copy/share ux`

---

## Phase 4: 모임 데이터 신뢰도 피드백

### 목적

- 새로고침/재시도/오프라인 근접 상황에서 사용자 혼란을 줄인다.

### 변경 범위

- 수동 새로고침 피드백 보강
- 에러 문구 표준화(네트워크/권한/입력 분류)

### 완료 조건

- 실패 시 사용자 행동 지시가 포함된 에러 문구 제공.
- 재시도 경로가 항상 노출됨.

### 커밋 단위

- `feat(ux): improve refresh and retry feedback`

---

## 실행 규칙

- 각 Phase마다:
  - 구현
  - `pnpm --filter @ourthen/mobile test`
  - `pnpm --filter @ourthen/mobile typecheck`
  - 필요 시 `pnpm db:push`
  - 기능별 커밋
  - 즉시 `git push origin main`

- 회귀가 보이면 즉시 해당 Phase에서 수정 후 재검증한다.

