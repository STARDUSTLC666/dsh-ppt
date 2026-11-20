/** Replace workspace metadata only after its complete new JSON is written. */
import { lstatSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export function writeWorkspaceJson(file, value) {
  const existing = lstatSync(file, { throwIfNoEntry: false })
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new Error('dsh-ppt：存储文件不是普通文件，已保留原文件')
  const bytes = JSON.stringify(value, null, 2) + '\n'
  const temporary = file + '.tmp-' + randomUUID()
  mkdirSync(dirname(file), { recursive: true })
  try {
    writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 })
    renameSync(temporary, file)
  } finally {
    try { unlinkSync(temporary) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}
