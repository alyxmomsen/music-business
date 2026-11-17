import { HashTag } from '../../../domain/hash-tag';
import { ITagsRepo } from '../../../domain/ports/tags-repo';
import { ITagLinksRepo } from '../../../domain/ports/tag-links-repo';

export interface ICommentTags {
    commentId: string;
    tags: HashTag[];
}

export class GetTagsForCommentsUseCase {
    constructor(
        private tagLinksRepo: ITagLinksRepo,
        private tagsRepo: ITagsRepo
    ) {}

    async execute(commentIds: string[]): Promise<ICommentTags[]> {
        if (commentIds.length === 0) return [];

        const links = await this.tagLinksRepo.getByCommentIds(commentIds);
        if (links.length === 0) return [];

        const tagIds = Array.from(new Set(links.map((l) => l.tagId)));
        const tags = await this.tagsRepo.getByIds(tagIds);
        const tagMap = new Map(tags.map((t) => [t.id, t]));

        const resultMap = new Map<string, HashTag[]>();
        for (const link of links) {
            if (link.target.type !== 'comment') continue;
            const tag = tagMap.get(link.tagId);
            if (!tag) continue;
            const list = resultMap.get(link.target.commentId) ?? [];
            list.push(tag);
            resultMap.set(link.target.commentId, list);
        }

        return Array.from(resultMap.entries()).map(([commentId, tags]) => ({
            commentId,
            tags,
        }));
    }
}