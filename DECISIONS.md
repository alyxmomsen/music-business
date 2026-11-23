# Development Decision Log

> Формат: RFC-подобный (вдохновлён IETF RFC + ADR Майкла Нигарда).
> Пункты не удаляются. Если решение меняется — старый пункт помечается
> `[SUPERSEDED by §X.Y.Z]`, новое решение добавляется ниже.
> Дата: ISO 8601. Ссылка на коммит — в скобках, если применимо.

## Conventions

- `[DECIDED YYYY-MM-DD]` — принято, действует.
- `[DEFERRED YYYY-MM-DD]` — техдолг, отложено.
- `[OPEN YYYY-MM-DD]` — требует решения.
- `[SUPERSEDED by §X.Y.Z YYYY-MM-DD]` — заменено новым решением.
- `[DEPRECATED YYYY-MM-DD]` — устарело, оставлено для истории.

## § 1. Domain

### § 1.1. Comment

- § 1.1.1. `start < end` invariant enforced in constructor. `[DECIDED 2026-11-23]`
- § 1.1.2. `getTarget()` / `getCreatedAt()` duplicate public readonly fields. `[DEFERRED 2026-11-23]` Remove on refactor.
- § 1.1.3. `text` may be empty (annotation carrying only tags). `[DECIDED 2026-11-23]` No validation in domain.
- § 1.1.4. `id`, `target`, `authorId`, `createdAt` readonly; `text` mutable via `setText`. `[DECIDED 2026-11-23]`

### § 1.2. HashTag

- § 1.2.1. `normalizedText` non-empty enforced in constructor. `[DECIDED 2026-11-23]`
- § 1.2.2. `fromState` defaults `description` and `createdBy` to `''` for legacy JSON. `[DECIDED 2026-11-23]`
- § 1.2.3. Legacy tags (`createdBy === ''`) cannot be edited by anyone. `[DEFERRED 2026-11-23]` Migrate to first admin.
- § 1.2.4. `getDescription()` is the only getter for a private field. `[DECIDED 2026-11-23]` Asymmetric with Comment/TrackedItem but justified.

### § 1.3. TagLink

- § 1.3.1. `start < end` is NOT enforced in constructor. `[DEFERRED 2026-11-23]` Bug — add check.
- § 1.3.2. `TagLink` fully immutable (no setters). `[DECIDED 2026-11-23]` Re-anchoring = delete + create.
- § 1.3.3. `tagId` instead of `HashTag` reference. `[DECIDED 2026-11-23]` Avoids duplicated state.
- § 1.3.4. `fromState` has no defensive defaults. `[DECIDED 2026-11-23]` Format stable; legacy handled at repo level.

### § 1.4. User

- § 1.4.1. Minimal: `id`, `role`, `status`, `createdAt`. Identity vs Profile split. `[DECIDED 2026-11-23]`
- § 1.4.2. `setRole` / `setStatus` have no permission check. `[DEFERRED 2026-11-23]` Add `PromoteUserUseCase` with admin check.
- § 1.4.3. `authMiddleware` does not check `isActive()`. `[DEFERRED 2026-11-23]` Blocked user keeps working until JWT expires.
- § 1.4.4. Runtime validation for `role`/`status` missing. `[DEFERRED 2026-11-23]` Add at repository boundary.
- § 1.4.5. User deletion strategy not implemented. `[OPEN 2026-11-23]` Soft delete recommended.
- § 1.4.6. Sorting by `createdAt` needs tie-breaker for DB. `[DEFERRED 2026-11-23]` `ORDER BY created_at, id`.

### § 1.5. TrackedItem

- § 1.5.1. `id` not in `TTrackedItemState`. `[SUPERSEDED by § 1.5.7 2026-11-23]`
- § 1.5.2. `rename` is semantic sugar over setters. `[DECIDED 2026-11-23]` Keep — future domain rules may land here.
- § 1.5.3. `splitFragment` uses `() => string` instead of `IUniqueIdGenerator`. `[DEFERRED 2026-11-23]` Unify with `addFragment`.
- § 1.5.4. `getFragments()` returns readonly array, elements mutable. `[DEFERRED 2026-11-23]` See § 1.7.5.
- § 1.5.5. No validation of `artistName` / `title`. `[DECIDED 2026-11-23]` No domain rule; validate in use case if needed.
- § 1.5.6. `markFragmentReviewed` was placed at end of file. `[DECIDED 2026-11-23]` Move back for consistency.
- § 1.5.7. `id` should be in all states for consistency. `[DECIDED 2026-11-23]` Add `id` to `TTrackedItemState`; repository reads id from state, not from map key. **Not yet implemented.**

### § 1.6. TrackedItemTextFragment

