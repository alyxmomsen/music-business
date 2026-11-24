import type { TUniqueId } from './types/unique-id';

/**
 * Plain, serializable snapshot of a {@link HashTag}.
 *
 * This is the persistence / transport shape. Convert to/from the entity via
 * {@link HashTag.getState} and {@link HashTag.fromState}.
 */
export type THashTagState = {
    id: TUniqueId;
    /** Tag text as originally entered (e.g. "Припев"). Immutable after creation. */
    originalText: string;
    /** Lowercased and trimmed form of {@link originalText}, used for lookup and de-duplication. */
    normalizedText: string;
    /** Optional human-readable explanation of what this tag means. */
    description: string;
    /** Id of the user who created the tag. Empty string for legacy tags. */
    createdBy: TUniqueId;
};

/**
 * Domain entity representing a reusable tag.
 *
 * Invariants:
 * - `normalizedText` is non-empty. This is the only guard that ensures
 *   `originalText` is also non-empty on the happy path (since `normalizedText`
 *   is derived from it).
 * - `id`, `originalText`, `normalizedText`, `createdBy` are immutable after
 *   construction.
 * - `description` is the only mutable field, changed via {@link setDescription}.
 *
 * Tags are global: a single `HashTag` can be linked to many targets via
 * `TagLink`. Renaming (`originalText`) is not a domain operation — it must be
 * performed as a use case, because it requires recomputing `normalizedText`,
 * checking uniqueness, and preserving links.
 */
export class HashTag {
    /**
     * @param id             Stable unique identifier.
     * @param originalText   Tag as originally entered.
     * @param normalizedText Lowercased / trimmed form for lookup.
     * @param description    Optional explanation of the tag's meaning.
     * @param createdBy      Id of the user who created the tag.
     *
     * @throws Error if `normalizedText` is empty (implies empty `originalText`).
     */
    constructor(
        readonly id: TUniqueId,
        readonly originalText: string,
        readonly normalizedText: string,
        private description: string,
        readonly createdBy: TUniqueId
    ) {
        if (!normalizedText) {
            throw new Error('HashTag: normalizedText cannot be empty');
        }
    }

    getDescription(): string {
        return this.description;
    }

    /**
     * Replaces the human-readable explanation of this tag.
     *
     * Does not affect identity, text, or links. Only the author (see
     * `createdBy`) is allowed to call this — the check lives in the
     * corresponding use case, not in the entity.
     */
    setDescription(description: string): void {
        this.description = description;
    }

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     *
     * Assumes the instance is valid (created via constructor / `fromState`).
     * No defensive normalisation here — that is the job of `fromState`.
     */
    getState(): THashTagState {
        return {
            id: this.id,
            originalText: this.originalText,
            normalizedText: this.normalizedText,
            description: this.description,
            createdBy: this.createdBy,
        };
    }

    /**
     * Reconstructs a {@link HashTag} from a persisted snapshot.
     *
     * Defensive against legacy JSON that predates `description` / `createdBy`:
     * missing fields are defaulted to empty strings. The constructor still
     * enforces the `normalizedText` invariant, so corrupted data will throw.
     *
     * @throws Error if `normalizedText` is empty.
     */
    static fromState(s: THashTagState): HashTag {
        return new HashTag(
            s.id,
            s.originalText,
            s.normalizedText,
            s.description ?? '',
            s.createdBy ?? ''
        );
    }
}