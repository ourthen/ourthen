# Ourthen MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first shippable MVP of `우리그때(ourthen)` with React Native app + Supabase backend, based on the approved PRD.

**Architecture:** Use a monorepo with `apps/mobile` for the Expo app and `apps/backend/supabase` for schema, migrations, and policies. Keep domain contracts in `packages/contracts` so mobile and backend use one shared model. Implement the fastest low-risk flow first: auth -> join circle -> post feed -> auto-create piece -> mention in meetup -> comment -> puzzle stage update.

**Tech Stack:** Expo (React Native + TypeScript), Supabase (Auth, Postgres, RLS, Realtime, Storage), pnpm workspaces, Vitest, React Native Testing Library, Reanimated.

---

### Task 1: Contracts Package and Domain Types

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/package.json`
- Create: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/tsconfig.json`
- Create: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/src/schema.ts`
- Create: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/src/puzzle.ts`
- Create: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/src/index.ts`
- Test: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/tests/schema.test.ts`
- Test: `/Users/seongoh/Desktop/programming/ourthen/packages/contracts/tests/puzzle.test.ts`
- Modify: `/Users/seongoh/Desktop/programming/ourthen/package.json`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { MentionSchema, PuzzleScoreInputSchema, computePuzzleStage } from "../src";

describe("mention model", () => {
  it("accepts mentioned-only model", () => {
    const parsed = MentionSchema.parse({
      meetupId: "m1",
      pieceId: "p1",
      userId: "u1",
    });
    expect(parsed.meetupId).toBe("m1");
  });
});

