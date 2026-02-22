# Repo Structure Decision

Date: 2026-02-20  
Decision: Adopt monorepo model.

## Decision

프로젝트는 단일 모노레포(`ourthen`)로 운영한다.

- `/Users/seongoh/Desktop/programming/ourthen/apps/mobile`
- `/Users/seongoh/Desktop/programming/ourthen/apps/backend`
- `/Users/seongoh/Desktop/programming/ourthen/packages/contracts`

제품 문서는 `/Users/seongoh/Desktop/programming/ourthen/product`에 유지한다.

## Rationale

1. 초기 제품 단계에서 모바일-백엔드 동시 변경이 많아 단일 레포가 빠르다.
2. `packages/contracts`로 API 타입/스키마를 강하게 공유할 수 있다.
3. 하나의 CI에서 앱/백엔드/공통 패키지 정합성을 검증하기 쉽다.

## Consequences

### Positive

- cross-app 변경 속도 향상
- 공유 타입 불일치 감소
- 온보딩 단순화

### Negative

- CI 파이프라인 복잡도 증가 가능
- 레포 규모 증가에 따른 빌드 최적화 필요

## Follow-Up

1. 워크스페이스 매니저 확정 (`pnpm` 권장)
2. 공통 계약(API schema) 관리 방식 확정 (OpenAPI or shared package)
3. 백엔드 기본 스택 확정 (Supabase/Firebase/Custom API)
4. 모노레포 CI 템플릿 확정 (changed-files 기반 선택 빌드)
