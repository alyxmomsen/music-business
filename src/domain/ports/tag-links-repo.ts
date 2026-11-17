import { TagLink, TTagLinkTarget } from '../tag-link';
import { TUniqueId } from '../types/unique-id';

export interface ITagLinksRepo {
    create(link: TagLink): Promise<void>;
    getByTagId(tagId: TUniqueId): Promise<TagLink[]>;
    getByTarget(target: TTagLinkTarget): Promise<TagLink[]>;
    getByTrackedItem(trackedItemId: string): Promise<TagLink[]>;
    getByCommentIds(commentIds: TUniqueId[]): Promise<TagLink[]>;  // ← новое
    delete(id: TUniqueId): Promise<void>;
    deleteByTagId(tagId: TUniqueId): Promise<void>;
    deleteByTarget(target: TTagLinkTarget): Promise<void>;
    deleteByTrackedItem(trackedItemId: string): Promise<void>;
    deleteByFragment(fragmentId: string): Promise<void>;
}
