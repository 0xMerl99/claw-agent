import fs from 'fs';
import os from 'os';
import path from 'path';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
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

interface DbSchema {
  users: PersistedUserState[];
}

const DEFAULT_DB: DbSchema = { users: [] };

function resolveDbFilePath(): string {
  const configured = process.env.CLAW_DB_FILE || process.env.DB_FILE;
  if (configured && configured.trim()) return configured.trim();
  return path.resolve(process.cwd(), 'data', 'claw-db.json');
}

function ensureWritableDbPath(preferredPath: string): string {
  const candidates = [
    preferredPath,
    path.resolve(process.cwd(), 'data', 'claw-db.json'),
    path.join(os.tmpdir(), 'claw-db.json'),
  ];

  for (const filePath of candidates) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(DEFAULT_DB));
      }
      fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return filePath;
    } catch {
    }
  }

  throw new Error(`No writable DB location found. Checked: ${candidates.join(', ')}`);
}

let dbInstance: LowSync<DbSchema> | null = null;

function getDb(): LowSync<DbSchema> {
  if (dbInstance) return dbInstance;

  const filePath = ensureWritableDbPath(resolveDbFilePath());

  const adapter = new JSONFileSync<DbSchema>(filePath);
  const db = new LowSync<DbSchema>(adapter, DEFAULT_DB);
  db.read();
  db.data ||= { ...DEFAULT_DB };
  db.data.users ||= [];

  dbInstance = db;
  return db;
}

export function listPersistedUsers(): PersistedUserState[] {
  const db = getDb();
  db.read();
  db.data ||= { ...DEFAULT_DB };
  return db.data.users || [];
}

export function upsertPersistedUser(user: PersistedUserState): void {
  const db = getDb();
  db.read();
  db.data ||= { ...DEFAULT_DB };

  const index = db.data.users.findIndex((entry) => entry.wallet === user.wallet);
  if (index >= 0) {
    db.data.users[index] = user;
  } else {
    db.data.users.push(user);
  }

  db.write();
}

export function removePersistedUser(wallet: string): void {
  const db = getDb();
  db.read();
  db.data ||= { ...DEFAULT_DB };
  db.data.users = db.data.users.filter((entry) => entry.wallet !== wallet);
  db.write();
}
