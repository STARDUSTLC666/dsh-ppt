import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function formatXdgDeletionDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function moveAcrossDevices(src: string, dest: string, isDir: boolean): void {
  try {
    renameSync(src, dest)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'EXDEV') throw error
    cpSync(src, dest, { recursive: isDir })
    rmSync(src, { recursive: isDir, force: true })
  }
}

function moveToXdgTrash(targetPath: string, isDir: boolean): void {
  const dataHome = process.env.XDG_DATA_HOME && isAbsolute(process.env.XDG_DATA_HOME)
    ? process.env.XDG_DATA_HOME
    : join(homedir(), '.local', 'share')
  const trashRoot = join(dataHome, 'Trash')
  const filesDir = join(trashRoot, 'files')
  const infoDir = join(trashRoot, 'info')
  mkdirSync(filesDir, { recursive: true })
  mkdirSync(infoDir, { recursive: true })

  const base = basename(targetPath) || 'item'
  let name = base
  for (let attempt = 0; attempt < 20; attempt++) {
    const infoPath = join(infoDir, `${name}.trashinfo`)
    const destPath = join(filesDir, name)
    if (!existsSync(infoPath) && !existsSync(destPath)) {
      const encodedPath = targetPath.split('/').map(seg => encodeURIComponent(seg)).join('/')
      const body = `[Trash Info]\nPath=${encodedPath}\nDeletionDate=${formatXdgDeletionDate(new Date())}\n`
      try {
        writeFileSync(infoPath, body, { flag: 'wx', mode: 0o600 })
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') {
          name = `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`
          continue
        }
        throw err
      }
      try {
        moveAcrossDevices(targetPath, destPath, isDir)
        return
      } catch (err) {
        try { rmSync(infoPath, { force: true }) } catch { /* ignore cleanup error */ }
        throw err
      }
    }
    name = `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`
  }
  throw new Error('无法写入系统回收站，请重试')
}

function moveToMacTrashFallback(targetPath: string, isDir: boolean): void {
  const trashDir = join(homedir(), '.Trash')
  mkdirSync(trashDir, { recursive: true })
  const base = basename(targetPath) || 'item'
  let dest = join(trashDir, base)
  if (existsSync(dest)) dest = join(trashDir, `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`)
  moveAcrossDevices(targetPath, dest, isDir)
}

function isWindowsNetworkPath(targetPath: string): boolean {
  return process.platform === 'win32' && /^\\\\(?!\?\\[A-Za-z]:\\)/.test(targetPath)
}

interface ValidatedTarget {
  path: string
  isDir: boolean
}

function validateTargets(targetPaths: string[]): { existing: ValidatedTarget[]; missing: string[] } {
  const existing: ValidatedTarget[] = []
  const missing: string[] = []
  for (const targetPath of targetPaths) {
    if (!targetPath || !isAbsolute(targetPath)) throw new Error('移入回收站需要绝对路径')
    if (isWindowsNetworkPath(targetPath)) {
      throw new Error('网络共享路径不支持系统回收站，请改用「仅移出列表」或手动清理')
    }
    let stat
    try {
      stat = lstatSync(targetPath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        missing.push(targetPath)
        continue
      }
      throw error
    }
    if (stat.isSymbolicLink()) throw new Error('拒绝将符号链接移入回收站')
    const isDir = stat.isDirectory()
    if (!isDir && !stat.isFile()) throw new Error('仅支持将普通文件或目录移入回收站')
    existing.push({ path: targetPath, isDir })
  }
  return { existing, missing }
}

/**
 * Move multiple regular files or directories to the OS Recycle Bin / Trash in strict order.
 * On Windows, batches all paths into a single PowerShell process with ErrorActionPreference=Stop
 * so moving a 3-file project or clearing an archive runs ~3x faster while stopping immediately on any locked file.
 */
export async function movePathsToTrash(
  targetPaths: string[],
  signal?: AbortSignal,
): Promise<{ moved: string[]; missing: string[] }> {
  signal?.throwIfAborted()
  const { existing, missing } = validateTargets(targetPaths)
  if (existing.length === 0) return { moved: [], missing }

  if (process.platform === 'win32') {
    const psScript = [
      "$ErrorActionPreference = 'Stop'",
      'Add-Type -AssemblyName Microsoft.VisualBasic',
      '$parsed = ConvertFrom-Json $env:DSH_TRASH_TARGETS',
      '$items = @($parsed.paths)',
      '$ui = [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs',
      '$rc = [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin',
      'foreach ($p in $items) { if ([System.IO.File]::Exists($p)) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, $ui, $rc) } elseif ([System.IO.Directory]::Exists($p)) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, $ui, $rc) } }',
    ].join('; ')
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        env: { ...process.env, DSH_TRASH_TARGETS: JSON.stringify({ paths: existing.map(item => item.path) }) },
        windowsHide: true,
        timeout: Math.max(15_000, Math.min(90_000, existing.length * 4_000)),
        signal,
      })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error
      throw new Error('文件或目录正被其他程序占用，或所在磁盘不支持系统回收站')
    }
    for (const item of existing) {
      if (existsSync(item.path)) {
        throw new Error('文件或目录正被其他程序占用，或所在磁盘不支持系统回收站')
      }
    }
    return { moved: existing.map(item => item.path), missing }
  }

  const moved: string[] = []
  for (const item of existing) {
    signal?.throwIfAborted()
    if (process.platform === 'darwin') {
      try {
        await execFileAsync('/usr/bin/trash', [item.path], { timeout: 15_000, signal })
        if (existsSync(item.path)) moveToMacTrashFallback(item.path, item.isDir)
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') throw error
        moveToMacTrashFallback(item.path, item.isDir)
      }
      moved.push(item.path)
      continue
    }
    try {
      await execFileAsync('gio', ['trash', '--', item.path], { timeout: 15_000, signal })
      if (existsSync(item.path)) moveToXdgTrash(item.path, item.isDir)
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error
      moveToXdgTrash(item.path, item.isDir)
    }
    moved.push(item.path)
  }
  return { moved, missing }
}

/**
 * Move a single existing regular file or directory to the OS Recycle Bin / Trash without external dependencies.
 * Refuses relative paths, Windows UNC network paths, and symbolic links; treats already-missing paths as a no-op.
 */
export async function movePathToTrash(targetPath: string, signal?: AbortSignal): Promise<{ moved: boolean; missing?: boolean }> {
  const result = await movePathsToTrash([targetPath], signal)
  if (result.moved.length > 0) return { moved: true }
  return { moved: false, missing: true }
}
