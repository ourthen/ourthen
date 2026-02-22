# Ourthen Landing

`우리그때(ourthen)` 랜딩 페이지 앱이다.  
스택: Next.js(App Router) + Tailwind + Vitest

## Local Run

루트(`/Users/seongoh/Desktop/programming/ourthen`)에서:

```bash
pnpm --filter @ourthen/landing dev
```

## Quality Check

```bash
pnpm --filter @ourthen/landing test
pnpm --filter @ourthen/landing typecheck
pnpm --filter @ourthen/landing lint
pnpm --filter @ourthen/landing build
```

## Vercel Deploy

1. Vercel에서 New Project
2. Repository root를 `ourthen`으로 선택
3. Root Directory를 `apps/landing`으로 지정
4. Framework Preset은 Next.js 그대로 사용
5. Deploy

배포 후 랜딩 CTA 이메일(`beta@ourthen.app`)과 연결할 수 있게 도메인/DNS 설정을 진행한다.
