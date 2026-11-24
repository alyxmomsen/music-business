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
- § 1.5.7. `id` should be in all states for consistency. `[DECIDED 2026-11-23]` Add `id` to `TTrackedItemState`; repository reads id from state, not from map key. **In progress (2026-11-24)** — repository still uses `TWithId<TTrackedItemState>` and derives id from map key.

### § 1.6. TrackedItemTextFragment

- § 1.6.1. Import `.reviewed-at` typo. `[DECIDED 2026-11-24]` Fixed to `./reviewed-at`. **Verified implemented (2026-11-24).**
- § 1.6.2. `fromState` uses `=== null` instead of `== null`. `[DECIDED 2026-11-24]` Fixed to loose `== null` to catch `undefined` from legacy JSON. **Verified implemented (2026-11-24).**
- § 1.6.3. `done()` / `unDone()` vs `setDone(bool)`. `[OPEN 2026-11-23]` Commands read better; enum risk later.
- § 1.6.5. `getValue()` vs `getState()` for ReviewedAt in serialization. `[DECIDED 2026-11-23]` `getValue()` is correct.
- § 1.6.6. `isNeverReviewed()` duplicates `getReviewedAt() === null`. `[DECIDED 2026-11-23]` Keep as semantic predicate.

### § 1.7. FragmentList

- § 1.7.1. API uses `position: number` instead of `afterId: TUniqueId`. `[DECIDED 2026-11-23]` Replace: `add(input, afterId?)`. Domain must not accept raw positions from client. **Not yet implemented.** Blocks concurrent editing — must be done before SQLite migration.
- § 1.7.2. `splitFragmentBySeparator` silently no-ops when nothing to split. `[DECIDED 2026-11-23]` Change return type to `boolean` (true = split happened). **Not yet implemented.**
- § 1.7.3. `mergeFragments` should accept `options: { title?, isDone?, lastReviewedAt? }`. Defaults: `title: ''`, `isDone: a && b`, `lastReviewedAt: null`. **Not yet implemented.**
- § 1.7.4. Merge loses `title` and `lastReviewedAt`. `[DEFERRED 2026-11-23]` Consider adding `mergedFrom: TUniqueId[]` to fragment. Long-term.
- § 1.7.5. `getAll()` returns readonly array, elements mutable. `[OPEN 2026-11-23]` Options: (A) leave as-is with discipline, (B) Symbol-based access, (C) return projections (plain objects). Not blocking MVP.
- § 1.7.6. `position` integer validation missing. `[SUPERSEDED by § 1.7.1 2026-11-23]` No longer relevant once `afterId` replaces `position`.

### § 1.8. ReviewedAt

- § 1.8.1. Value object wraps `number`, throws on invalid input (negative, non-finite). `[DECIDED 2026-11-23]`
- § 1.8.2. `getState()` returns `number`. `[DECIDED 2026-11-23]`

### § 1.9. TUniqueId

- § 1.9.1. `TUniqueId` lives in `domain/types/unique-id.ts` only. `[DECIDED 2026-11-24]` No re-export from `user.ts` or other entities. **Verified implemented (2026-11-24).**
- § 1.9.2. `TTrackedItemUniqueId` alias removed. `[DECIDED 2026-11-24]` One `TUniqueId` everywhere. **Verified implemented (2026-11-24).**
- § 1.9.3. Imports of type-only symbols use `import type { ... }`. `[DECIDED 2026-11-24]` To avoid runtime imports of erased types.

## § 2. Application

### § 2.1. Composition

- § 2.1.1. `new` for dependencies — only in `bootstrap/container.ts`. No `new UseCase(...)` inside orchestrators. `[DECIDED 2026-11-24]`
- § 2.1.2. Orchestrators are thin facades over use-cases. No business logic inside. `[DECIDED 2026-11-24]`
- § 2.1.3. `MainOrchestrator` currently violates § 2.1.1 by creating `SearchTrackedItemsUseCase` in its constructor. `[DECIDED 2026-11-24]` Refactor pending: move creation to `container.ts`.