describe("puzzle stage", () => {
  it("returns stage 4 at score 8+", () => {
    const input = PuzzleScoreInputSchema.parse({ score: 8 });
    expect(computePuzzleStage(input.score)).toBe(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @ourthen/contracts test`  
Expected: FAIL with module/schema export missing.

**Step 3: Write minimal implementation**

```ts
import { z } from "zod";

export const MentionSchema = z.object({
  meetupId: z.string().min(1),
  pieceId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string().optional(),
});

export const PuzzleScoreInputSchema = z.object({ score: z.number().nonnegative() });
export const computePuzzleStage = (score: number) => (score >= 8 ? 4 : score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0);
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @ourthen/contracts test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/packages/contracts /Users/seongoh/Desktop/programming/ourthen/package.json
git commit -m "feat(contracts): add mention-only model and puzzle scoring schemas"
```

### Task 2: Supabase Project Bootstrap and Initial Schema

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/package.json`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/config.toml`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/migrations/20260220110000_init_core_tables.sql`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/tests/001_core_tables.sql`

**Step 1: Write the failing DB test**

```sql
begin;
select plan(2);
select has_table('public', 'feed_items', 'feed_items exists');
select has_table('public', 'pieces', 'pieces exists');
select * from finish();
rollback;
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase test db`  
Expected: FAIL because tables do not exist.

**Step 3: Write minimal implementation**

```sql
create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null,
  author_id uuid not null,
  type text not null check (type in ('text','photo','link')),
  body text,
  created_at timestamptz not null default now()
);

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  feed_item_id uuid unique not null references public.feed_items(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase db reset && supabase test db`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/backend
git commit -m "feat(backend): bootstrap supabase and add core tables"
```

### Task 3: Mention-Only + Comments + Attendance Schema

**Files:**
- Modify: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/migrations/20260220110000_init_core_tables.sql`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/tests/002_mentions_comments_attendance.sql`

**Step 1: Write the failing DB test**

```sql
begin;
select plan(3);
select has_table('public', 'piece_mentions', 'piece_mentions exists');
select has_table('public', 'piece_comments', 'piece_comments exists');
select has_table('public', 'meetup_attendance', 'meetup_attendance exists');
select * from finish();
rollback;
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase test db`  
Expected: FAIL due missing tables.

**Step 3: Write minimal implementation**

```sql
create table public.piece_mentions (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null,
  piece_id uuid not null references public.pieces(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (meetup_id, piece_id, user_id)
);

create table public.piece_comments (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  meetup_id uuid,
  author_id uuid not null,
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase db reset && supabase test db`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase
git commit -m "feat(backend): add mention-only, comments, and attendance tables"
```

### Task 4: Auto Piece Generation and Puzzle Score SQL Function

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/migrations/20260220112000_piece_trigger_and_puzzle_fn.sql`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/tests/003_piece_trigger_and_puzzle.sql`

**Step 1: Write the failing DB test**

```sql
begin;
select plan(2);
-- inserting feed item should create one piece
-- puzzle score function should return stage threshold correctly
select ok(false, 'placeholder fail until trigger/function are added');
select ok(false, 'placeholder fail until trigger/function are added');
select * from finish();
rollback;
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase test db`  
Expected: FAIL.

**Step 3: Write minimal implementation**

```sql
create or replace function public.create_piece_on_feed_insert()
returns trigger
language plpgsql
as $$
begin
  insert into public.pieces(feed_item_id) values (new.id);
  return new;
end;
$$;

create trigger trg_feed_items_create_piece
after insert on public.feed_items
for each row execute function public.create_piece_on_feed_insert();
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase db reset && supabase test db`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase
git commit -m "feat(backend): auto-create piece trigger and puzzle score function"
```

### Task 5: RLS Policies for Circle Isolation

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/migrations/20260220113000_rls_policies.sql`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase/tests/004_rls_circle_isolation.sql`

**Step 1: Write the failing DB test**

```sql
begin;
select plan(1);
select ok(false, 'placeholder fail until RLS policies block non-members');
select * from finish();
rollback;
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase test db`  
Expected: FAIL because policies are missing.

**Step 3: Write minimal implementation**

```sql
alter table public.feed_items enable row level security;
alter table public.pieces enable row level security;
alter table public.piece_mentions enable row level security;
alter table public.piece_comments enable row level security;

create policy "member can read feed in own circles"
on public.feed_items for select
using (exists (
  select 1 from public.circle_members cm
  where cm.circle_id = feed_items.circle_id and cm.user_id = auth.uid()
));
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/seongoh/Desktop/programming/ourthen/apps/backend && supabase db reset && supabase test db`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/backend/supabase
git commit -m "feat(backend): add supabase RLS for circle-only visibility"
```

### Task 6: Mobile App Bootstrap + Auth + Circle Home

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/package.json`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/app.json`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/app/App.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/auth/AuthGate.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/circle/CircleHomeScreen.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/lib/supabase.ts`
- Test: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/auth/__tests__/AuthGate.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react-native";
import { AuthGate } from "../AuthGate";

it("shows sign-in button when session is null", () => {
  render(<AuthGate session={null} />);
  expect(screen.getByText("Sign in")).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

```tsx
export function AuthGate({ session }: { session: unknown }) {
  if (!session) return <Text>Sign in</Text>;
  return <CircleHomeScreen />;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/mobile
git commit -m "feat(mobile): bootstrap expo app with auth gate and circle home"
```

### Task 7: Feed -> Mention -> Comment User Flow

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/feed/FeedScreen.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/meetup/MeetupDetailScreen.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/meetup/MentionButton.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/comments/PieceComments.tsx`
- Test: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/meetup/__tests__/MentionFlow.test.tsx`

**Step 1: Write the failing test**

```tsx
it("marks a piece as mentioned and renders comments panel", async () => {
  // render meetup detail with one piece
  // tap "Mentioned"
  // expect piece row marked and comment input visible
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: FAIL because mention flow is not implemented.

**Step 3: Write minimal implementation**

```tsx
<Pressable onPress={onMention}>
  <Text>Mentioned</Text>
</Pressable>
{isMentioned ? <PieceComments pieceId={piece.id} meetupId={meetup.id} /> : null}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/mobile
git commit -m "feat(mobile): add meetup mention flow with piece comments"
```

### Task 8: Puzzle Visualization Engine (2.5D + 3D Moment)

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/puzzle/PuzzleCard.tsx`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/puzzle/themePicker.ts`
- Create: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/puzzle/usePuzzleAnimation.ts`
- Test: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/puzzle/__tests__/themePicker.test.ts`
- Test: `/Users/seongoh/Desktop/programming/ourthen/apps/mobile/src/features/puzzle/__tests__/stageThreshold.test.ts`

**Step 1: Write the failing tests**

```ts
it("excludes themes used in the last three meetups", () => {
  // expect selected theme not in recent 3
});

it("maps score thresholds to stage 1/2/3/4", () => {
  // 1,3,5,8 thresholds
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: FAIL due missing picker and stage logic.

**Step 3: Write minimal implementation**

```ts
export function pickTheme(all: string[], recent: string[], seed: string): string {
  const allowed = all.filter((t) => !recent.slice(-3).includes(t));
  return allowed[Math.abs(hash(seed)) % allowed.length];
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @ourthen/mobile test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/apps/mobile /Users/seongoh/Desktop/programming/ourthen/packages/contracts
git commit -m "feat(puzzle): add deterministic theme picker and stage engine"
```

### Task 9: Quality Gates and Definition of Done

**Files:**
- Create: `/Users/seongoh/Desktop/programming/ourthen/.github/workflows/ci.yml`
- Create: `/Users/seongoh/Desktop/programming/ourthen/docs/qa/mvp-checklist.md`
- Modify: `/Users/seongoh/Desktop/programming/ourthen/README.md`

**Step 1: Write a failing CI check target**

```yaml
- name: Typecheck
  run: pnpm -r typecheck
```

(Initially fails until all package scripts are wired.)

**Step 2: Run CI-equivalent locally to verify it fails**

Run: `pnpm -r typecheck && pnpm -r test`  
Expected: FAIL if any package is missing scripts/config.

**Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

**Step 4: Run verification to confirm pass**

Run: `pnpm -r typecheck && pnpm -r test && pnpm -r lint`  
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/seongoh/Desktop/programming/ourthen/.github /Users/seongoh/Desktop/programming/ourthen/docs /Users/seongoh/Desktop/programming/ourthen/README.md
git commit -m "chore: add ci quality gates and mvp done checklist"
```

## Implementation Notes

- Use `@test-driven-development` before implementation in each task.
- Use `@vercel-react-native-skills` for list performance and animation constraints.
- Use `@verification-before-completion` before claiming done on each milestone.
- Keep all puzzle animation properties on transform/opacity unless hard evidence says otherwise.
- Keep PRD alignment strict with mention-only model + comments for extra context.
