"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPersistedUsers = listPersistedUsers;
exports.upsertPersistedUser = upsertPersistedUser;
exports.removePersistedUser = removePersistedUser;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const lowdb_1 = require("lowdb");
const node_1 = require("lowdb/node");
const DEFAULT_DB = { users: [] };
function resolveDbFilePath() {
    const configured = process.env.CLAW_DB_FILE || process.env.DB_FILE;
    if (configured && configured.trim())
        return configured.trim();
    return path_1.default.resolve(process.cwd(), 'data', 'claw-db.json');
}
function ensureWritableDbPath(preferredPath) {
    const candidates = [
        preferredPath,
        path_1.default.resolve(process.cwd(), 'data', 'claw-db.json'),
        path_1.default.join(os_1.default.tmpdir(), 'claw-db.json'),
    ];
    for (const filePath of candidates) {
        try {
            const dir = path_1.default.dirname(filePath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            if (!fs_1.default.existsSync(filePath)) {
                fs_1.default.writeFileSync(filePath, JSON.stringify(DEFAULT_DB));
            }
            fs_1.default.accessSync(filePath, fs_1.default.constants.R_OK | fs_1.default.constants.W_OK);
            return filePath;
        }
        catch {
        }
    }
    throw new Error(`No writable DB location found. Checked: ${candidates.join(', ')}`);
}
let dbInstance = null;
function getDb() {
    if (dbInstance)
        return dbInstance;
    const filePath = ensureWritableDbPath(resolveDbFilePath());
    const adapter = new node_1.JSONFileSync(filePath);
    const db = new lowdb_1.LowSync(adapter, DEFAULT_DB);
    db.read();
    db.data ||= { ...DEFAULT_DB };
    db.data.users ||= [];
    dbInstance = db;
    return db;
}
function listPersistedUsers() {
    const db = getDb();
    db.read();
    db.data ||= { ...DEFAULT_DB };
    return db.data.users || [];
}
function upsertPersistedUser(user) {
    const db = getDb();
    db.read();
    db.data ||= { ...DEFAULT_DB };
    const index = db.data.users.findIndex((entry) => entry.wallet === user.wallet);
    if (index >= 0) {
        db.data.users[index] = user;
    }
    else {
        db.data.users.push(user);
    }
    db.write();
}
function removePersistedUser(wallet) {
    const db = getDb();
    db.read();
    db.data ||= { ...DEFAULT_DB };
    db.data.users = db.data.users.filter((entry) => entry.wallet !== wallet);
    db.write();
}
//# sourceMappingURL=db.js.map