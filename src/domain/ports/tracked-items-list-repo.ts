import { TrackedItem, TTrackedItemState } from '../tracked-item';
import type { TUniqueId } from '../types/unique-id';

export interface ITrackedItemsListRepo {
    init(): Promise<void>;
    addMany(items: Omit<TTrackedItemState, 'id'>[]): Promise<void>;
    create(item: Omit<TTrackedItemState, 'id'>): Promise<TrackedItem>;
    updateOne(item: TrackedItem): Promise<void>;
    removeOne(id: TUniqueId): Promise<void>;
    findByArtistName(artistName: string): Promise<TrackedItem[]>;
    getAll(): Promise<TrackedItem[]>;
    getById(id: TUniqueId): Promise<TrackedItem | null>;
    getRandom(): Promise<TrackedItem | null>;
}
