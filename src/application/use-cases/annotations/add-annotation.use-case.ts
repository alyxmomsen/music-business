import { Comment, TCommentTarget } from '../../../domain/comment';
import { HashTag } from '../../../domain/hash-tag';
import { TTagLinkTarget } from '../../../domain/tag-link';
import { AddCommentUseCase } from '../comments/add-comment.use-case';
import { AddTagToTargetUseCase } from '../tags/add-tag-to-target.use-case';

export interface IAddAnnotationInput {
    comment: string | null;
    tags: string[];
    target: TCommentTarget;
    authorId: string;
}

export interface IAddAnnotationResult {
    comment: Comment | null;
    tags: HashTag[];
}

export class AddAnnotationUseCase {
    constructor(
        private addComment: AddCommentUseCase,
        private addTag: AddTagToTargetUseCase
    ) {}

    async execute(input: IAddAnnotationInput): Promise<IAddAnnotationResult> {
        const hasComment =
            typeof input.comment === 'string' && input.comment.trim() !== '';

        const tags = input.tags
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        const hasTags = tags.length > 0;

        if (!hasComment && !hasTags) {
            throw new Error('At least one of comment or tags is required');
        }

        let comment: Comment | null = null;
        if (hasComment) {
            comment = await this.addComment.execute(
                input.comment!.trim(),
                input.target,
                input.authorId
            );
        }

        // Tags always attach to the annotation target (range / fragment / item),
        // never to the comment. Tagging comments is a separate, explicit action.
        const tagTarget = this.toTagLinkTarget(input.target);

        const createdTags: HashTag[] = [];
        for (const tagText of tags) {
            const { tag } = await this.addTag.execute(
                tagText,
                tagTarget,
                input.authorId
            );
            createdTags.push(tag);
        }

        return { comment, tags: createdTags };
    }

    private toTagLinkTarget(target: TCommentTarget): TTagLinkTarget {
        switch (target.type) {
            case 'tracked-item':
                return {
                    type: 'tracked-item',
                    trackedItemId: target.trackedItemId,
                };
            case 'fragment':
                return {
                    type: 'fragment',
                    trackedItemId: target.trackedItemId,
                    fragmentId: target.fragmentId,
                };
            case 'fragment-range':
                return {
                    type: 'fragment-range',
                    trackedItemId: target.trackedItemId,
                    fragmentId: target.fragmentId,
                    start: target.start,
                    end: target.end,
                    quote: target.quote,
                };
            default: {
                const _exhaustive: never = target;
                throw new Error(
                    `Unsupported annotation target: ${JSON.stringify(_exhaustive)}`
                );
            }
        }
    }
}