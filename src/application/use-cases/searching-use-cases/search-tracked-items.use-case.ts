import { TrackedItem } from '../../../domain/tracked-item';
import { ITrackedItemsListRepo } from '../../../domain/ports/tracked-items-list-repo';
import { ITagsRepo } from '../../../domain/ports/tags-repo';
import { ITagLinksRepo } from '../../../domain/ports/tag-links-repo';
import { ICommentsRepo } from '../../../domain/ports/comments-repo';
import { TTagLinkTarget } from '../../../domain/tag-link';

export interface ISearchTrackedItemsInput {
    q?: string;
    tags?: string[];
    tagIds?: string[];
    artist?: string;
    page: number;
    limit: number;
}

export interface ISearchTrackedItemsResult {
    items: Array<{
        item: TrackedItem;
        matchedTags: string[];
    }>;
    total: number;
    page: number;
    limit: number;
}

export class SearchTrackedItemsUseCase {
    constructor(
        private itemsRepo: ITrackedItemsListRepo,
        private tagsRepo: ITagsRepo,
        private tagLinksRepo: ITagLinksRepo,
        private commentsRepo: ICommentsRepo
    ) {}

    async execute(
        input: ISearchTrackedItemsInput
    ): Promise<ISearchTrackedItemsResult> {
        const page = Math.max(1, input.page);
        const limit = Math.min(100, Math.max(1, input.limit));

        let items = await this.itemsRepo.getAll();

        // --- artist (partial, case-insensitive) ---
        if (input.artist && input.artist.trim()) {
            const needle = input.artist.trim().toLowerCase();
            items = items.filter((item) =>
                item.getArtistName().toLowerCase().includes(needle)
            );
        }

        // --- free text q: artist + title + fragment texts ---
        if (input.q && input.q.trim()) {
            const needle = input.q.trim().toLowerCase();
            items = items.filter((item) => this.matchesQuery(item, needle));
        }

        // --- tags (AND): by normalized text and/or by id ---
        const requiredTagIds = await this.resolveTagIds(
            input.tags ?? [],
            input.tagIds ?? []
        );

        const matchedTagsByItem = new Map<string, string[]>();

        if (requiredTagIds.length > 0) {
            const itemIdSets: Set<string>[] = [];

            for (const tagId of requiredTagIds) {
                const links = await this.tagLinksRepo.getByTagId(tagId);
                const itemIds = new Set<string>();
                for (const link of links) {
                    const trackedItemId = await this.resolveTrackedItemId(
                        link.target
                    );
                    if (trackedItemId) itemIds.add(trackedItemId);
                }
                itemIdSets.push(itemIds);
            }

            // AND: intersection
            let intersection = itemIdSets[0] ?? new Set<string>();
            for (let i = 1; i < itemIdSets.length; i++) {
                intersection = new Set(
                    [...intersection].filter((id) => itemIdSets[i].has(id))
                );
            }

            items = items.filter((item) => intersection.has(item.id));

            // matched tag labels for UI
            const tagLabels = new Map<string, string>();
            for (const tagId of requiredTagIds) {
                const tag = await this.tagsRepo.getById(tagId);
                if (tag) tagLabels.set(tagId, tag.originalText);
            }
            for (const item of items) {
                matchedTagsByItem.set(
                    item.id,
                    requiredTagIds
                        .map((id) => tagLabels.get(id))
                        .filter((t): t is string => !!t)
                );
            }
        }

        const total = items.length;
        const start = (page - 1) * limit;
        const pageItems = items.slice(start, start + limit);

        return {
            items: pageItems.map((item) => ({
                item,
                matchedTags: matchedTagsByItem.get(item.id) ?? [],
            })),
            total,
            page,
            limit,
        };
    }

    private matchesQuery(item: TrackedItem, needle: string): boolean {
        if (item.getArtistName().toLowerCase().includes(needle)) return true;
        if (item.getTitle().toLowerCase().includes(needle)) return true;
        for (const fragment of item.getFragments()) {
            if (fragment.getText().toLowerCase().includes(needle)) return true;
            if (fragment.getTitle().toLowerCase().includes(needle)) return true;
        }
        return false;
    }

    private async resolveTagIds(
        tagTexts: string[],
        tagIds: string[]
    ): Promise<string[]> {
        const result: string[] = [];
        const seen = new Set<string>();

        for (const raw of tagTexts) {
            const normalized = raw.trim().toLowerCase();
            if (!normalized) continue;
            const tag = await this.tagsRepo.getByNormalizedText(normalized);
            if (tag && !seen.has(tag.id)) {
                seen.add(tag.id);
                result.push(tag.id);
            } else if (!tag) {
                // unknown tag → no results possible for AND
                return [];
            }
        }

        for (const id of tagIds) {
            const trimmed = id.trim();
            if (!trimmed || seen.has(trimmed)) continue;
            const tag = await this.tagsRepo.getById(trimmed);
            if (tag) {
                seen.add(trimmed);
                result.push(trimmed);
            } else {
                return [];
            }
        }

        return result;
    }

    private async resolveTrackedItemId(
        target: TTagLinkTarget
    ): Promise<string | null> {
        switch (target.type) {
            case 'tracked-item':
                return target.trackedItemId;
            case 'fragment':
            case 'fragment-range':
                return target.trackedItemId;
            case 'comment': {
                const comment = await this.commentsRepo.getById(
                    target.commentId
                );
                if (!comment) return null;
                const ct = comment.getTarget();
                if (ct.type === 'tracked-item') return ct.trackedItemId;
                if (ct.type === 'fragment' || ct.type === 'fragment-range') {
                    return ct.trackedItemId;
                }
                return null;
            }
            default:
                return null;
        }
    }
}
