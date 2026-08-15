import { type SkillsService } from './skill.js';
import type { PptConfig } from './types.js';
/** cordis 服务注入：apply 里要使用 ctx.tools 与 ctx.skills。 */
export declare const inject: string[];
export declare const name = "dsh-ppt";
export type Config = PptConfig;
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    output: {
        schema: Record<string, unknown>;
        render: (args: unknown, value: unknown) => Array<{
            type: 'text';
            text: string;
        }>;
    };
    execute: (rawArgs: unknown) => Promise<unknown>;
}
export interface PptPluginContext {
    tools: {
        register(definition: ToolDefinition): () => void;
    };
    skills: SkillsService;
    logger?: {
        warn?(message: string): void;
    };
    on?(event: string, listener: () => void): () => void;
}
export declare function apply(ctx: PptPluginContext, config?: Config): void;
export { resolvePptConfig, PPT_OUTPUT_DIR_ENV, DEFAULT_MAX_SLIDES, clampInt } from './config.js';
export { bundledSkillsDir, parseSkillFile, registerPptSkill, SKILL_NAMES } from './skill.js';
export type { PptConfig, PptCreateArgs, PptCreateResult, PptSlideSpec, PptThemeInfo, PptThemesResult } from './types.js';
