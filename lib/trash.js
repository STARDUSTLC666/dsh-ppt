import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
function formatXdgDeletionDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function moveAcrossDevices(src, dest, isDir) {
    try {
        renameSync(src, dest);
    }
    catch (error) {
        if (error?.code !== 'EXDEV')
            throw error;
        cpSync(src, dest, { recursive: isDir });
        rmSync(src, { recursive: isDir, force: true });
    }
}
function moveToXdgTrash(targetPath, isDir) {
    const dataHome = process.env.XDG_DATA_HOME && isAbsolute(process.env.XDG_DATA_HOME)
        ? process.env.XDG_DATA_HOME
        : join(homedir(), '.local', 'share');
    const trashRoot = join(dataHome, 'Trash');
    const filesDir = join(trashRoot, 'files');
    const infoDir = join(trashRoot, 'info');
    mkdirSync(filesDir, { recursive: true });
    mkdirSync(infoDir, { recursive: true });
    const base = basename(targetPath) || 'item';
    let name = base;
    for (let attempt = 0; attempt < 20; attempt++) {
        const infoPath = join(infoDir, `${name}.trashinfo`);
        const destPath = join(filesDir, name);
        if (!existsSync(infoPath) && !existsSync(destPath)) {
            const encodedPath = targetPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
            const body = `[Trash Info]\nPath=${encodedPath}\nDeletionDate=${formatXdgDeletionDate(new Date())}\n`;
            try {
                writeFileSync(infoPath, body, { flag: 'wx', mode: 0o600 });
            }
            catch (err) {
                if (err?.code === 'EEXIST') {
                    name = `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`;
                    continue;
                }
                throw err;
            }
            try {
                moveAcrossDevices(targetPath, destPath, isDir);
                return;
            }
            catch (err) {
                try {
                    rmSync(infoPath, { force: true });
                }
                catch { /* ignore cleanup error */ }
                throw err;
            }
        }
        name = `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`;
    }
    throw new Error('无法写入系统回收站，请重试');
}
function moveToMacTrashFallback(targetPath, isDir) {
    const trashDir = join(homedir(), '.Trash');
    mkdirSync(trashDir, { recursive: true });
    const base = basename(targetPath) || 'item';
    let dest = join(trashDir, base);
    if (existsSync(dest))
        dest = join(trashDir, `${base}-${Date.now()}-${randomUUID().slice(0, 6)}`);
    moveAcrossDevices(targetPath, dest, isDir);
}
/**
 * Move an existing regular file or directory to the OS Recycle Bin / Trash without external dependencies.
 * Refuses relative paths and symbolic links; treats already-missing paths as a no-op.
 */
export async function movePathToTrash(targetPath, signal) {
    signal?.throwIfAborted();
    if (!targetPath || !isAbsolute(targetPath))
        throw new Error('移入回收站需要绝对路径');
    let stat;
    try {
        stat = lstatSync(targetPath);
    }
    catch (error) {
        const code = error?.code;
        if (code === 'ENOENT' || code === 'ENOTDIR')
            return { moved: false, missing: true };
        throw error;
    }
    if (stat.isSymbolicLink())
        throw new Error('拒绝将符号链接移入回收站');
    const isDir = stat.isDirectory();
    if (!isDir && !stat.isFile())
        throw new Error('仅支持将普通文件或目录移入回收站');
    if (process.platform === 'win32') {
        const psScript = [
            'Add-Type -AssemblyName Microsoft.VisualBasic',
            '$p = $env:DSH_TRASH_TARGET',
            '$ui = [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs',
            '$rc = [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin',
            'if ([System.IO.File]::Exists($p)) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, $ui, $rc) } elseif ([System.IO.Directory]::Exists($p)) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, $ui, $rc) }',
        ].join('; ');
        try {
            await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
                env: { ...process.env, DSH_TRASH_TARGET: targetPath },
                windowsHide: true,
                timeout: 15_000,
                signal,
            });
        }
        catch (error) {
            if (error?.name === 'AbortError')
                throw error;
            throw new Error('文件正被其他程序占用或无法移入系统回收站');
        }
        if (existsSync(targetPath))
            throw new Error('文件正被其他程序占用或无法移入系统回收站');
        return { moved: true };
    }
    if (process.platform === 'darwin') {
        try {
            await execFileAsync('/usr/bin/trash', [targetPath], { timeout: 15_000, signal });
            if (!existsSync(targetPath))
                return { moved: true };
        }
        catch (error) {
            if (error?.name === 'AbortError')
                throw error;
            if (error?.code !== 'ENOENT') {
                moveToMacTrashFallback(targetPath, isDir);
                return { moved: true };
            }
            moveToMacTrashFallback(targetPath, isDir);
            return { moved: true };
        }
        return { moved: true };
    }
    try {
        await execFileAsync('gio', ['trash', '--', targetPath], { timeout: 15_000, signal });
        if (!existsSync(targetPath))
            return { moved: true };
    }
    catch (error) {
        if (error?.name === 'AbortError')
            throw error;
        moveToXdgTrash(targetPath, isDir);
        return { moved: true };
    }
    return { moved: true };
}
