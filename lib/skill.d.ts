/** cordis 服务注入：apply 里要使用 ctx.skills。 */
export interface SkillRegistration {
    name: string;
    description: string;
    content: string;
    resourceBase: {
        kind: 'directory';
        path: string;
    };
    source?: string;
}
export interface SkillsService {
    register(definition: SkillRegistration): () => void;
}
export declare const SKILL_NAMES: readonly ["dsh-ppt"];
/** 随包分发的技能目录绝对路径。 */
export declare function bundledSkillsDir(): string;
export declare function parseSkillFile(text: string): {
    name: string;
    description: string;
    content: string;
};
/**
 * 把技能注册进 DSH 技能注册表。技能文件缺失或 frontmatter 不完整只告警，
 * 绝不弄崩宿主启动。
 */
export declare function registerPptSkill(ctx: {
    skills: SkillsService;
}): () => void;
