/**
 * dsh-ppt —— 演示文稿技能 + 工具插件。
 *
 * 一句话或一篇 Markdown 文档 → 完整演示文稿三件套：
 *   deck.html  独立网页放映（无外链）
 *   deck.pptx  可编辑 PPTX（16:9，原生文字、图片、表格与图表）
 *   deck.json  支持按页编辑与撤销的工程
 *
 * 插件同时注册：
 *   1. 技能 dsh-ppt（跨 harness 的完整 SOP，SKILL.md 随包分发）
 *   2. 创建、主题、结构参考、编辑、撤销、检查与可选渲染工具
 *
 * 生成引擎按需加载；图片与图表采用 @office-kit/pptx。
 * 官方 LibreOffice Kit 可选安装，用于读取最终 PPTX 生成 PNG / PDF。
 *
 * @module dsh-ppt
 */
import { resolvePptConfig } from './config.js'
import { registerPptSkill, type SkillsService } from './skill.js'
import type { PptConfig } from './types.js'
import { buildPptTools, type ToolDefinition } from './tools.js'
export type { ToolDefinition } from './tools.js'
export type { PptExecution } from './execution.js'

/** cordis 服务注入：apply 里要使用 ctx.tools 与 ctx.skills。 */
export const inject = ['tools', 'skills']
export const name = 'dsh-ppt'
export type Config = PptConfig

export interface PptPluginContext {
  tools: { register(definition: ToolDefinition): () => void }
  skills: SkillsService
  logger?: { warn?(message: string): void }
  on?(event: string, listener: () => void): () => void
}

export function apply(ctx: PptPluginContext, config: Config = {}): void {
  const resolved = resolvePptConfig(config)
  const warn = (message: string): void => { ctx.logger?.warn?.(message) }
  const disposers: Array<() => void> = []

  // 技能注册：单个技能文件缺失只告警，不弄崩宿主启动。
  try {
    disposers.push(registerPptSkill(ctx))
  } catch (error) {
    warn('[dsh-ppt] 技能加载失败：' + (error instanceof Error ? error.message : String(error)))
  }

  for (const definition of buildPptTools(resolved)) {
    disposers.push(ctx.tools.register(definition))
  }

  if (typeof ctx.on === 'function') {
    ctx.on('dispose', () => {
      for (const dispose of disposers) dispose()
    })
  }
}

export { resolvePptConfig, PPT_OUTPUT_DIR_ENV, DEFAULT_MAX_SLIDES, clampInt } from './config.js'
export { bundledSkillsDir, parseSkillFile, registerPptSkill, SKILL_NAMES } from './skill.js'
export type {
  PptConfig,
  PptCreateArgs,
  PptCreateResult,
  PptLanguage,
  PptSlideLayout,
  PptSlideSpec,
  PptThemeId,
  PptThemeInfo,
  PptThemesResult,
  PptTemplateId,
  PptImageSpec,
  PptChartSpec,
  PptBrand,
  PptQualityIssue,
  PptQualityResult,
  PptVerification,
  PptRenderArgs,
  PptRenderResult,
  PptCheckResult,
  PptEditArgs,
  PptProjectArgs,
} from './types.js'
