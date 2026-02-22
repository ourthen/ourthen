# mobile

Ourthen MVP용 Expo React Native 앱.

## Setup

```bash
cp /Users/seongoh/Desktop/programming/ourthen/apps/mobile/.env.example /Users/seongoh/Desktop/programming/ourthen/apps/mobile/.env
```

`.env`에 아래 값을 채운다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY` (공식 문서 기준)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`도 함께 넣어도 동작 가능

## Run

```bash
cd /Users/seongoh/Desktop/programming/ourthen
pnpm --filter @ourthen/mobile start
```

## UX / IA (현재 기준)

앱은 **한 화면 한 기능** 원칙으로 구성한다.  
루트 이동은 하단 고정 바텀 네비로 처리한다.

### Bottom Navigation

- `피드`: 현재 선택된 모임의 피드만 조회
- `모임`: 모임 선택/멤버 목록 확인
- `기억`: 텍스트 기억 조각 작성
- `일정`: 다가오는 모임 일정 조회
- `초대`: 초대 코드 발급/회전/공유

### Sub Screens

- `모임` 탭 내부:
  - `모임 만들기`
  - `코드 참여`
- `일정` 탭 내부:
  - `일정 만들기`
  - 날짜/시간은 `@react-native-community/datetimepicker` 네이티브 picker 사용

## User Flow

1. 로그인(이메일 OTP)
2. 모임 생성 또는 코드 참여
3. 바텀 네비에서 기능별 화면 이동
4. 기억 작성 시 피드로 반영
5. 일정 생성 시 제목 + 날짜/시간 선택 후 저장

## Responsive Policy

- `phone`: `< 768px`
- `tablet`: `768px - 1023px`
- `desktop/web`: `>= 1024px`

모바일 우선 구현이며, 공통 레이아웃 유틸로 최대 폭/패딩을 제어한다.

## Test

```bash
cd /Users/seongoh/Desktop/programming/ourthen
pnpm --filter @ourthen/mobile test
pnpm --filter @ourthen/mobile typecheck
```