- § 1.6.1. Import `.reviewed-at` typo. `[DECIDED 2026-11-23]` Fix to `./reviewed-at`. **Not yet implemented.**
- § 1.6.2. `fromState` uses `=== null` instead of `== null`. `[DECIDED 2026-11-23]` Fix to catch `undefined` from legacy JSON. **Not yet implemented.**
- § 1.6.3. `done()` / `unDone()` vs `setDone(bool)`. `[OPEN 2026-11-23]` Commands read better; enum risk later.
- § 1.6.5. `getValue()` vs `getState()` for ReviewedAt in serialization. `[DECIDED 2026-11-23]` `getValue()` is correct.
- § 1.6.6. `isNeverReviewed()` duplicates `getReviewedAt() === null`. `[DECIDED 2026-11-23]` Keep as semantic predicate.

### § 1.7. FragmentList

- § 1.7.1. API uses `position: number` instead of `afterId: TUniqueId`. `[DECIDED 2026-11-23]` Replace: `add(input, afterId?)`. Domain must not accept raw positions from client. **Not yet implemented.**
- § 1.7.2. `splitFragmentBySeparator` silently no-ops when nothing to split. `[DECIDED 2026-11-23]` Change return type to `boolean` (true = split happened). **Not yet implemented.**
- § 1.7.3. `mergeFragments` should accept `options: { title?, isDone?, lastReviewedAt? }`. Defaults: `title: ''`, `isDone: a && b`, `lastReviewedAt: null`. **Not yet implemented.**
- § 1.7.4. Merge loses `title` and `lastReviewedAt`. `[DEFERRED 2026-11-23]` Consider adding `mergedFrom: TUniqueId[]` to fragment. Long-term.
- § 1.7.5. `getAll()` returns readonly array, elements mutable. `[OPEN 2026-11-23]` Options: (A) leave as-is with discipline, (B) Symbol-based access, (C) return projections (plain objects). Not blocking MVP.
- § 1.7.6. `position` integer validation missing. `[SUPERSEDED by § 1.7.1 2026-11-23]` No longer relevant once `afterId` replaces `position`.

### § 1.8. ReviewedAt

- § 1.8.1. Value object wraps `number`, throws on invalid input (negative, non-finite). `[DECIDED 2026-11-23]`
- § 1.8.2. `getState()` returns `number`. `[DECIDED 2026-11-23]`

## § 2. Application

`[TBD — разбираем после domain]`

## § 3. Infrastructure

- § 3.1. Runtime validation of JSON payloads (targets, roles, statuses) missing at repository boundary. `[DEFERRED 2026-11-23]` Add when moving to SQLite/Prisma or before multi-user.

## § 4. Presentation

`[TBD]`

## § 5. Deploy & CI/CD

- § 5.1. Deploy via `scp` (manual). `[DEFERRED 2026-11-23]` Move to GitHub Actions.
- § 5.2. Git not configured on VPS. `[DEFERRED 2026-11-23]` Clone + PM2 ecosystem file.
- § 5.3. No HTTPS. `[DEFERRED 2026-11-23]` Needs domain + Let's Encrypt.
- § 5.4. Bundle size warning (693 KB). `[DEFERRED 2026-11-23]` Increase budget or optimize PrimeNG lazy loading.
- § 5.5. `ADMIN_PASSWORD=changeme` in `.env` on VPS. `[DECIDED 2026-11-23]` Strong password set, old `changeme` dead.

## § 6. Features (backlog)

- § 6.1. Optional spaced repetition (Anki-style). `[DEFERRED 2026-11-23]` Per-user toggle. Adds `nextReviewAt`, `interval`, `repetitions`, `easeFactor` to fragment. Use case `ReviewFragmentUseCase` with SM-2.
- § 6.2. Tag rename with link preservation. `[DEFERRED 2026-11-23]`
- § 6.3. Tag page `/tags/:tagId`. `[DEFERRED 2026-11-23]`
- § 6.4. All-tags page with counters. `[DEFERRED 2026-11-23]`
- § 6.5. Autocomplete polish («+ Create "xxx"», new tag in suggestions immediately). `[DEFERRED 2026-11-23]`
- § 6.6. Registration UI (invite-code or open). `[OPEN 2026-11-23]` Strategy TBD.
- § 6.7. Mobile drawer for TOC and context panel. `[DEFERRED 2026-11-23]` After desktop features.
- § 6.8. Search: server-side with FTS after DB migration. `[DEFERRED 2026-11-23]`
- § 6.9. `quote` validation on backend (compare with `fragment.text.slice(start, end)`). `[DEFERRED 2026-11-23]`
- § 6.10. Empty-state hint (toast + «don't show again»). `[DEFERRED 2026-11-23]`
- § 6.11. «Due for review» indicator (🔥) based on `lastReviewedAt`. `[DEFERRED 2026-11-23]`
- § 6.12. Sorting list by progress / date. `[DEFERRED 2026-11-23]`