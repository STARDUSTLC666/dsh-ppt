/**
 * dsh-ppt —— 演示文稿技能 + 工具插件。
 *
 * 一句话或一篇 Markdown 文档 → 完整演示文稿三件套：
 *   deck.html  独立网页放映（无外链）
 *   deck.pptx  可编辑 PPTX（16:9，零依赖 OOXML 生成）
 *   deck.json  结构化 manifest
 *
 * 插件同时注册：
 *   1. 技能 dsh-ppt（跨 harness 的完整 SOP，SKILL.md 随包分发）
 *   2. 工具 ppt_create / ppt_themes（确定性生成与主题查询）
 *
 * 生成引擎是 skills/dsh-ppt/scripts/deck-core.mjs，由工具运行时动态加载；
 * 裸 SKILL.md 复制到其他 agent 时可直接运行同目录 build-deck.mjs。
 *
 * @module dsh-ppt
 */
import { resolvePptConfig } from './config.js';
import { registerPptSkill } from './skill.js';
import { buildPptTools } from './tools.js';
/** cordis 服务注入：apply 里要使用 ctx.tools 与 ctx.skills。 */
export const inject = ['tools', 'skills'];
export const name = 'dsh-ppt';
export function apply(ctx, config = {}) {
    const resolved = resolvePptConfig(config);
    const warn = (message) => { ctx.logger?.warn?.(message); };
    const disposers = [];
    // 技能注册：单个技能文件缺失只告警，不弄崩宿主启动。
    try {
        disposers.push(registerPptSkill(ctx));
    }
    catch (error) {
        warn('[dsh-ppt] 技能加载失败：' + (error instanceof Error ? error.message : String(error)));
    }
    for (const definition of buildPptTools(resolved)) {
        disposers.push(ctx.tools.register(definition));
    }
    if (typeof ctx.on === 'function') {
        ctx.on('dispose', () => {
            for (const dispose of disposers)
                dispose();
        });
    }
}
export { resolvePptConfig, PPT_OUTPUT_DIR_ENV, DEFAULT_MAX_SLIDES, clampInt } from './config.js';
export { bundledSkillsDir, parseSkillFile, registerPptSkill, SKILL_NAMES } from './skill.js';
