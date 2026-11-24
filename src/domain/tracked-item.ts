import { FragmentList, FragmentsCompletionSummary } from './fragment-list';
import type {
    TrackedItemTextFragment,
    TTrackedItemTextFragmentState,
} from './tracked-item-fragment';
import type { TUniqueId } from './types/unique-id';

/**
 * Plain, serializable snapshot of a {@link TrackedItem}.
 *
 * Note: `id` is intentionally **not** part of the state. The repository stores
 * `TrackedItem` in a `Map<TUniqueId, TTrackedItemState>`, so the id lives as
 * the map key, not as a field. `TrackedItem` reconstructs its `id` from the
 * map key when mapped back to the domain.
 */
export type TTrackedItemState = {
    artistName: string;
    title: string;
    fragments: TTrackedItemTextFragmentState[];
};

/**
 * Domain entity representing a "tracked item" — a song, a poem, or an
 * instrumental piece that the user is learning.
 *
 * Invariants:
 * - `id` is immutable.
 * - `fragments` is held via an encapsulated {@link FragmentList}; the internal
 *   list is never exposed for structural mutation.
 * - Progress is **computed** from fragment completion, never stored.
 *
 * The entity does not generate ids itself. All new fragment ids must be
 * produced outside the domain (use case / orchestrator) using an
 * `IUniqueIdGenerator` port, and passed in as ready values.
 */
export class TrackedItem {
    /**
     * @param id       Stable unique identifier.
     * @param artistName Author of the tracked item.
     * @param title    Title of the tracked item.
     * @param fragments Internal fragment list (defaults to empty).
     */
    constructor(
        readonly id: TUniqueId,
        private artistName: string,
        private title: string,
        private fragments: FragmentList = new FragmentList()
    ) {}

    // ---------- Метаданные ----------

    getArtistName(): string {
        return this.artistName;
    }

    getTitle(): string {
        return this.title;
    }

    setArtistName(artistName: string): void {
        this.artistName = artistName;
    }

    setTitle(title: string): void {
        this.title = title;
    }

    /**
     * Semantic sugar over {@link setArtistName} + {@link setTitle}.
     *
     * Exists so callers can express "rename the track" atomically. If later a
     * domain rule appears (e.g. non-empty title, length limit), it is enforced
     * here — callers stay unchanged.
     */
    rename(artistName: string, title: string): void {
        this.artistName = artistName;
        this.title = title;
    }

    // ---------- Фрагменты ----------

    /**
     * Returns a readonly view of the fragments.
     *
     * `readonly` prevents structural mutation of the returned array
     * (`push`, `splice`, index assignment) at compile time. It does **not**
     * protect the elements themselves: each `TrackedItemTextFragment` still
     * exposes `setText` / `done` / `unDone`. Mutation is expected to go through
     * the methods below, not through the elements returned here.
     */
    getFragments(): readonly TrackedItemTextFragment[] {
        return this.fragments.getAll();
    }

    /**
     * Adds a new fragment at the given position (or at the end if omitted).
     *
     * `id` must be generated **outside** the domain and passed in as a ready
     * value. The domain does not depend on `crypto` or on the id-generator
     * port here — that responsibility belongs to the application layer.
     */
    addFragment(
        input: {
            id: TUniqueId;
            text: string;
            title?: string;
            isDone?: boolean;
        },
        position?: number
    ): void {
        this.fragments.add(input, position);
    }

    removeFragment(id: TUniqueId): void {
        this.fragments.remove(id);
    }

    setFragmentDone(id: TUniqueId, done: boolean): void {
        this.fragments.setDone(id, done);
    }

    /**
     * Splits a fragment into multiple parts using the given separator.
     *
     * Because the number of parts is not known until the text is actually
     * split, this method needs a way to generate ids **during** the operation.
     * It currently accepts a `generateId: () => string` callback rather than
     * the `IUniqueIdGenerator` port — a deliberate simplification that keeps
     * the signature minimal.
     *
     * (Tech-debt: consider switching to `IUniqueIdGenerator` for consistency
     * with `addFragment`.)
     */
    splitFragment(
        id: TUniqueId,
        generateId: () => string,
        separator: string = '\n'
    ): void {
        this.fragments.splitFragmentBySeparator(id, generateId, separator);
    }

    /**
     * Merges two adjacent fragments into one.
     *
     * `newId` must be generated outside and passed in — the merged fragment
     * is a **new** entity, it does not inherit the id of either source.
     */
    mergeFragments(
        idA: TUniqueId,
        idB: TUniqueId,
        newId: TUniqueId,
        separator: string = '\n'
    ): void {
        this.fragments.merge(idA, idB, newId, separator);
    }

    /**
     * Records a review event for a fragment.
     *
     * `timestamp` is passed in from outside — the domain does not call
     * `Date.now()` directly. Same rationale as with `addFragment`: time is
     * a platform concern, the domain receives it as data.
     */
    markFragmentReviewed(id: TUniqueId, timestamp: number): void {
        this.fragments.markReviewed(id, timestamp);
    }

    renameFragmentTitle(id: TUniqueId, title: string): void {
        this.fragments.renameTitle(id, title);
    }

    /**
     * Partially updates a fragment: only the fields present in `patch` are
     * changed, the rest are left untouched.
     */
    updateFragment(
        id: TUniqueId,
        patch: { text?: string; title?: string }
    ): void {
        this.fragments.updateFragment(id, patch);
    }

    // ---------- Прогресс ----------

    getFragmentsCompletionSummary(): FragmentsCompletionSummary {
        return this.fragments.getCompletionSummary();
    }

    /**
     * Computes progress as a percentage of completed fragments (0..100).
     *
     * Progress is **derived**, never stored: storing it would create a second
     * source of truth alongside `fragments[].isDone`, with a real risk of
     * divergence.
     */
    calculateProgress(): number {
        const { total, completed } = this.fragments.getCompletionSummary();
        return total > 0 ? (completed / total) * 100 : 0;
    }

    // ---------- Сериализация ----------

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     *
     * `id` is intentionally excluded — see {@link TTrackedItemState}.
     */
    getState(): TTrackedItemState {
        return {
            artistName: this.artistName,
            title: this.title,
            fragments: this.fragments.getState(),
        };
    }
}