### § 2.2. Authorization

- § 2.2.1. Only the author can edit their own comment. `[DECIDED 2026-11-24]` **Verified implemented** in `UpdateCommentUseCase`.
- § 2.2.2. Only the author can edit tag description. `[DECIDED 2026-11-24]` **Verified implemented** in `UpdateTagDescriptionUseCase`.
- § 2.2.3. Only the author can delete their own comment. `[DECIDED 2026-11-24]` **Fix pending** — `DeleteCommentUseCase` currently deletes any comment by id.
- § 2.2.4. Only the author (or admin) can delete a tag. `[OPEN 2026-11-24]` — currently `DeleteTagUseCase` has no check. Decide admin override policy alongside role system (§ 6.14).
- § 2.2.5. Full RBAC (roles within projects, per-resource permissions) is deferred until Projects feature. `[DEFERRED 2026-11-24]` See § 6.14.

### § 2.3. Search

- § 2.3.1. Unknown tag in search MUST return empty result, not "everything". `[DECIDED 2026-11-24]` **Fix pending** — `SearchTrackedItemsUseCase.resolveTagIds` currently conflates "no tag filter" and "filter matched nothing".
- § 2.3.2. Tag search semantics: AND across tags. `[DECIDED 2026-11-24]` **Verified implemented.**
- § 2.3.3. Server-side in-memory search (MVP). FTS after SQLite migration. `[DEFERRED 2026-11-24]` See § 6.8.

### § 2.4. Transactions

- § 2.4.1. `RegisterUserUseCase`: 3 sequential writes (user, credentials, profile), non-transactional. `[DEFERRED 2026-11-24]` Failure at step 2/3 leaves orphaned user. Address with IUnitOfWork at SQLite migration.
- § 2.4.2. `AddAnnotationUseCase`: comment + N tags, non-transactional. `[DEFERRED 2026-11-24]` Partial write possible. Mitigation: validate all tags before write.
- § 2.4.3. Cascade deletes: multiple repos, non-transactional. `[DEFERRED 2026-11-24]` Failure mid-cascade leaves inconsistent state. Address with IUnitOfWork at SQLite migration.
- § 2.4.4. IUnitOfWork port will be introduced with SQLite migration. `[DEFERRED 2026-11-24]` Not applicable to JSON repos.

### § 2.5. Cascade deletion

- § 2.5.1. Delete tracked item → delete comments + tag-links. `[DECIDED 2026-11-24]` **Fix pending** — tag-links targeting comments of this tracked item are currently orphaned.
- § 2.5.2. Delete fragment → delete comments + tag-links. `[DECIDED 2026-11-24]` **Fix pending** — tag-links targeting comments of this fragment are currently orphaned.
- § 2.5.3. Delete comment → first tag-links, then comment. `[DECIDED 2026-11-24]` **Verified implemented** in `DeleteCommentUseCase`.
- § 2.5.4. Delete tag → first links, then tag. `[DECIDED 2026-11-24]` **Verified implemented** in `DeleteTagUseCase`.

### § 2.6. Idempotency

- § 2.6.1. `AddTagToTargetUseCase`: if link already exists, return it (no duplicate). `[DECIDED 2026-11-24]` **Verified implemented.**
- § 2.6.2. `RemoveTagFromTargetUseCase`: no-op if link absent. `[DECIDED 2026-11-24]` **Verified implemented.**
- § 2.6.3. Race condition on tag creation: two concurrent `AddTagToTargetUseCase` with same `normalizedText` can create duplicates. `[DEFERRED 2026-11-24]` Fix via unique index on `normalizedText` at SQLite migration, or write mutex in JSON repo.

## § 3. Infrastructure

### § 3.1. JSON repository boundary

