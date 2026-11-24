import { ReviewedAt } from './reviewed-at';
import type { TUniqueId } from './types/unique-id';

/**
 * Plain, serializable snapshot of a {@link TrackedItemTextFragment}.
 */
export type TTrackedItemTextFragmentState = {
    id: TUniqueId;
    text: string;
    title: string;
    isDone: boolean;
    /** Unix timestamp (ms) of the last review, or `null` if never reviewed. */
    lastReviewedAt: number | null;
};

/**
 * Domain entity representing a single fragment of a tracked item's text
 * (e.g. a verse, a chorus, a stanza).
 *
 * Invariants:
 * - `id` and `lastReviewedAt` are immutable (the latter is a value object,
 *   replaced wholesale on each review).
 * - `text`, `title`, `isDone` are mutable through dedicated methods.
 *
 * Note on mutability: `setText` / `setTitle` are public by design, but direct
 * calls bypass `TrackedItem.updateFragment`. Treat the entity methods as
 * low-level; mutate fragments through `TrackedItem`.
 */
export class TrackedItemTextFragment {
    constructor(
        readonly id: TUniqueId,
        private text: string,
        private title: string = '',
        private isDone: boolean = false,
        private lastReviewedAt: ReviewedAt | null = null
    ) {}

    // ---------- Текст ---------

    getText(): string {
        return this.text;
    }

    /**
     * Low-level text setter. Prefer `TrackedItem.updateFragment` for mutations
     * that go through the aggregate boundary.
     */
    setText(text: string): void {
        this.text = text;
    }

    // ---------- Название ----------

    getTitle(): string {
        return this.title;
    }

    setTitle(title: string): void {
        this.title = title;
    }

    // ---------- Выполнение ----------

    isCompleted(): boolean {
        return this.isDone;
    }

    done(): void {
        this.isDone = true;
    }

    unDone(): void {
        this.isDone = false;
    }

    // ---------- Повторение ---------

    getReviewedAt(): ReviewedAt | null {
        return this.lastReviewedAt;
    }

    /**
     * Records a review event.
     *
     * `timestamp` is passed in from outside the domain. `ReviewedAt` validates
     * it and throws on invalid values (negative, non-finite), so callers do not
     * need to validate it themselves.
     */
    markReviewed(timestamp: number): void {
        this.lastReviewedAt = new ReviewedAt(timestamp);
    }

    /**
     * Semantic predicate: true if this fragment has never been reviewed.
     * Equivalent to `getReviewedAt() === null`, but reads better at call sites.
     */
    isNeverReviewed(): boolean {
        return this.lastReviewedAt === null;
    }

    // ---------- Сериализация ----------

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     *
     * Uses `ReviewedAt.getValue()` rather than `getState()`: `getState()`
     * returns a plain `number`, while the snapshot needs `number | null` to
     * preserve "never reviewed".
     */
    getState(): TTrackedItemTextFragmentState {
        return {
            id: this.id,
            text: this.text,
            title: this.title,
            isDone: this.isDone,
            lastReviewedAt: this.lastReviewedAt?.getValue() ?? null,
        };
    }

    /**
     * Reconstructs a fragment from a persisted snapshot.
     *
     * Uses loose `== null` so that legacy JSON without `lastReviewedAt`
     * (`undefined`) is treated the same as an explicit `null`, instead of
     * crashing inside `ReviewedAt.fromState`.
     */
    static fromState(
        state: TTrackedItemTextFragmentState
    ): TrackedItemTextFragment {
        return new TrackedItemTextFragment(
            state.id,
            state.text,
            state.title,
            state.isDone,
            state.lastReviewedAt == null
                ? null
                : ReviewedAt.fromState(state.lastReviewedAt)
        );
    }
}