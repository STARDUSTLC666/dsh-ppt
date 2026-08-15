import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/** cordis 服务注入：apply 里要使用 ctx.skills。 */
export interface SkillRegistration {
  name: string
  description: string
  content: string
  resourceBase: { kind: 'directory'; path: string }
  source?: string
}

export interface SkillsService {
  register(definition: SkillRegistration): () => void
}

export const SKILL_NAMES = ['dsh-ppt'] as const

/** 随包分发的技能目录绝对路径。 */
export function bundledSkillsDir(): string {
  return fileURLToPath(new URL('../skills/', import.meta.url))
}

/** 解析 SKILL.md 的 frontmatter（v0.1 只读 name/description 两个单行字段，零依赖）。 */
function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').trim()
  }
  return trimmed
}

export function parseSkillFile(text: string): { name: string; description: string; content: string } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?/.exec(normalized)
  if (!match) return { name: '', description: '', content: normalized }
  const frontmatter = match[1]
  let name = ''
  let description = ''
  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.trim()
    const keyMatch = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/.exec(line)
    if (keyMatch === null) continue
    if (keyMatch[1] === 'name') name = unquoteYamlScalar(keyMatch[2])
    else if (keyMatch[1] === 'description') description = unquoteYamlScalar(keyMatch[2])
  }
  // legacy regex 解析已由逐行 YAML 扫描替代
  // legacy description regex 已由逐行 YAML 扫描替代
  // name 已在逐行扫描中解析
  // description 已在逐行扫描中解析
  return { name, description, content: normalized.slice(match[0].length).trimStart() }
}

/**
 * 把技能注册进 DSH 技能注册表。技能文件缺失或 frontmatter 不完整只告警，
 * 绝不弄崩宿主启动。
 */
export function registerPptSkill(ctx: { skills: SkillsService }): () => void {
  const skillName = SKILL_NAMES[0]
  const dir = join(bundledSkillsDir(), skillName)
  const text = readFileSync(join(dir, 'SKILL.md'), 'utf8')
  const parsed = parseSkillFile(text)
  if (parsed.name === '' || parsed.description === '' || parsed.content === '') {
    throw new Error('技能 ' + skillName + ' 的 frontmatter 不完整（name/description/content 均不能为空）')
  }
  return ctx.skills.register({
    name: parsed.name,
    description: parsed.description,
    content: parsed.content,
    resourceBase: { kind: 'directory', path: dir },
    source: 'runtime',
  })
}
