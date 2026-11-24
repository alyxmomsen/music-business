import { User } from '../user';
import type { TUniqueId } from '../types/unique-id';

export interface IUsersRepo {
    create(user: User): Promise<void>;
    getById(id: TUniqueId): Promise<User | null>;
    getAll(): Promise<User[]>;
    update(user: User): Promise<void>;
    delete(id: TUniqueId): Promise<void>;
    count(): Promise<number>;
}