export interface OpenClawSkill {
    id: string;
    name: string;
    version: string;
    description: string;
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    execute: (input: any, context: SkillContext) => Promise<any>;
}
export interface SkillContext {
    agentId: string;
    memory: SkillMemory;
    callSkill: (skillId: string, input: any) => Promise<any>;
    log: (message: string) => void;
}
export interface SkillMemory {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    getHistory: (key: string, limit?: number) => Promise<any[]>;
}
export declare class OpenClawSkillRunner {
    private skills;
    private config;
    private memory;
    constructor(config: {
        registryUrl: string;
        skills: string[];
    });
    loadSkills(): Promise<void>;
    runSkill(skillId: string, input: any): Promise<any>;
    private registerBuiltInSkills;
    private fetchSkillFromRegistry;
    private createMemoryInterface;
    getLoadedSkills(): string[];
}
//# sourceMappingURL=openclaw.d.ts.map