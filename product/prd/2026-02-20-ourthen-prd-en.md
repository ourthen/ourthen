# Urigeuttae (Ourthen) App PRD v1

Date: 2026-02-20  
Status: Draft for approval  
Platform: React Native (iOS/Android), small private friend groups only
Public name: Urigeuttae  
Project codename: ourthen

## 1. Product Summary

Build a private social app where friends continuously share updates, then connect those updates to each meetup.  
The app records:

- who attended a meetup
- which update pieces were discussed
- what comments were added to each discussed piece

Gamification is puzzle-driven:

- one meetup equals one puzzle
- one linked piece can complete the puzzle
- more linked pieces evolve the puzzle visuals

The goal is not competition. The goal is collaborative memory reconstruction with low input friction.

## 2. Problem and Target

### Problem

Friend groups forget timeline context between meetups, especially after holidays or long gaps.  
Chat apps keep messages but do not structure "what happened between meetup A and meetup B" in a lightweight, reviewable way.

### Target Users

- close friend groups (5-20 people)
- invite-only, private sharing preference
- users who avoid public SNS posting but still want lightweight updates

## 3. Product Principles

1. Low friction first: tap-based linking/checking over long writing.
2. Private by default: all content visible to group members only.
3. Collaborative over competitive: no ranking leaderboard in MVP.
4. Visual reward for contribution: puzzle evolves as linked pieces increase.
5. Stable but varied visuals: random themes with deterministic seed logic.

## 4. Core Domain Model

- Circle: private friend group
- FeedItem: a posted update in timeline order
- Piece: puzzle piece auto-created from FeedItem (1:1)
- Meetup: a planned social appointment (`planned`, `completed`, `canceled`)
- Mention: piece-meetup link status (`mentioned` only)
- PieceComment: comment thread on a piece (extra context)
- Attendance: per-user attendance state for a Meetup

## 5. MVP Functional Scope

### 5.1 Circle and Meetup

- Any group member can create a meetup.
- Meetup can be completed even when linked pieces count is 0.
- Attendance can be checked by:
  - the user for self
  - the meetup host for participants

Conflict policy:

- self-check has priority when conflicting
- all attendance changes are stored in audit history

### 5.2 Feed and Piece

- Feed updates stack continuously (no interval segment system).
- On upload, Piece is auto-created immediately.
- No minimum content condition for piece generation.
- No hard cap on number of pieces contributed per user.

### 5.3 Piece Linking in Meetup

- All attendees can mark a piece as `mentioned`.
- Actor name is visible (not anonymous).
- No time limit for status updates.
- Same user can hold one mention state per piece-meetup pair.
- Additional context should be recorded as comments on the piece.

### 5.4 Visibility

- Meetup puzzle, feed, and links are visible only to members of the same circle.
- No public or link-based external view in MVP.

## 6. MVP User Flows

### 6.1 Onboarding and Circle Join

1. User signs up (social login).
2. User joins a circle by invite link/code.
3. User lands on circle home with recent feed and upcoming meetups.

### 6.2 Feed Post -> Piece Creation

1. User uploads text/photo/link update.
2. System creates Piece immediately (1:1).
3. Feed and puzzle piece are reflected in timeline.

### 6.3 Meetup Creation and Prep

1. Any circle member creates a meetup.
2. Meetup detail screen shows existing pieces.
3. Pre-meetup comments can be added on pieces.

### 6.4 In-Meetup Capture

1. Attendance is marked (self or host).
2. Attendees mark pieces that were discussed as `mentioned`.
3. Extra details are captured via piece comments.

### 6.5 Meetup Completion and Review

1. Host or authorized user marks meetup `completed`.
2. Completion is allowed even with zero linked pieces.
3. Puzzle score/stage is updated immediately.
4. Review screen shows attendance, mentioned pieces, and comments.

### 6.6 Deletion and Correction

1. Deleting a feed item invalidates/deletes its piece.
2. Puzzle score is reduced immediately.
3. Puzzle stage is recalculated immediately.

## 7. Gamification and Puzzle System

### 7.1 Puzzle Completion and Evolution

- 1 meetup = 1 puzzle
- linked piece count >= 1 => puzzle complete
- additional linked pieces evolve visuals

Recommended evolution thresholds (by weighted score):

- Stage 1: 1
- Stage 2: 3
- Stage 3: 5
- Stage 4: 8

### 7.2 Weighted Score (Diversity-Based)

Scoring basis for meetup puzzle progression:

- base: 1 point per linked piece
- diversity bonus: +0.5 when a newly linked piece introduces a new type for that meetup
- type set for MVP: `text`, `photo`, `link`

Notes:

- repeated same-type links add base but not diversity bonus
- duplicate/near-duplicate spam-like content can be down-weighted by anti-spam logic

### 7.3 Theme Randomization

- puzzle theme is randomly selected when meetup is created
- deterministic seed (`circleId + meetupId`) ensures consistent render across devices
- exclude themes used in last 3 meetups of the same circle

### 7.4 3D Visual Strategy (MVP)

Use hybrid 2.5D + focused 3D moments:

- default state: lightweight layered visual animation
- evolution/completion moments: stronger 3D-like motion

Performance guardrails:

- animate with transform/opacity-first strategy
- avoid heavy real-time geometry computation in feed context

## 8. Deletion and Recalculation Policy

- deleting a feed item deletes/invalidates its linked piece
- puzzle score recalculates immediately
- puzzle stage updates immediately after recalculation

## 9. Safety and Operations Policy

### 9.1 Privacy

- invite-only circles
- all user-generated content private to circle members
- actor visibility inside circle only

### 9.2 Abuse and Spam

- no hard posting cap
- repeated near-duplicate uploads can be score-down-weighted
- burst posting patterns flagged for review or soft friction

### 9.3 Auditability

- attendance changes: actor + timestamp history
- piece mention/comment changes: actor + timestamp history

## 10. Success Metrics (MVP)

Primary metrics:

- weekly active circles with >= 3 active members
- meetup completion rate
- average linked pieces per completed meetup
- average puzzle evolution stage per meetup

Quality metrics:

- attendance check completion rate
- percentage of meetups with at least 1 linked piece
- D7 / D30 circle retention

Safety metrics:

- spam-flag rate
- moderation response latency

## 11. Non-Goals (MVP)

- public social graph or discovery feed
- leaderboard competition
- fully real-time heavy 3D engine experiences
- complex interval-based auto-closing timeline windows

## 12. Suggested Technical Baseline

- App: React Native + TypeScript
- Lists: virtualized list (FlashList/LegendList class)
- Images: optimized image pipeline (`expo-image` class)
- Animations: Reanimated with GPU-friendly properties
- Backend: Supabase (auth, storage, realtime)

## 13. Open Follow-Up Decisions (Implementation Planning Input)

1. anti-duplicate scoring threshold details
2. exact visual theme library size for launch
3. whether meetup edit rights include non-host admins by default
4. Supabase RLS detail policy for circles, pieces, and comments
