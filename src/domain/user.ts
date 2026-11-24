import type { TUniqueId } from './types/unique-id';

/**
 * Role of a user within the application.
 *
 * - `admin` — full access; may promote/demote other users, manage system-wide data.
 * - `user`  — regular user; can create and manage their own tracked items.
 */
export type TUserRole = 'admin' | 'user';

/**
 * Account status.
 *
 * - `active`  — user can authenticate and use the app.
 * - `blocked` — user cannot authenticate. Note: existing JWT tokens are NOT
 *   invalidated by blocking (JWTs are stateless); `authMiddleware` must check
 *   `user.isActive()` on each request to enforce blocking immediately.
 */
export type TUserStatus = 'active' | 'blocked';

/**
 * Plain, serializable snapshot of a {@link User}.
 */
export type TUserState = {
    id: TUniqueId;
    role: TUserRole;
    status: TUserStatus;
    createdAt: number;
};

/**
 * Domain entity representing a user's identity and access rights.
 *
 * Intentionally minimal. This entity holds **only** what RBAC rules operate
 * on: `id`, `role`, `status`, `createdAt`. Email and password hash live in
 * `ICredentialsRepo`; display name lives in `IUserProfilesRepo`. This is the
 * Identity-vs-Profile split: credentials and public profile change
 * independently of identity and access rights.
 *
 * Invariants:
 * - `id` and `createdAt` are immutable.
 * - `role` and `status` are mutable (administrative operations), but the
 *   permission to change them is enforced by the corresponding use case, not
 *   by this entity. `User` does not know about the "current user".
 */
export class User {
    /**
     * @param id        Stable unique identifier.
     * @param role      Access role.
     * @param status    Account status.
     * @param createdAt Unix timestamp (ms) of account creation.
     */
    constructor(
        readonly id: TUniqueId,
        private role: TUserRole,
        private status: TUserStatus,
        readonly createdAt: number
    ) {}

    getRole(): TUserRole { return this.role; }
    getStatus(): TUserStatus { return this.status; }

    /**
     * Convenience predicate for RBAC checks.
     * Equivalent to `getRole() === 'admin'`, but reads better at call sites.
     */
    isAdmin(): boolean { return this.role === 'admin'; }

    /**
     * Convenience predicate for status checks.
     *
     * Should be called on every authenticated request (or in `authMiddleware`)
     * to enforce blocking — otherwise a blocked user keeps working until their
     * JWT expires.
     */
    isActive(): boolean { return this.status === 'active'; }

    /**
     * Changes the user's role.
     *
     * The caller is responsible for authorization (only admins may promote or
     * demote users). This check must live in the corresponding use case, not
     * here: the entity has no notion of "current user".
     */
    setRole(role: TUserRole): void { this.role = role; }

    /**
     * Changes the user's account status.
     *
     * Same authorization note as {@link setRole}: only admins may block or
     * unblock users. Enforcement lives in the use case.
     */
    setStatus(status: TUserStatus): void { this.status = status; }

    /**
     * Serializes this entity into a plain, JSON-safe snapshot.
     */
    getState(): TUserState {
        return {
            id: this.id,
            role: this.role,
            status: this.status,
            createdAt: this.createdAt,
        };
    }

    /**
     * Reconstructs a {@link User} from a persisted snapshot.
     *
     * No defensive defaults are applied: `TUserState` uses string literal
     * unions for `role` and `status`, and TypeScript cannot validate these at
     * runtime. Any invalid value coming from disk or network must be rejected
     * at the persistence boundary (see runtime validation in the JSON repos).
     */
    static fromState(s: TUserState): User {
        return new User(s.id, s.role, s.status, s.createdAt);
    }
}