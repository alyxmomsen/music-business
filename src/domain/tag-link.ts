import type { TUniqueId } from './types/unique-id';

/**
 * Describes what a {@link TagLink} is attached to.
 *
 * A discriminated union keyed by `type`. Compared to `TCommentTarget`, this
 * adds one extra variant (`comment`) — a tag can be attached to a comment,
 * while a comment cannot be attached to another comment.
 *
 * - `tracked-item`   — the whole track.
 * - `fragment`       — the fragment as a whole (no range).
 * - `comment`        — a specific comment.
 * - `fragment-range` — a character range inside a fragment's text.
 */
export type TTagLinkTarget =
    | {
          type: 'tracked-item';
          trackedItemId: string;
      }
    | {
          type: 'fragment';
          trackedItemId: string;
          fragmentId: string;
      }
    | {
          type: 'comment';
          commentId: string;
      }
    | {
          type: 'fragment-range';
          trackedItemId: string;
          fragmentId: string;
          /** Character offset of the range start within fragment.text (inclusive). */
          start: number;
          /** Character offset of the range end within fragment.text (exclusive). */
          end: number;
          /** Snapshot of fragment.text.slice(start, end) at link time. */
          quote: string;
      };

/**
 * Plain, serializable snapshot of a {@link TagLink}.
 *
 * Convert to/from the entity via {@link TagLink.getState} and
 * {@link TagLink.fromState}.
 */
export type TTagLinkState = {
    id: TUniqueId;
    tagId: TUniqueId;
    target: TTagLinkTarget;
    createdAt: number;
};

/**
 * Domain entity representing a link between a {@link HashTag} and some target
 * (track, fragment, comment, or a range inside a fragment).
 *
 * This entity is **fully immutable**: every field is `readonly` and there are
 * no setters. Re-anchoring a tag to a different target is not modelled here —
 * it is done by deleting the old link and creating a new one. This keeps
 * existing references honest: a `TagLink` you hold always describes the same
 * attachment.
 *
 * The link stores `tagId` rather than a `HashTag` instance on purpose. Holding
 * a copy would duplicate state and force every link to be updated whenever the
 * tag changes. With `tagId`, the tag's current state is resolved on demand
 * through `ITagsRepo`.
 */
export class TagLink {
    /**
     * @param id        Stable unique identifier of this link.
     * @param tagId     Id of the linked `HashTag`.
     * @param target    What the tag is attached to.
     * @param createdAt Unix timestamp (ms) of creation.
     */
    constructor(
        readonly id: TUniqueId,
        readonly tagId: TUniqueId,
        readonly target: TTagLinkTarget,
        readonly createdAt: number
    ) {}

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     */
    getState(): TTagLinkState {
        return {
            id: this.id,
            tagId: this.tagId,
            target: this.target,
            createdAt: this.createdAt,
        };
    }

    /**
     * Reconstructs a {@link TagLink} from a persisted snapshot.
     *
     * Unlike `Comment.fromState` / `HashTag.fromState`, there are no defensive
     * defaults here: every field is required and the format is stable. Any
     * missing or malformed field must be rejected earlier, at the persistence
     * boundary (e.g. in the JSON repository during `init`), not silently
     * patched here.
     */
    static fromState(state: TTagLinkState): TagLink {
        return new TagLink(
            state.id,
            state.tagId,
            state.target,
            state.createdAt
        );
    }
}