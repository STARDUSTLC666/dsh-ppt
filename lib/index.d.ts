import { type SkillsService } from './skill.js';
import type { PptConfig } from './types.js';
import { type ToolDefinition } from './tools.js';
export type { ToolDefinition } from './tools.js';
export type { PptExecution } from './execution.js';
/** cordis 服务注入：apply 里要使用 ctx.tools 与 ctx.skills。 */
export declare const inject: string[];
export declare const name = "dsh-ppt";
export type Config = PptConfig;
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
export type { PptConfig, PptCreateArgs, PptCreateResult, PptLanguage, PptSlideLayout, PptSlideSpec, PptThemeId, PptThemeInfo, PptThemesResult, } from './types.js';