- § 3.1.1. Runtime validation of JSON payloads (targets, roles, statuses) missing at repository boundary. `[DEFERRED 2026-11-23]` Add when moving to SQLite/Prisma or before multi-user.
- § 3.1.2. `init()` must tolerate only `ENOENT`. Any other error (corrupt JSON, permission denied) is propagated. `[DECIDED 2026-11-24]` **Fix pending** — currently every error is swallowed, which leads to seed overwriting corrupt-but-recoverable data.
- § 3.1.3. All repos write the whole file on every mutation. `[DEFERRED 2026-11-24]` Race conditions on concurrent writes; mitigated by SQLite migration. Optional short-term fix: `writeFile` to `.tmp` + `rename`.

### § 3.2. JWT

- § 3.2.1. In `NODE_ENV=production`, missing `JWT_SECRET` must throw at bootstrap. No silent fallback. `[DECIDED 2026-11-24]` **Fix pending** — currently `process.env.JWT_SECRET ?? 'dev-secret-change-me'`.

### § 3.3. Scheduler

- § 3.3.1. Empty `Loop` in `main.ts` is replaced by `Scheduler` with named jobs (interval + handler). `[DECIDED 2026-11-24]` **Fix pending.**
- § 3.3.2. All scheduled jobs must be idempotent. `[DECIDED 2026-11-24]`
- § 3.3.3. When running under PM2 cluster or Docker replicas, scheduled jobs need a distributed lock or leader election. `[DEFERRED 2026-11-24]` Single instance for now.
- § 3.3.4. Spaced repetition: "due" is a computed state (`nextReviewAt <= now`), not a stored flag. Scheduler performs side-effects (notifications), does not persist "due" status. `[DECIDED 2026-11-24]`

## § 4. Presentation

### § 4.1. Controllers

- § 4.1.1. Thin controllers: extract fields, validate types, call orchestrator, serialize via `getState()`. No business logic. `[DECIDED 2026-11-24]` **Verified implemented.**
- § 4.1.2. HTTP status mapping lives in controllers. Orchestrators throw `Error`. `[DECIDED 2026-11-24]` **Verified implemented.**

### § 4.2. Routes

- § 4.2.1. All routes under `/api/*`. Protected routes use `authMiddleware`. `[DECIDED 2026-11-24]` **Verified implemented.**
- § 4.2.2. `POST /api/tags/link/remove` is a legacy duplicate of `DELETE /api/tags/link`. `[DEFERRED 2026-11-24]` Remove after frontend confirms it no longer uses it.
- § 4.2.3. Route order matters for PATCH overlaps: specific paths (`/done`, `/review`) before generic (`/:fragmentId`). `[DECIDED 2026-11-24]` **Verified implemented.**

## § 5. Deploy & CI/CD

- § 5.1. Deploy via `scp` (manual). `[DEFERRED 2026-11-23]` Move to GitHub Actions.
- § 5.2. Git not configured on VPS. `[DEFERRED 2026-11-23]` Clone + PM2 ecosystem file.
- § 5.3. No HTTPS. `[DEFERRED 2026-11-23]` Needs domain + Let's Encrypt.
- § 5.4. Bundle size warning (693 KB) on frontend. `[DEFERRED 2026-11-23]` Increase budget or optimize PrimeNG lazy loading.
- § 5.5. `ADMIN_PASSWORD=changeme` in `.env` on VPS. `[DECIDED 2026-11-23]` Strong password set, old `changeme` dead.
- § 5.6. Public GitHub repos: `alyxmomsen/music-business`, `alyxmomsen/musician-app`. Used in portfolio. `[DECIDED 2026-11-24]` `master` branch MUST compile (`npx tsc --noEmit` clean) before push.
- § 5.7. VPS: `185.11.135.200:8080` behind nginx; HTTP only (no HTTPS yet). `[DECIDED 2026-11-24]` Pending: TLS setup in § 5.3.
- § 5.8. PM2 usage status unclear. `[OPEN 2026-11-24]` Verify via `pm2 list` on VPS.
- § 5.9. Docker adoption planned for learning and portfolio. `[DEFERRED 2026-11-24]`
- § 5.10. `.env` on VPS contains real `ADMIN_PASSWORD` and `JWT_SECRET` — visible in chat history of prior session. `[OPEN 2026-11-24]` Rotate both before real users / production. Priority: P0.

