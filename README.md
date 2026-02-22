# Ourthen Monorepo

`ourthen`은 모바일 앱(Expo) + 랜딩(Next.js) + Supabase 백엔드를 함께 관리하는 모노레포다.

## Directory Layout

```text
ourthen/
  apps/
    mobile/               # Expo React Native 앱
    landing/              # 마케팅/온보딩 랜딩 페이지
    backend/              # Supabase 마이그레이션/운영 스크립트
  packages/
    contracts/            # 공통 타입/스키마
    ui-kit/               # 공통 UI 컴포넌트(선택)
    config/               # 공통 설정
  docs/                   # 구현 계획/QA 문서
  product/                # PRD/의사결정 문서
```

## Quick Start

```bash
cd /Users/seongoh/Desktop/programming/ourthen
pnpm install
```

### Mobile

```bash
pnpm dev:mobile
pnpm test:mobile
pnpm typecheck:mobile
```

모바일 상세 문서는 `apps/mobile/README.md` 참고.

### Landing

```bash
pnpm dev:landing
pnpm test:landing
pnpm build:landing
```

### Supabase (Cloud)

```bash
pnpm supabase:link
pnpm db:push
pnpm db:diff
pnpm types:gen
```

백엔드 상세 문서는 `apps/backend/README.md` 참고.
