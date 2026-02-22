# Ourthen Monorepo

이 디렉터리는 "우리그때(코드명: ourthen)" 프로젝트 모노레포다.  
모바일 앱과 백엔드를 하나의 레포에서 `apps/`로 관리하고, 공통 코드는 `packages/`에서 공유한다.

## Directory Layout

```text
ourthen/
  apps/
    mobile/               # React Native 앱
    landing/              # 마케팅/온보딩 랜딩 페이지 (Next.js)
    backend/              # API/Backend
  packages/
    contracts/            # API 타입/스키마 공유
    ui-kit/               # 공통 UI 컴포넌트(선택)
    config/               # eslint/tsconfig 등 공통 설정
  product/
    prd/                  # PRD 문서
    decisions/            # 아키텍처/정책 의사결정 문서
```

## Why This Layout

- 초기 단계에서 앱/백엔드/공통 타입을 한 번에 변경하기 쉽다.
- 모바일와 백엔드 간 계약(contracts) 동기화 비용을 줄일 수 있다.
- 제품 문서와 기술 구현을 한 루트에서 관리할 수 있다.

## Next Setup (Recommended)

1. 루트에서 `pnpm` 워크스페이스 초기화
2. `apps/landing`을 Vercel에 연결해 베타 유입 채널 오픈
3. `apps/mobile`에 React Native(Expo) 스캐폴딩
4. `apps/backend`에 API/DB 스캐폴딩
5. `packages/contracts`에 공통 타입/스키마 정의