## § 6. Features (backlog)

- § 6.1. Optional spaced repetition (Anki-style). `[DEFERRED 2026-11-23]` Per-user toggle. Adds `nextReviewAt`, `interval`, `repetitions`, `easeFactor` to fragment. Use case `ReviewFragmentUseCase` with SM-2. Scheduler + pull endpoint, see § 3.3.4 and § 6.16.
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
- § 6.13. Projects as packages: text + music + backing tracks + other phonograms + video + stage image + equipment + project state. `[DEFERRED 2026-11-24]` Long-term direction, next architectural boundary after multi-user.
- § 6.14. Collaborative editing: multiple users per project, roles within project (owner, editor, contributor, viewer), approval workflow. `[DEFERRED 2026-11-24]` Depends on § 6.13.
- § 6.15. Visibility: tracks visible to owner only / to selected users / to roles / to everyone (with some metadata visible only to selected users). `[OPEN 2026-11-24]` Decide before real users.
- § 6.16. Spaced repetition delivery: pull endpoint `/review/due` for UI + Scheduler-driven push notifications (email, later push). `[DEFERRED 2026-11-24]`
- § 6.17. User deletion: soft delete (`status='deleted'`) + cascade credentials/profiles. `[OPEN 2026-11-24]` See also § 1.4.5.

## § 7. Testing

- § 7.1. Framework: Vitest. `[DECIDED 2026-11-24]` Chosen over Jest for native TS support and faster startup.
- § 7.2. Priority smoke tests (before SQLite migration):
  - § 7.2.1. Search with unknown tag → empty result, not "everything". (covers § 2.3.1)
  - § 7.2.2. DeleteComment with foreign userId → 403. (covers § 2.2.3)
  - § 7.2.3. DeleteTrackedItem → no orphaned tag-links remain. (covers § 2.5.1)
  - § 7.2.4. RegisterUser fails at step 2/3 → no orphaned user. (covers § 2.4.1) `[DEFERRED 2026-11-24]` — depends on § 2.4.4.
- § 7.3. Tests live in `src/**/*.spec.ts` next to the code under test. `[DECIDED 2026-11-24]`
- § 7.4. Integration tests against a temp JSON directory preferred over mocks for repo-level logic. `[DECIDED 2026-11-24]`

## § 8. Naming & Structure

- § 8.1. Files: `kebab-case`. Use-case files end with `.use-case.ts`. `[DECIDED 2026-11-24]` **Fix pending** — `search-by-tag.usecase.ts`, `get-track-items-by-artist-name.usecase.ts` use `.usecase.ts`.
- § 8.2. Use-cases grouped by aggregate: `comments/`, `tags/`, `auth/`, `tracked-items/`, `searching/`, `annotations/`. `[DECIDED 2026-11-24]` **Fix pending** — `toggle-fragment-use-case.ts` and `get-track-items-by-artist-name.usecase.ts` currently live at `use-cases/` root. `searching-use-cases/` renamed to `searching/`.
- § 8.3. Interfaces prefixed `I<Name>`. Types prefixed `T<Name>`. Classes `PascalCase`. Constants `UPPER_SNAKE_CASE`. `[DECIDED 2026-11-24]` **Verified consistent.**
- § 8.4. Empty stubs (`SearchBytagUseCase`, `GetTrackItemsByArtist`) must not remain in `master`. Delete or implement. `[DECIDED 2026-11-24]` **Fix pending.**
- § 8.5. JSDoc in English; inline comments in Russian (local context). `[DECIDED 2026-11-24]` Standard practice for bilingual teams.
- § 8.6. Public API surfaces (services, orchestrators) documented with JSDoc. Internal helpers optional. `[DECIDED 2026-11-24]`