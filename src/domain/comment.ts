import type { TUniqueId } from './types/unique-id';

/**
 * Describes what a {@link Comment} is attached to.
 *
 * A discriminated union keyed by `type`. Each variant carries only the fields
 * relevant to that attachment kind, so impossible states (e.g. a range on a
 * whole-track comment) cannot be constructed at compile time.
 *
 * - `fragment-range` — a specific character range inside a fragment's text.
 * - `fragment`       — the fragment as a whole (no range).
 * - `tracked-item`   — the whole track.
 */
export type TCommentTarget =
    | {
          type: 'fragment-range';
          trackedItemId: string;
          fragmentId: string;
          /** Character offset of the range start within fragment.text (inclusive). */
          start: number;
          /** Character offset of the range end within fragment.text (exclusive). */
          end: number;
          /** Snapshot of fragment.text.slice(start, end) at annotation time. */
          quote: string;
      }
    | {
          type: 'fragment';
          trackedItemId: string;
          fragmentId: string;
      }
    | {
          type: 'tracked-item';
          trackedItemId: string;
      };

/**
 * Plain, serializable snapshot of a {@link Comment}.
 *
 * This is the persistence / transport shape. It has no behaviour and is
 * converted to/from {@link Comment} via {@link Comment.getState} and
 * {@link Comment.fromState}. Do not confuse it with a backend DTO — the state
 * lives in the domain layer, while DTOs live in infrastructure.
 */
export type TCommentState = {
    id: TUniqueId;
    text: string;
    target: TCommentTarget;
    authorId: TUniqueId;
    createdAt: number;
};

/**
 * Domain entity representing an annotation attached to some part of a
 * tracked item.
 *
 * Invariants:
 * - `id`, `target`, `authorId`, `createdAt` are immutable after construction.
 * - For `fragment-range` targets, `start < end` is guaranteed by the constructor.
 * - The only mutable field is `text`, changed via {@link setText}.
 *
 * A comment cannot be re-anchored to another target; deleting and creating a
 * new comment is the only way to change its target.
 */
export class Comment {
    /**
     * @param id        Stable unique identifier.
     * @param text      Comment body. May be empty (e.g. annotation carrying only tags).
     * @param target    What this comment is attached to.
     * @param authorId  Identifier of the user who created the comment.
     * @param createdAt Unix timestamp (ms) of creation.
     *
     * @throws Error if `target.type === 'fragment-range'` and `target.start >= target.end`.
     */
    constructor(
        readonly id: TUniqueId,
        private text: string,
        readonly target: TCommentTarget,
        readonly authorId: TUniqueId,
        readonly createdAt: number
    ) {
        if (target.type === 'fragment-range' && target.start >= target.end) {
            throw new Error('Comment range: start must be less than end');
        }
    }

    getText(): string {
        return this.text;
    }

    /**
     * Replaces the comment body.
     *
     * Does not touch identity or target. Changing the text never invalidates
     * the comment itself.
     */
    setText(text: string): void {
        this.text = text;
    }

    getTarget(): TCommentTarget {
        return this.target;
    }

    getCreatedAt(): number {
        return this.createdAt;
    }

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     *
     * The returned object loses behaviour by design: it can be written to disk
     * or sent over the wire. Use {@link Comment.fromState} to reconstruct an
     * entity from such a snapshot.
     */
    getState(): TCommentState {
        return {
            id: this.id,
            text: this.text,
            target: this.target,
            authorId: this.authorId,
            createdAt: this.createdAt,
        };
    }

    /**
     * Reconstructs a {@link Comment} from a persisted snapshot.
     *
     * Re-runs the constructor, so all domain invariants (e.g. `start < end`
     * for fragment ranges) are enforced again. Corrupted state will throw.
     *
     * @throws Error if the snapshot violates a domain invariant.
     */
    static fromState(state: TCommentState): Comment {
        return new Comment(
            state.id,
            state.text,
            state.target,
            state.authorId,
            state.createdAt
        );
    }
}