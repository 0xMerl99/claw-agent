import { AgentConfig } from './config';
export interface PersistedAgentAccount {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    config: AgentConfig;
    skillStates: Record<string, boolean>;
    isActive: boolean;
}
export interface PersistedUserState {
    wallet: string;
    isAdmin: boolean;
    plan: 'free' | 'starter' | 'influencer' | 'celebrity';
    paidOnce: boolean;
    firstPaymentTx: string | null;
    subscriptionPaymentTxs: Partial<Record<'starter' | 'influencer' | 'celebrity', string>>;
    accounts: PersistedAgentAccount[];
    activeAccountId: string | null;
}
export declare function listPersistedUsers(): PersistedUserState[];
export declare function upsertPersistedUser(user: PersistedUserState): void;
export declare function removePersistedUser(wallet: string): void;
//# sourceMappingURL=db.d.ts.map